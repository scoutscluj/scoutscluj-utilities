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
  MembershipProviderEvent as Event,
  MembershipReceipt as Receipt,
  MembershipPayout as Payout,
  MembershipPaymentSettings as PaymentSettings,
} from './entities/membership.entity';
import {
  BASELINE_PLANS,
  bani,
  date,
  identifier,
  plan,
  record,
  text,
  uuid,
  type Prices,
} from './membership.rules';
import { NetopiaService } from './netopia.service';
import { StripeService } from './stripe.service';
import type {
  PaymentProvider,
  PaymentProviderName,
  VerifiedPaymentEvent,
} from './payment-provider';

const MEMBERSHIP_TERMS_VERSION = '2026-09-28';

const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class MembershipService {
  constructor(
    private readonly em: EntityManager,
    private readonly netopia: NetopiaService,
    private readonly stripe: StripeService,
  ) {}

  private provider(name: PaymentProviderName): PaymentProvider {
    return name === 'stripe' ? this.stripe : this.netopia;
  }

  private async paymentSettings(em = this.em) {
    return (
      (await em.findOne(PaymentSettings, { id: 'membership' })) ??
      em.create(PaymentSettings, {
        id: 'membership',
        activeProvider: 'netopia',
      })
    );
  }

  private providerSummary(activeProvider: PaymentProviderName) {
    return {
      activeProvider,
      providers: (['netopia', 'stripe'] as const).map((id) => ({
        id,
        label: id === 'netopia' ? 'NETOPIA Payments' : 'Stripe',
        ready: this.provider(id).ready(),
        environment: this.provider(id).environment(),
      })),
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

  async catalog() {
    const period = await this.em.findOne(Period, { active: true });
    const settings = await this.paymentSettings();
    const activeProvider = settings.activeProvider as PaymentProviderName;
    return {
      period,
      cardEnabled: this.provider(activeProvider).ready(),
      environment: this.provider(activeProvider).environment(),
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
    }>
  > {
    const orgoUserId = user.orgoConnection?.orgoUserId;
    if (!orgoUserId) return [];
    const obligations = await this.em.find(Obligation, { orgoUserId });
    return Promise.all(
      obligations.map(async (item) => ({
        id: item.id,
        periodId: item.periodId,
        orgoUserId: item.orgoUserId,
        memberName: item.memberName,
        plan: item.plan,
        totalBani: item.totalBani,
        nationalBani: item.nationalBani,
        paidBani: await this.balance(this.em, item.id),
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
    paymentConfiguration: ReturnType<MembershipService['providerSummary']>;
    orgoIntegration: string;
  }> {
    this.staff(user);
    const [
      periods,
      obligations,
      receipts,
      allocations,
      batches,
      nationalItems,
      checkouts,
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
    ]);
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
      cardEnabled: this.provider(
        (await this.paymentSettings()).activeProvider as PaymentProviderName,
      ).ready(),
      paymentConfiguration: this.providerSummary(
        (await this.paymentSettings()).activeProvider as PaymentProviderName,
      ),
      orgoIntegration: 'awaiting_access',
    };
  }

  async selectPaymentProvider(user: CurrentUser, input: unknown) {
    this.staff(user);
    const value = record(input).provider;
    if (value !== 'netopia' && value !== 'stripe')
      throw new BadRequestException('Procesator de plată invalid.');
    if (!this.provider(value).ready())
      throw new ConflictException(
        `${value === 'stripe' ? 'Stripe' : 'NETOPIA'} nu poate fi selectat până când toate secretele și URL-urile necesare sunt configurate.`,
      );
    return this.mutate(async (em) => {
      const settings = await this.paymentSettings(em);
      settings.activeProvider = value;
      settings.updatedBy = user.id;
      em.persist(settings);
      this.audit(em, user.id, 'provider.selected', settings.id, {
        provider: value,
        ready: this.provider(value).ready(),
      });
      return this.providerSummary(value);
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
    const billingInput = record(body.billing);
    const billing: Record<string, string> = {};
    for (const field of [
      'firstName',
      'lastName',
      'email',
      'phone',
      'city',
      'state',
      'postalCode',
    ])
      billing[field] = text(billingInput[field], 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email))
      throw new BadRequestException('Email invalid.');
    const token = text(body.attemptToken, 100);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new BadRequestException('Referință de plată invalidă.');
    const tokenHash = hash(token);
    const checkout = await this.mutate(async (em) => {
      const previous = await em.findOne(Checkout, { tokenHash });
      if (previous) return previous;
      const settings = await this.paymentSettings(em);
      const providerName = settings.activeProvider as PaymentProviderName;
      const provider = this.provider(providerName);
      if (!provider.ready())
        throw new ServiceUnavailableException(
          `Procesatorul ${providerName === 'stripe' ? 'Stripe' : 'NETOPIA'} nu este configurat pentru acest mediu.`,
        );
      const period = await em.findOneOrFail(Period, {
        id: periodId,
        active: true,
      });
      let obligation: Obligation | null = null;
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
        const pending = await em.findOne(Checkout, {
          obligationId: obligation.id,
          state: { $in: ['starting', 'pending', 'unknown'] },
        });
        if (pending)
          throw new ConflictException(
            'Există o plată în curs. Reia pagina inițială sau contactează responsabilul financiar.',
          );
      } else if (body.acceptUnverified !== true)
        throw new BadRequestException(
          'Confirmă verificarea ulterioară de către centru.',
        );
      const entered = identifier(
        obligation ? String(obligation.orgoUserId) : body.identifier,
      );
      const planKey = plan(obligation ? obligation.plan : body.plan);
      const amountBani = obligation
        ? obligation.totalBani - (await this.balance(em, obligation.id))
        : period.prices[planKey].totalBani;
      if (amountBani <= 0)
        throw new ConflictException('Cotizație deja plătită.');
      const attempt = em.create(Checkout, {
        id: randomUUID(),
        tokenHash,
        periodId,
        obligationId: obligation?.id,
        identifier: entered.value,
        identifierKind: entered.kind,
        plan: planKey,
        amountBani,
        provider: providerName,
        environment: provider.environment(),
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
      const started = await this.provider(
        checkout.provider as PaymentProviderName,
      ).start({
        id: checkout.id,
        amountBani: checkout.amountBani,
        description: 'Cotizație Centrul Local Cluj',
        billing,
      });
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

  async notifyNetopia(raw: Buffer, token: string) {
    const body = this.netopia.verify(raw, token),
      payment = record(body.payment),
      order = record(body.order);
    const id = uuid(order.orderID),
      providerId = text(payment.ntpID, 100);
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
    await this.applyPaymentEvent(
      'stripe',
      raw,
      this.stripe.verify(raw, signature),
    );
    return { received: true };
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
        checkout.environment !== this.provider(provider).environment() ||
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
