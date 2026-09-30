import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { CurrentUser } from '../users/users.types';
import { UserRole } from '../users/entities/user-role.enum';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import {
  MembershipAllocation as Allocation,
  MembershipCheckout as Checkout,
  MembershipNationalBatch as Batch,
  MembershipNationalItem as Item,
  MembershipObligation as Obligation,
  MembershipPeriod as Period,
  MembershipRosterSync as RosterSync,
  MembershipProviderEvent as Event,
  MembershipReceipt as Receipt,
  MembershipPayout as Payout,
  MembershipPaymentSettings as PaymentSettings,
  MembershipPaymentProviderConfig as ProviderConfig,
} from './entities/membership.entity';
import {
  BASELINE_PLANS,
  bani,
  date,
  identifier,
  membershipPeriodFor,
  plan,
  record,
  text,
  uuid,
  type Prices,
} from './membership.rules';
import { NetopiaService } from './netopia.service';
import { StripeService } from './stripe.service';
import type {
  NetopiaConfiguration,
  PaymentProviderConfiguration,
  PaymentProviderName,
  StripeConfiguration,
  VerifiedPaymentEvent,
} from './payment-provider';
import { PaymentConfigurationService } from './payment-configuration.service';
import {
  OrgoRosterService,
  type OrgoRosterMember,
} from './orgo-roster.service';

const MEMBERSHIP_TERMS_VERSION = '2026-09-28';

const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class MembershipService {
  constructor(
    private readonly em: EntityManager,
    private readonly netopia: NetopiaService,
    private readonly stripe: StripeService,
    private readonly paymentConfigurations: PaymentConfigurationService,
    private readonly orgoRoster: OrgoRosterService,
  ) {}

  private async paymentSettings(em = this.em) {
    return (
      (await em.findOne(PaymentSettings, { id: 'membership' })) ??
      em.create(PaymentSettings, {
        id: 'membership',
        activeProvider: 'netopia',
        activeEnvironment: 'sandbox',
      })
    );
  }

  private async providerSummary(
    activeProvider: PaymentProviderName,
    activeEnvironment: string,
    em = this.em,
  ) {
    const vaultReady = this.paymentConfigurations.vaultReady();
    return {
      activeProvider,
      activeEnvironment,
      vaultReady,
      providers: (await this.paymentConfigurations.summaries(em)).map(
        (provider) => ({ ...provider, ready: vaultReady && provider.ready }),
      ),
    };
  }

  private staff(user: CurrentUser) {
    if (
      !user.roles.some((role) =>
        [UserRole.Admin, UserRole.FinanceManager, UserRole.SuperAdmin].includes(
          role,
        ),
      )
    )
      throw new ForbiddenException();
  }

  // Small-center financial mutations share a database lock across API replicas.
  // Never hold it while making an external network call.
  private mutate<T>(work: (em: EntityManager) => Promise<T>) {
    return this.em.transactional(async (em) => {
      await em.execute('select pg_advisory_xact_lock(9212026)');
      return work(em);
    });
  }

  private audit(
    em: EntityManager,
    actorId: number | undefined,
    action: string,
    id: string,
    metadata: Record<string, unknown> = {},
  ) {
    em.persist(
      em.create(AuditEntry, {
        actorId,
        action: `membership.${action}`,
        entityType: 'membership',
        entityId: id,
        metadata,
      }),
    );
  }

  private async ensureCurrentPeriod(now = new Date()) {
    const expected = membershipPeriodFor(now);
    const existing = await this.em.findOne(Period, {
      startsOn: expected.startsOn,
      endsOn: expected.endsOn,
    });
    if (existing?.active) return existing;

    return this.mutate(async (em) => {
      let period = await em.findOne(Period, {
        startsOn: expected.startsOn,
        endsOn: expected.endsOn,
      });
      if (!period) {
        const periods = await em.find(Period, {});
        const source = periods.sort((a, b) =>
          b.startsOn.localeCompare(a.startsOn),
        )[0];
        period = em.create(Period, {
          ...expected,
          prices: structuredClone(source?.prices ?? BASELINE_PLANS),
          active: false,
        });
        em.persist(period);
        this.audit(em, undefined, 'period.created_automatically', period.id, {
          startsOn: expected.startsOn,
          endsOn: expected.endsOn,
          pricesCopiedFromPeriodId: source?.id ?? null,
        });
      }
      for (const active of await em.find(Period, { active: true }))
        if (active.id !== period.id) active.active = false;
      period.active = true;
      this.audit(em, undefined, 'period.activated_automatically', period.id);
      await em.flush();
      return period;
    });
  }

  async catalog(now = new Date()) {
    const period = await this.ensureCurrentPeriod(now);
    const settings = await this.paymentSettings();
    const activeProvider = settings.activeProvider as PaymentProviderName;
    const activeEnvironment = settings.activeEnvironment;
    const summary = await this.providerSummary(
      activeProvider,
      activeEnvironment,
    );
    const active = summary.providers.find(
      (item) =>
        item.id === activeProvider && item.environment === activeEnvironment,
    );
    return {
      period,
      cardEnabled: Boolean(active?.ready),
      environment: activeEnvironment,
      activeProvider,
    };
  }

  private async balance(em: EntityManager, obligationId: string) {
    const allocations = await em.find(Allocation, {
      obligationId,
      reversed: false,
    });
    return allocations.reduce((sum, item) => sum + item.amountBani, 0);
  }

  private async rosterPreviewFor(period: Period, members: OrgoRosterMember[]) {
    const obligations = await this.em.find(Obligation, {
      periodId: period.id,
    });
    const existing = new Map(
      obligations.map((item) => [item.orgoUserId, item]),
    );
    const eligible = members.filter((member) => member.eligible && member.plan);
    return {
      period: {
        id: period.id,
        name: period.name,
        startsOn: period.startsOn,
        endsOn: period.endsOn,
      },
      members: eligible.map((member) => ({
        orgoUserId: member.orgoUserId,
        cardId: member.cardId,
        memberName: member.memberName,
        plan: member.plan,
        totalBani: period.prices[member.plan!].totalBani,
        action: existing.has(member.orgoUserId) ? 'verify' : 'add',
      })),
      issues: members
        .filter((member) => !member.eligible)
        .map((member) => ({
          orgoUserId: member.orgoUserId,
          memberName: member.memberName,
          reason: member.issue,
        })),
      existingCount: obligations.length,
      newCount: eligible.filter((member) => !existing.has(member.orgoUserId))
        .length,
    };
  }

  async rosterPreview(user: CurrentUser) {
    this.staff(user);
    const period = await this.ensureCurrentPeriod();
    const members = await this.orgoRoster.members(user.id);
    return this.rosterPreviewFor(period, members);
  }

  private async beginRosterSync(
    user: CurrentUser,
    period: Period,
    mode: 'initialization' | 'manual' | 'automatic',
  ) {
    return this.mutate(async (em) => {
      if (mode === 'automatic') {
        const latest = await em.findOne(
          RosterSync,
          { periodId: period.id },
          { orderBy: { createdAt: 'desc' } },
        );
        if (latest && Date.now() - latest.createdAt.getTime() < 15 * 60 * 1000)
          return null;
      }
      const run = em.create(RosterSync, {
        periodId: period.id,
        actorId: user.id,
        mode,
        status: 'running',
        summary: {},
      });
      em.persist(run);
      await em.flush();
      return run;
    });
  }

  private async finishRosterSync(
    user: CurrentUser,
    period: Period,
    run: RosterSync,
    members: OrgoRosterMember[],
  ) {
    return this.mutate(async (em) => {
      const obligations = await em.find(Obligation, { periodId: period.id });
      if (obligations.length > 0 && members.length === 0)
        throw new ServiceUnavailableException(
          'ORGO a returnat un registru gol pentru o perioadă care are deja membri.',
        );
      const byId = new Map(obligations.map((item) => [item.orgoUserId, item]));
      const openCheckouts = await em.find(Checkout, {
        periodId: period.id,
        state: { $in: ['starting', 'pending', 'unknown'] },
      });
      const checkoutByObligation = new Map(
        openCheckouts
          .filter((item) => item.obligationId)
          .map((item) => [item.obligationId!, item]),
      );
      const seen = new Set<number>();
      const summary = { added: 0, updated: 0, review: 0, unchanged: 0 };
      const now = new Date();
      for (const member of members) {
        seen.add(member.orgoUserId);
        const obligation = byId.get(member.orgoUserId);
        if (!member.eligible || !member.plan) {
          if (obligation) {
            obligation.reviewState = 'orgo_review';
            obligation.reviewReason = member.issue ?? 'Date ORGO neclare.';
            obligation.orgoLastSyncedAt = now;
            const checkout = checkoutByObligation.get(obligation.id);
            if (checkout) checkout.reviewRequired = true;
            summary.review++;
          }
          continue;
        }
        const price = period.prices[member.plan];
        if (!obligation) {
          em.persist(
            em.create(Obligation, {
              periodId: period.id,
              orgoUserId: member.orgoUserId,
              cardId: member.cardId,
              memberName: member.memberName,
              plan: member.plan,
              totalBani: price.totalBani,
              nationalBani: price.nationalBani,
              verificationNote: 'Importat automat din registrul ORGO.',
              orgoLastSyncedAt: now,
              reviewState: null,
              reviewReason: null,
            }),
          );
          summary.added++;
          continue;
        }
        const paidBani = await this.balance(em, obligation.id);
        const financialChange =
          obligation.plan !== member.plan ||
          obligation.totalBani !== price.totalBani ||
          obligation.nationalBani !== price.nationalBani;
        const openCheckout = checkoutByObligation.get(obligation.id);
        if (financialChange && (paidBani > 0 || openCheckout)) {
          obligation.reviewState = 'plan_changed_after_payment';
          obligation.reviewReason = openCheckout
            ? `Plan ORGO nou: ${member.plan}. Există o plată cu suma anterioară în curs.`
            : `Plan ORGO nou: ${member.plan}. Obligația are deja încasări.`;
          obligation.orgoLastSyncedAt = now;
          if (openCheckout) openCheckout.reviewRequired = true;
          summary.review++;
          continue;
        }
        const changed =
          obligation.plan !== member.plan ||
          obligation.memberName !== member.memberName ||
          obligation.cardId !== member.cardId;
        obligation.memberName = member.memberName;
        obligation.cardId = member.cardId;
        obligation.plan = member.plan;
        obligation.totalBani = price.totalBani;
        obligation.nationalBani = price.nationalBani;
        obligation.orgoLastSyncedAt = now;
        obligation.reviewState = null;
        obligation.reviewReason = null;
        if (changed) summary.updated++;
        else summary.unchanged++;
      }
      for (const obligation of obligations) {
        if (seen.has(obligation.orgoUserId)) continue;
        obligation.reviewState = 'missing_from_orgo';
        obligation.reviewReason =
          'Membrul nu mai apare ca eligibil în registrul ORGO.';
        obligation.orgoLastSyncedAt = now;
        const checkout = checkoutByObligation.get(obligation.id);
        if (checkout) checkout.reviewRequired = true;
        summary.review++;
      }
      run.status = 'succeeded';
      run.summary = summary;
      run.completedAt = now;
      this.audit(em, user.id, 'roster.synchronized', run.id, {
        periodId: period.id,
        mode: run.mode,
        ...summary,
      });
      await em.flush();
      return { id: run.id, status: run.status, ...summary };
    });
  }

  private async failRosterSync(
    user: CurrentUser,
    period: Period,
    run: RosterSync,
    error: unknown,
  ) {
    const message =
      error instanceof Error ? error.message : 'Sincronizarea ORGO a eșuat.';
    await this.mutate(async (em) => {
      const stored = await em.findOneOrFail(RosterSync, { id: run.id });
      stored.status = 'failed';
      stored.error = message;
      stored.completedAt = new Date();
      this.audit(em, user.id, 'roster.synchronization_failed', stored.id, {
        periodId: period.id,
        mode: stored.mode,
      });
      await em.flush();
    });
  }

  async synchronizeRoster(
    user: CurrentUser,
    mode: 'initialization' | 'manual' | 'automatic',
  ) {
    this.staff(user);
    const period = await this.ensureCurrentPeriod();
    const initialized = await this.em.findOne(RosterSync, {
      periodId: period.id,
      mode: 'initialization',
      status: 'succeeded',
    });
    if (mode === 'initialization' && initialized)
      throw new ConflictException(
        'Perioada a fost deja inițializată. Folosește sincronizarea ORGO.',
      );
    if (mode !== 'initialization' && !initialized)
      throw new ConflictException(
        'Previzualizează și confirmă inițializarea perioadei înainte de sincronizare.',
      );
    const run = await this.beginRosterSync(user, period, mode);
    if (!run) return null;
    try {
      const members = await this.orgoRoster.members(user.id);
      return await this.finishRosterSync(user, period, run, members);
    } catch (error) {
      await this.failRosterSync(user, period, run, error);
      throw error;
    }
  }

  scheduleAutomaticRosterSync(user: CurrentUser) {
    void (async () => {
      const period = await this.ensureCurrentPeriod();
      const initialized = await this.em.findOne(RosterSync, {
        periodId: period.id,
        mode: 'initialization',
        status: 'succeeded',
      });
      if (!initialized) return;
      await this.synchronizeRoster(user, 'automatic');
    })().catch(() => undefined);
  }

  private findObligationByIdentifier(
    em: EntityManager,
    periodId: string,
    entered: ReturnType<typeof identifier>,
  ) {
    return entered.kind === 'orgo_id'
      ? em.findOne(Obligation, {
          periodId,
          orgoUserId: Number(entered.value),
        })
      : em.findOne(Obligation, { periodId, cardId: entered.value });
  }

  async guestLookup(input: unknown) {
    const body = record(input);
    const entered = identifier(body.identifier);
    const period = await this.ensureCurrentPeriod();
    const obligation = await this.findObligationByIdentifier(
      this.em,
      period.id,
      entered,
    );
    if (!obligation)
      throw new NotFoundException(
        'ID-ul nu corespunde unui membru eligibil din Centrul Local Cluj.',
      );
    if (obligation.reviewState)
      throw new NotFoundException(
        'Cotizația acestui membru necesită verificare înainte de plată.',
      );
    const paidBani = await this.balance(this.em, obligation.id);
    const name = obligation.memberName.trim().split(/\s+/);
    const displayName = [
      name[0],
      ...name.slice(1).map((part) => `${part.charAt(0).toUpperCase()}.`),
    ].join(' ');
    return {
      identifier: entered.value,
      displayName,
      affiliation: 'Centrul Local Cluj',
      amountBani: Math.max(0, obligation.totalBani - paidBani),
      paid: paidBani >= obligation.totalBani,
    };
  }

  async mine(user: CurrentUser): Promise<
    Array<{
      id: string;
      periodId: string;
      orgoUserId: number;
      memberName: string;
      plan: string;
      totalBani: number;
      nationalBani: number;
      paidBani: number;
      reviewState: string | null;
      reviewReason: string | null;
    }>
  > {
    const orgoUserId = user.orgoConnection?.orgoUserId;
    if (!orgoUserId) return [];
    const obligations = await this.em.find(Obligation, { orgoUserId });
    return Promise.all(
      obligations.map(async (item) => ({
        id: String(item.id),
        periodId: item.periodId,
        orgoUserId: item.orgoUserId,
        memberName: item.memberName,
        plan: item.plan,
        totalBani: item.totalBani,
        nationalBani: item.nationalBani,
        paidBani: await this.balance(this.em, item.id),
        reviewState: item.reviewState ?? null,
        reviewReason: item.reviewReason ?? null,
      })),
    );
  }

  async dashboard(user: CurrentUser): Promise<{
    periods: Period[];
    payouts: Payout[];
    obligations: Obligation[];
    receipts: Receipt[];
    allocations: Allocation[];
    batches: Batch[];
    nationalItems: Item[];
    checkouts: Array<
      Pick<
        Checkout,
        | 'id'
        | 'identifier'
        | 'identifierKind'
        | 'plan'
        | 'amountBani'
        | 'provider'
        | 'state'
        | 'reviewRequired'
        | 'createdAt'
      >
    >;
    cardEnabled: boolean;
    paymentConfiguration: Awaited<
      ReturnType<MembershipService['providerSummary']>
    >;
    orgoIntegration: string;
    rosterSync: RosterSync | null;
    rosterInitialized: boolean;
  }> {
    this.staff(user);
    const currentPeriod = await this.ensureCurrentPeriod();
    const [
      periods,
      obligations,
      receipts,
      allocations,
      batches,
      nationalItems,
      checkouts,
      rosterSyncs,
    ] = await Promise.all([
      this.em.find(Period, {}, { orderBy: { createdAt: 'desc' } }),
      this.em.find(Obligation, {}, { orderBy: { memberName: 'asc' } }),
      this.em.find(Receipt, {}, { orderBy: { createdAt: 'desc' } }),
      this.em.find(Allocation, {}),
      this.em.find(Batch, {}),
      this.em.find(Item, {}),
      this.em.find(
        Checkout,
        {},
        {
          fields: [
            'id',
            'identifier',
            'identifierKind',
            'plan',
            'amountBani',
            'provider',
            'state',
            'reviewRequired',
            'createdAt',
          ],
        },
      ),
      this.em.find(
        RosterSync,
        { periodId: currentPeriod.id },
        { orderBy: { createdAt: 'desc' }, limit: 1 },
      ),
    ]);
    const settings = await this.paymentSettings();
    const paymentConfiguration = await this.providerSummary(
      settings.activeProvider as PaymentProviderName,
      settings.activeEnvironment,
    );
    const active = paymentConfiguration.providers.find(
      (item) =>
        item.id === paymentConfiguration.activeProvider &&
        item.environment === paymentConfiguration.activeEnvironment,
    );
    return {
      payouts: await this.em.find(
        Payout,
        {},
        { orderBy: { createdAt: 'desc' } },
      ),
      periods,
      obligations,
      receipts,
      allocations,
      batches,
      nationalItems,
      checkouts: checkouts.map((c) => ({
        id: c.id,
        identifier: c.identifier,
        identifierKind: c.identifierKind,
        plan: c.plan,
        amountBani: c.amountBani,
        provider: c.provider,
        state: c.state,
        reviewRequired: c.reviewRequired,
        createdAt: c.createdAt,
      })),
      cardEnabled: Boolean(active?.ready),
      paymentConfiguration,
      orgoIntegration: 'awaiting_access',
      rosterSync: rosterSyncs[0] ?? null,
      rosterInitialized: Boolean(
        await this.em.findOne(RosterSync, {
          periodId: currentPeriod.id,
          mode: 'initialization',
          status: 'succeeded',
        }),
      ),
    };
  }

  async selectPaymentProvider(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input);
    const provider = body.provider;
    if (provider !== 'netopia' && provider !== 'stripe')
      throw new BadRequestException('Procesator de plată invalid.');
    let environment: 'sandbox' | 'test' | 'live';
    if (provider === 'netopia') {
      if (body.environment !== 'sandbox' && body.environment !== 'live')
        throw new BadRequestException('Mediu de plată invalid.');
      environment = body.environment;
    } else {
      if (body.environment !== 'test' && body.environment !== 'live')
        throw new BadRequestException('Mediu de plată invalid.');
      environment = body.environment;
    }
    const configured = (await this.paymentConfigurations.summaries()).find(
      (item) => item.id === provider && item.environment === environment,
    )?.ready;
    if (!this.paymentConfigurations.vaultReady() || !configured)
      throw new ConflictException(
        `${provider === 'stripe' ? 'Stripe' : 'NETOPIA'} ${environment === 'live' ? 'Producție' : environment === 'test' ? 'Test' : 'Sandbox'} nu poate fi selectat până când toate secretele și URL-urile necesare sunt configurate.`,
      );
    return this.mutate(async (em) => {
      const settings = await this.paymentSettings(em);
      settings.activeProvider = provider;
      settings.activeEnvironment = environment;
      settings.updatedBy = user.id;
      em.persist(settings);
      this.audit(em, user.id, 'provider.selected', settings.id, {
        provider,
        environment,
      });
      return this.providerSummary(provider, environment, em);
    });
  }

  async configurePaymentProvider(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input);
    const provider = body.provider;
    if (provider !== 'netopia' && provider !== 'stripe')
      throw new BadRequestException('Procesator de plată invalid.');
    const configuration = this.paymentConfigurations.parse(provider, body);
    const encrypted = await this.paymentConfigurations.encrypt(configuration);
    return this.mutate(async (em) => {
      const previous = await em.find(ProviderConfig, {
        provider,
        environment: configuration.environment,
        active: true,
      });
      for (const row of previous) row.active = false;
      await em.flush();
      const revision = em.create(ProviderConfig, {
        provider,
        active: true,
        environment: configuration.environment,
        encryptedConfiguration: encrypted.ciphertext,
        secretHint: encrypted.secretHint,
        updatedBy: user.id,
      });
      em.persist(revision);
      this.audit(em, user.id, 'provider.configured', revision.id, {
        provider,
        environment: configuration.environment,
      });
      const settings = await this.paymentSettings(em);
      await em.flush();
      return this.providerSummary(
        settings.activeProvider as PaymentProviderName,
        settings.activeEnvironment,
        em,
      );
    });
  }

  async createPeriod(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input);
    const startsOn = date(body.startsOn),
      endsOn = date(body.endsOn);
    if (startsOn > endsOn) throw new BadRequestException('Perioadă invalidă.');
    const prices: Prices = structuredClone(BASELINE_PLANS);
    const totals = body.totals === undefined ? {} : record(body.totals);
    for (const key of Object.keys(prices) as Array<keyof Prices>) {
      if (totals[key] !== undefined) prices[key].totalBani = bani(totals[key]);
      if (prices[key].totalBani < prices[key].nationalBani)
        throw new BadRequestException(
          'Totalul nu poate fi sub partea națională.',
        );
    }
    return this.mutate(async (em) => {
      const period = em.create(Period, {
        name: text(body.name, 100),
        startsOn,
        endsOn,
        prices,
        active: false,
      });
      em.persist(period);
      await em.flush();
      this.audit(em, user.id, 'period.created', period.id);
      return period;
    });
  }

  async activatePeriod(user: CurrentUser, id: string) {
    this.staff(user);
    uuid(id);
    return this.mutate(async (em) => {
      const period = await em.findOneOrFail(Period, { id });
      for (const active of await em.find(Period, { active: true }))
        active.active = false;
      await em.flush();
      period.active = true;
      this.audit(em, user.id, 'period.published', id);
      return period;
    });
  }

  async createObligation(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input),
      periodId = uuid(body.periodId),
      planKey = plan(body.plan);
    const orgo = identifier(body.orgoUserId);
    if (orgo.kind !== 'orgo_id' || Number(orgo.value) > 2147483647)
      throw new BadRequestException('ID ORGO numeric necesar.');
    const card = body.cardId ? identifier(body.cardId) : undefined;
    if (card && card.kind !== 'card_id')
      throw new BadRequestException('ID Card invalid.');
    return this.mutate(async (em) => {
      const period = await em.findOneOrFail(Period, { id: periodId });
      if (
        await em.findOne(Obligation, {
          periodId,
          orgoUserId: Number(orgo.value),
        })
      )
        throw new ConflictException('Cotizația există deja.');
      if (
        card &&
        (await em.findOne(Obligation, { periodId, cardId: card.value }))
      )
        throw new ConflictException('ID Card deja asociat.');
      const value = period.prices[planKey];
      const obligation = em.create(Obligation, {
        periodId,
        orgoUserId: Number(orgo.value),
        cardId: card?.value,
        memberName: text(body.memberName, 200),
        plan: planKey,
        totalBani: value.totalBani,
        nationalBani: value.nationalBani,
        verificationNote: text(body.verificationNote, 2000),
      });
      em.persist(obligation);
      await em.flush();
      this.audit(em, user.id, 'obligation.verified', obligation.id, {
        periodId,
      });
      return obligation;
    });
  }

  async bankReceipt(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input),
      periodId = uuid(body.periodId),
      reference = text(body.reference, 200);
    return this.mutate(async (em) => {
      await em.findOneOrFail(Period, { id: periodId });
      if (await em.findOne(Receipt, { method: 'bank', reference }))
        throw new ConflictException('Referință bancară deja înregistrată.');
      const receipt = em.create(Receipt, {
        periodId,
        amountBani: bani(body.amountBani),
        method: 'bank',
        receivedOn: date(body.receivedOn),
        note: text(body.note, 2000),
        reference,
        actorId: user.id,
        reviewRequired: false,
      });
      em.persist(receipt);
      await em.flush();
      this.audit(em, user.id, 'bank.received', receipt.id);
      return receipt;
    });
  }

  async allocate(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input),
      receiptId = uuid(body.receiptId),
      obligationId = uuid(body.obligationId),
      amountBani = bani(body.amountBani),
      note = text(body.note, 2000);
    return this.mutate(async (em) => {
      const receipt = await em.findOneOrFail(Receipt, { id: receiptId });
      const obligation = await em.findOneOrFail(Obligation, {
        id: obligationId,
      });
      if (receipt.periodId !== obligation.periodId)
        throw new BadRequestException('Perioade diferite.');
      if (receipt.reviewRequired && receipt.checkoutId) {
        const checkout = await em.findOneOrFail(Checkout, {
          id: receipt.checkoutId,
        });
        if (checkout.reviewRequired)
          throw new ConflictException(
            'Plată contestată sau restituită: necesită reconciliere.',
          );
      }
      const existing = await em.find(Allocation, {
        receiptId,
        reversed: false,
      });
      if (
        existing.reduce((sum, item) => sum + item.amountBani, 0) + amountBani >
        receipt.amountBani - receipt.refundedBani
      )
        throw new BadRequestException('Alocarea depășește suma încasată.');
      if (
        (await this.balance(em, obligationId)) + amountBani >
        obligation.totalBani
      )
        throw new BadRequestException(
          'Alocarea depășește cotizația. Excedentul rămâne nealocat.',
        );
      const allocation = em.create(Allocation, {
        receiptId,
        obligationId,
        amountBani,
        actorId: user.id,
        note,
      });
      em.persist(allocation);
      receipt.reviewRequired = false;
      await em.flush();
      this.audit(em, user.id, 'receipt.allocated', allocation.id, {
        receiptId,
        obligationId,
        amountBani,
      });
      return allocation;
    });
  }

  async reverse(user: CurrentUser, id: string, input: unknown) {
    this.staff(user);
    uuid(id);
    const note = text(record(input).note, 2000);
    return this.mutate(async (em) => {
      const allocation = await em.findOneOrFail(Allocation, { id });
      if (allocation.reversed)
        throw new ConflictException('Alocare deja anulată.');
      allocation.reversed = true;
      const item = await em.findOne(Item, {
        obligationId: allocation.obligationId,
      });
      if (item) item.orgoState = 'correction_required';
      this.audit(em, user.id, 'allocation.reversed', id, { reason: note });
      return { success: true };
    });
  }

  async reconcileReceipt(user: CurrentUser, id: string, input: unknown) {
    this.staff(user);
    uuid(id);
    const body = record(input),
      note = text(body.note, 2000);
    const refundedBani = Number(body.refundedBani);
    if (!Number.isSafeInteger(body.refundedBani) || refundedBani < 0)
      throw new BadRequestException('Sumă restituită invalidă.');
    return this.mutate(async (em) => {
      const receipt = await em.findOneOrFail(Receipt, { id });
      if (
        refundedBani < receipt.refundedBani ||
        refundedBani > receipt.amountBani
      )
        throw new BadRequestException(
          'Suma restituită cumulată nu poate scădea sau depăși încasarea.',
        );
      const allocations = await em.find(Allocation, {
        receiptId: id,
        reversed: false,
      });
      if (
        allocations.reduce((sum, a) => sum + a.amountBani, 0) >
        receipt.amountBani - refundedBani
      )
        throw new ConflictException(
          'Anulează mai întâi alocările afectate de restituire.',
        );
      const previousBani = receipt.refundedBani;
      receipt.refundedBani = refundedBani;
      receipt.reviewRequired = false;
      if (receipt.checkoutId) {
        const checkout = await em.findOneOrFail(Checkout, {
          id: receipt.checkoutId,
        });
        checkout.reviewRequired = false;
      }
      this.audit(em, user.id, 'receipt.reconciled', id, {
        previousBani,
        refundedBani,
        reason: note,
      });
      return receipt;
    });
  }

  async recordPayout(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input);
    if (
      !Array.isArray(body.receiptIds) ||
      !body.receiptIds.length ||
      body.receiptIds.length > 500
    )
      throw new BadRequestException('Selectează încasările din decont.');
    const ids = [...new Set(body.receiptIds.map(uuid))],
      netBani = bani(body.netBani),
      chargesBani = Number(body.chargesBani);
    if (!Number.isSafeInteger(body.chargesBani) || chargesBani < 0)
      throw new BadRequestException('Costuri invalide.');
    return this.mutate(async (em) => {
      const receipts = await em.find(Receipt, { id: { $in: ids } });
      if (
        receipts.length !== ids.length ||
        receipts.some(
          (r) => r.method !== 'card' || r.payoutId || r.reviewRequired,
        )
      )
        throw new ConflictException(
          'Selectează plăți card verificate, încă nedecontate.',
        );
      const grossBani = receipts.reduce((s, r) => s + r.amountBani, 0),
        refundedBani = receipts.reduce((s, r) => s + r.refundedBani, 0);
      if (grossBani - refundedBani - chargesBani !== netBani)
        throw new BadRequestException(
          'Decontul nu se închide: brut − restituiri − costuri trebuie să fie egal cu suma netă.',
        );
      const reference = text(body.reference, 200);
      if (await em.findOne(Payout, { reference }))
        throw new ConflictException('Decont deja înregistrat.');
      const payout = em.create(Payout, {
        reference,
        receivedOn: date(body.receivedOn),
        grossBani,
        refundedBani,
        chargesBani,
        netBani,
        note: text(body.note, 2000),
        actorId: user.id,
      });
      em.persist(payout);
      await em.flush();
      for (const receipt of receipts) receipt.payoutId = payout.id;
      this.audit(em, user.id, 'payout.reconciled', payout.id, {
        grossBani,
        netBani,
        chargesBani,
        refundedBani,
      });
      return payout;
    });
  }

  async closeAttempt(user: CurrentUser, id: string, input: unknown) {
    this.staff(user);
    uuid(id);
    const evidence = text(record(input).evidence, 2000);
    return this.mutate(async (em) => {
      const checkout = await em.findOneOrFail(Checkout, { id });
      if (!['starting', 'pending', 'unknown'].includes(checkout.state))
        throw new ConflictException('Încercarea nu este în așteptare.');
      if (await em.findOne(Receipt, { checkoutId: id }))
        throw new ConflictException('Încasare deja confirmată.');
      checkout.state = 'failed';
      this.audit(em, user.id, 'checkout.manually_closed', id, {
        reason: evidence,
      });
      return { success: true };
    });
  }

  async nationalBatch(user: CurrentUser, input: unknown) {
    this.staff(user);
    const body = record(input);
    if (
      !Array.isArray(body.obligationIds) ||
      body.obligationIds.length < 1 ||
      body.obligationIds.length > 500
    )
      throw new BadRequestException('Selectează membrii.');
    const ids = [...new Set(body.obligationIds.map(uuid))];
    return this.mutate(async (em) => {
      const obligations = await em.find(Obligation, { id: { $in: ids } });
      if (obligations.length !== ids.length)
        throw new BadRequestException('Cotizație inexistentă.');
      for (const obligation of obligations) {
        const allocations = await em.find(Allocation, {
          obligationId: obligation.id,
          reversed: false,
        });
        for (const allocation of allocations) {
          const receipt = await em.findOneOrFail(Receipt, {
            id: allocation.receiptId,
          });
          if (receipt.reviewRequired)
            throw new ConflictException(
              'O încasare necesită verificare înainte de transfer.',
            );
        }
        if ((await this.balance(em, obligation.id)) < obligation.totalBani)
          throw new ConflictException('Cotizație neîncasată integral.');
        if (await em.findOne(Item, { obligationId: obligation.id }))
          throw new ConflictException(
            'Partea națională este deja într-un transfer.',
          );
      }
      const batch = em.create(Batch, {
        transferredOn: date(body.transferredOn),
        reference: text(body.reference, 200),
        note: text(body.note, 2000),
        totalBani: obligations.reduce(
          (sum, item) => sum + item.nationalBani,
          0,
        ),
        actorId: user.id,
      });
      em.persist(batch);
      await em.flush();
      for (const obligation of obligations)
        em.persist(
          em.create(Item, {
            batchId: batch.id,
            obligationId: obligation.id,
            amountBani: obligation.nationalBani,
            orgoState: 'awaiting_access',
          }),
        );
      this.audit(em, user.id, 'national.transferred', batch.id, {
        totalBani: batch.totalBani,
      });
      return batch;
    });
  }

  async confirmOrgo(user: CurrentUser, id: string, input: unknown) {
    this.staff(user);
    uuid(id);
    const evidence = text(record(input).evidence, 2000);
    return this.mutate(async (em) => {
      const item = await em.findOneOrFail(Item, { id });
      if (item.orgoState === 'correction_required')
        throw new ConflictException(
          'Rezolvă corecția financiară înainte de confirmare.',
        );
      item.orgoState = 'manually_confirmed';
      item.evidence = evidence;
      this.audit(em, user.id, 'orgo.manually_confirmed', id);
      return item;
    });
  }

  async checkout(input: unknown, user?: CurrentUser) {
    const body = record(input),
      periodId = uuid(body.periodId);
    if (body.acceptTerms !== true)
      throw new BadRequestException(
        'Acceptă termenii, politica de anulare și politica de confidențialitate.',
      );
    const token = text(body.attemptToken, 100);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new BadRequestException('Referință de plată invalidă.');
    await this.ensureCurrentPeriod();
    const tokenHash = hash(token);
    const selected = await this.paymentSettings();
    const providerName = selected.activeProvider as PaymentProviderName;
    const providerEnvironment = selected.activeEnvironment as
      | 'sandbox'
      | 'test'
      | 'live';
    const providerRevision = await this.paymentConfigurations.activeRevision(
      providerName,
      providerEnvironment,
    );
    if (!providerRevision)
      throw new ServiceUnavailableException(
        `Procesatorul ${providerName === 'stripe' ? 'Stripe' : 'NETOPIA'} nu este configurat pentru acest mediu.`,
      );
    const checkout = await this.mutate(async (em) => {
      const previous = await em.findOne(Checkout, { tokenHash });
      if (previous) return previous;
      const settings = await this.paymentSettings(em);
      const activeRevision = await em.findOne(ProviderConfig, {
        id: providerRevision.id,
        provider: providerName,
        environment: providerEnvironment,
        active: true,
      });
      if (
        settings.activeProvider !== providerName ||
        settings.activeEnvironment !== providerEnvironment ||
        !activeRevision
      )
        throw new ConflictException(
          'Configurația plăților s-a schimbat. Reîncearcă inițierea.',
        );
      await em.findOneOrFail(Period, {
        id: periodId,
        active: true,
      });
      let obligation: Obligation | null = null;
      let entered: ReturnType<typeof identifier>;
      if (user) {
        if (!user.orgoConnection?.orgoUserId)
          throw new ForbiddenException('Cont fără ID ORGO.');
        obligation = await em.findOne(Obligation, {
          id: uuid(body.obligationId),
          orgoUserId: user.orgoConnection.orgoUserId,
          periodId,
        });
        if (!obligation)
          throw new NotFoundException(
            'Cotizația verificată nu este disponibilă.',
          );
        entered = identifier(String(obligation.orgoUserId));
      } else {
        entered = identifier(body.identifier);
        obligation = await this.findObligationByIdentifier(
          em,
          periodId,
          entered,
        );
        if (!obligation)
          throw new NotFoundException(
            'ID-ul nu corespunde unui membru eligibil din Centrul Local Cluj.',
          );
      }
      if (obligation.reviewState)
        throw new ConflictException(
          'Cotizația necesită verificare financiară înainte de plată.',
        );
      const pending = await em.findOne(Checkout, {
        obligationId: obligation.id,
        state: { $in: ['starting', 'pending', 'unknown'] },
      });
      if (pending)
        throw new ConflictException(
          'Există o plată în curs. Reia pagina inițială sau contactează responsabilul financiar.',
        );
      const planKey = plan(obligation.plan);
      const amountBani =
        obligation.totalBani - (await this.balance(em, obligation.id));
      if (amountBani <= 0)
        throw new ConflictException('Cotizație deja plătită.');
      const attempt = em.create(Checkout, {
        id: randomUUID(),
        tokenHash,
        periodId,
        obligationId: obligation.id,
        identifier: entered.value,
        identifierKind: entered.kind,
        plan: planKey,
        amountBani,
        provider: providerName,
        providerConfigId: providerRevision.id,
        environment: providerRevision.configuration.environment,
        state: 'starting',
        termsVersion: MEMBERSHIP_TERMS_VERSION,
        termsAcceptedAt: new Date(),
      });
      em.persist(attempt);
      await em.flush();
      return attempt;
    });
    if (checkout.state !== 'starting')
      return { state: checkout.state, paymentUrl: checkout.paymentUrl };
    // Claim exactly one network submission, including concurrent retry requests.
    const claimed = await this.mutate(async (em) => {
      const fresh = await em.findOneOrFail(
        Checkout,
        { id: checkout.id },
        { refresh: true },
      );
      if (fresh.state !== 'starting') return false;
      fresh.state = 'unknown';
      return true;
    });
    if (!claimed) return { state: 'unknown', paymentUrl: null };
    try {
      if (!checkout.providerConfigId)
        throw new ServiceUnavailableException(
          'Revizia configurației pentru această plată nu este disponibilă.',
        );
      const startConfiguration = await this.paymentConfigurations.getRevision(
        checkout.provider as PaymentProviderName,
        checkout.providerConfigId,
      );
      if (
        !startConfiguration ||
        startConfiguration.environment !== checkout.environment
      )
        throw new ServiceUnavailableException(
          'Configurația inițială a plății nu mai este disponibilă.',
        );
      const startInput = {
        id: checkout.id,
        amountBani: checkout.amountBani,
        description: 'Cotizație Centrul Local Cluj',
      };
      const started =
        startConfiguration.provider === 'stripe'
          ? await this.stripe.start(startInput, startConfiguration)
          : await this.netopia.start(startInput, startConfiguration);
      return await this.mutate(async (em) => {
        const fresh = await em.findOneOrFail(
          Checkout,
          { id: checkout.id },
          { refresh: true },
        );
        if (fresh.providerId && fresh.providerId !== started.providerId)
          throw new ConflictException('Referință NETOPIA inconsistentă.');
        fresh.providerId = started.providerId;
        fresh.paymentUrl = started.paymentUrl;
        if (fresh.state === 'unknown') fresh.state = 'pending';
        return { state: fresh.state, paymentUrl: fresh.paymentUrl };
      });
    } catch {
      // A lost response may still mean a charge exists. Do not create another.
      throw new ServiceUnavailableException(
        'Inițiere neconfirmată. Nu repeta plata; responsabilul financiar trebuie să verifice tranzacția.',
      );
    }
  }

  async status(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new NotFoundException();
    const checkout = await this.em.findOne(Checkout, {
      tokenHash: hash(token),
    });
    if (!checkout) throw new NotFoundException();
    return {
      state: checkout.state,
      amountBani: checkout.amountBani,
      provider: checkout.provider,
      requiresStaffReview: !checkout.obligationId || checkout.reviewRequired,
      paymentUrl: checkout.state === 'pending' ? checkout.paymentUrl : null,
    };
  }

  private untrustedNotificationBody(raw: Buffer) {
    try {
      return record(JSON.parse(raw.toString('utf8')));
    } catch {
      throw new BadRequestException('Notificare invalidă.');
    }
  }

  async notifyNetopia(raw: Buffer, token: string) {
    const unsigned = this.untrustedNotificationBody(raw);
    const id = uuid(record(unsigned.order).orderID);
    const configuration = await this.configurationForCheckout('netopia', id);
    const body = this.netopia.verify(raw, token, configuration),
      payment = record(body.payment),
      order = record(body.order);
    if (uuid(order.orderID) !== id) throw new BadRequestException();
    const providerId = text(payment.ntpID, 100);
    if (!Number.isInteger(payment.status)) throw new BadRequestException();
    if (
      payment.currency !== 'RON' ||
      typeof payment.amount !== 'number' ||
      !Number.isFinite(payment.amount)
    )
      throw new BadRequestException('Notificare NETOPIA invalidă.');
    const providerStatus = Number(payment.status);
    const reviewEvent = [8, 9, 10, 13, 16, 17].includes(providerStatus);
    await this.applyPaymentEvent('netopia', raw, {
      checkoutId: id,
      providerId,
      providerStatus: String(providerStatus),
      amountBani: Math.round(payment.amount * 100),
      currency: 'RON',
      outcome: reviewEvent
        ? 'review'
        : [3, 5].includes(providerStatus)
          ? 'succeeded'
          : [4, 11, 12, 23].includes(providerStatus)
            ? 'failed'
            : 'pending',
    });
    return { errorCode: 0 };
  }

  async notifyStripe(raw: Buffer, signature: string) {
    const unsigned = this.untrustedNotificationBody(raw);
    const object = record(record(unsigned.data).object);
    const id = uuid(
      record(object.metadata).checkout_id ?? object.client_reference_id,
    );
    const configuration = await this.configurationForCheckout('stripe', id);
    await this.applyPaymentEvent(
      'stripe',
      raw,
      this.stripe.verify(raw, signature, configuration),
    );
    return { received: true };
  }

  private async configurationForCheckout(
    provider: 'netopia',
    id: string,
  ): Promise<NetopiaConfiguration>;
  private async configurationForCheckout(
    provider: 'stripe',
    id: string,
  ): Promise<StripeConfiguration>;
  private async configurationForCheckout(
    provider: PaymentProviderName,
    id: string,
  ): Promise<PaymentProviderConfiguration> {
    const checkout = await this.em.findOne(Checkout, { id, provider });
    if (!checkout?.providerConfigId)
      throw new ServiceUnavailableException(
        'Revizia configurației pentru această plată nu este disponibilă.',
      );
    const configuration = await this.paymentConfigurations.getRevision(
      provider,
      checkout.providerConfigId,
    );
    if (!configuration || configuration.environment !== checkout.environment)
      throw new BadRequestException('Configurația plății nu corespunde.');
    return configuration;
  }

  private async applyPaymentEvent(
    provider: PaymentProviderName,
    raw: Buffer,
    event: VerifiedPaymentEvent,
  ) {
    const eventHash = hash(Buffer.concat([Buffer.from(`${provider}:`), raw]));
    return this.mutate(async (em) => {
      const checkout = await em.findOneOrFail(
        Checkout,
        { id: event.checkoutId },
        { refresh: true },
      );
      if (
        checkout.provider !== provider ||
        event.currency !== 'RON' ||
        (event.outcome === 'review'
          ? event.amountBani <= 0 || event.amountBani > checkout.amountBani
          : event.amountBani !== checkout.amountBani) ||
        (checkout.providerId && checkout.providerId !== event.providerId)
      )
        throw new BadRequestException('Notificarea nu corespunde plății.');
      if (await em.findOne(Event, { hash: eventHash })) return;
      checkout.providerId = event.providerId;
      em.persist(
        em.create(Event, {
          hash: eventHash,
          checkoutId: event.checkoutId,
          provider,
          providerStatus: event.providerStatus,
          amountBani: event.amountBani,
        }),
      );
      let receipt = await em.findOne(Receipt, {
        checkoutId: event.checkoutId,
      });
      if (event.outcome === 'review') {
        checkout.reviewRequired = true;
        if (receipt) {
          receipt.reviewRequired = true;
          for (const allocation of await em.find(Allocation, {
            receiptId: receipt.id,
            reversed: false,
          })) {
            const item = await em.findOne(Item, {
              obligationId: allocation.obligationId,
            });
            if (item) item.orgoState = 'correction_required';
          }
        }
      } else if (event.outcome === 'succeeded') {
        checkout.state = 'succeeded';
        if (!receipt) {
          receipt = em.create(Receipt, {
            periodId: checkout.periodId,
            checkoutId: event.checkoutId,
            amountBani: checkout.amountBani,
            method: 'card',
            receivedOn: new Date().toISOString().slice(0, 10),
            note: `${provider === 'stripe' ? 'Stripe' : 'NETOPIA'} — confirmare verificată`,
            reference: event.providerId,
            reviewRequired: !checkout.obligationId || checkout.reviewRequired,
          });
          em.persist(receipt);
          await em.flush();
          if (checkout.obligationId && !checkout.reviewRequired) {
            const obligation = await em.findOneOrFail(Obligation, {
              id: checkout.obligationId,
            });
            const available = Math.max(
              0,
              obligation.totalBani - (await this.balance(em, obligation.id)),
            );
            const allocated = Math.min(available, receipt.amountBani);
            if (allocated > 0)
              em.persist(
                em.create(Allocation, {
                  receiptId: receipt.id,
                  obligationId: obligation.id,
                  amountBani: allocated,
                  note: `Confirmare ${provider === 'stripe' ? 'Stripe' : 'NETOPIA'}`,
                }),
              );
            if (allocated < receipt.amountBani) receipt.reviewRequired = true;
          }
          this.audit(em, undefined, 'card.received', receipt.id);
        }
      } else if (event.outcome === 'failed' && checkout.state !== 'succeeded')
        checkout.state = 'failed';
    });
  }
}
