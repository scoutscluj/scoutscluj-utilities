import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ActivityRegistration as Registration,
  ActivityRegistrationCheckout as Checkout,
  ActivityRegistrationEntry as Entry,
} from './registration.entity';
import { RegistrationService } from './registration.service';
import { MembershipPaymentSettings as PaymentSettings } from '../membership/entities/membership.entity';
import { NetopiaService } from '../membership/netopia.service';
import { StripeService } from '../membership/stripe.service';
import { PaymentConfigurationService } from '../membership/payment-configuration.service';
import { PaymentCallbacksService } from '../membership/payment-callbacks.service';
import {
  PaymentNotSubmittedException,
  type StripeConfiguration,
  type PaymentProviderConfiguration,
  type PaymentProviderName,
  type PaymentEnvironment,
  type VerifiedPaymentEvent,
} from '../membership/payment-provider';
import { record, text, uuid } from '../membership/membership.rules';
import { localDate } from '../members/member.types';
import type { CurrentUser } from '../users/users.types';

@Injectable()
export class RegistrationPaymentsService
  implements OnModuleInit, OnModuleDestroy
{
  private unregister?: () => void;
  constructor(
    private readonly em: EntityManager,
    private readonly registrations: RegistrationService,
    private readonly configurations: PaymentConfigurationService,
    private readonly netopia: NetopiaService,
    private readonly stripe: StripeService,
    private readonly callbacks: PaymentCallbacksService,
  ) {}
  onModuleInit() {
    this.unregister = this.callbacks.register((p, b, s) =>
      this.notification(p, b, s),
    );
  }
  onModuleDestroy() {
    this.unregister?.();
  }

  async lookup(activityId: number, input: unknown) {
    await this.registrations.publicPage(activityId);
    const member = await this.registrations.member(record(input).identifier);
    const row = await this.em.findOne(Registration, {
      activityId,
      memberId: member.id,
    });
    if (!row)
      throw new BadRequestException(
        'Înscrie mai întâi participantul la această activitate.',
      );
    const balance = await this.registrations.balance(row);
    const settings = await this.em.findOne(PaymentSettings, {
      id: 'membership',
    });
    const active = (await this.configurations.summaries()).find(
      (target) =>
        target.id === (settings?.activeProvider ?? 'netopia') &&
        target.environment === (settings?.activeEnvironment ?? 'sandbox'),
    );
    return {
      cardEnabled: this.configurations.vaultReady() && !!active?.ready,
      environment: settings?.activeEnvironment ?? 'sandbox',
      memberName: `${row.memberName.split(' ')[0]} ${row.memberName.split(' ').slice(-1)[0].slice(0, 1)}.`,
      remainingBani: balance.remainingBani,
      cardRemainingBani: balance.cardRemainingBani,
      cashRemainingBani: balance.cashRemainingBani,
      installment: balance.installment,
      payable:
        row.role !== 'staff' &&
        ['accepted', 'reserved'].includes(row.state) &&
        balance.cardRemainingBani > 0,
      state: row.state,
      paymentState: balance.paymentState,
    };
  }
  async checkout(activityId: number, input: unknown) {
    const b = record(input);
    if (b.acceptTerms !== true)
      throw new BadRequestException('Confirmă suma și condițiile plății.');
    const member = await this.registrations.member(b.identifier);
    const prepared = await this.registrations.mutate(activityId, async (tx) => {
      const { activity, data } = await this.registrations.settings(
        activityId,
        tx,
      );
      if (
        !data.published ||
        ['cancelled', 'completed'].includes(activity.status)
      )
        throw new BadRequestException('Plata nu este disponibilă.');
      const row = await tx.findOne(Registration, {
        activityId,
        memberId: member.id,
      });
      if (
        !row ||
        row.role === 'staff' ||
        !['accepted', 'reserved'].includes(row.state)
      )
        throw new BadRequestException(
          'Plata necesită o înscriere acceptată, cu loc disponibil.',
        );
      const balance = await this.registrations.balance(row, tx);
      if (!balance.cardRemainingBani)
        throw new BadRequestException(
          balance.cashRemainingBani
            ? 'Soldul rămas se achită doar cash la predare.'
            : 'Taxa este deja acoperită.',
        );
      const requestedBani =
        b.full === true
          ? balance.cardRemainingBani
          : balance.installment.amountBani;
      if (requestedBani !== b.amountBani)
        throw new ConflictException(
          'Suma s-a schimbat. Verifică soldul înainte de plată.',
        );
      const existing = await tx.findOne(
        Checkout,
        {
          registrationId: row.id,
          state: { $in: ['created', 'pending', 'unknown'] },
        },
        { orderBy: { createdAt: 'desc' } },
      );
      if (existing) {
        if (existing.amountBani !== requestedBani)
          throw new ConflictException(
            'Există deja o plată în curs pentru o altă sumă.',
          );
        return {
          checkout: existing,
          start: false,
          description: activity.title,
          memberName: row.memberName,
        };
      }
      const settings = await tx.findOne(PaymentSettings, { id: 'membership' });
      const provider: PaymentProviderName =
        settings?.activeProvider === 'stripe' ? 'stripe' : 'netopia';
      const environment = (settings?.activeEnvironment ??
        'sandbox') as PaymentEnvironment;
      const revision =
        await this.configurations.activeRevision<PaymentProviderConfiguration>(
          provider,
          environment,
          tx,
        );
      if (!revision)
        throw new ServiceUnavailableException(
          'Procesatorul de plăți nu este configurat.',
        );
      const checkout = tx.create(Checkout, {
        registrationId: row.id,
        amountBani: requestedBani,
        provider,
        environment,
        providerConfigId: revision.id,
        state: 'created',
      });
      tx.persist(checkout);
      await tx.flush();
      this.registrations.audit(
        tx,
        activityId,
        undefined,
        'checkout_created',
        row.id,
        {
          checkoutId: checkout.id,
          amountBani: requestedBani,
          provider,
          environment,
        },
      );
      return {
        checkout,
        start: true,
        description: activity.title,
        memberName: row.memberName,
      };
    });
    if (!prepared.start) {
      if (prepared.checkout.state === 'pending' && prepared.checkout.paymentUrl)
        return { state: 'pending', paymentUrl: prepared.checkout.paymentUrl };
      throw new ConflictException(
        'Plata este în curs de verificare. Nu iniția o nouă plată.',
      );
    }
    const checkout = prepared.checkout;
    try {
      const configuration =
        await this.configurations.getRevision<PaymentProviderConfiguration>(
          checkout.provider as PaymentProviderName,
          checkout.providerConfigId,
        );
      if (!configuration || configuration.environment !== checkout.environment)
        throw new PaymentNotSubmittedException(
          'Configurația plății nu este disponibilă.',
        );
      const input = {
        id: checkout.id,
        amountBani: checkout.amountBani,
        description: prepared.description,
        beneficiaryName: prepared.memberName,
        beneficiaryOrgoId: member.orgoId!,
        activityReturnPath: `/activitati/${activityId}?plata=verificare`,
      };
      const started =
        configuration.provider === 'stripe'
          ? await this.stripe.start(input, configuration)
          : await this.netopia.start(input, configuration);
      await this.registrations.mutate(activityId, async (tx) => {
        const fresh = await tx.findOneOrFail(Checkout, { id: checkout.id });
        if (fresh.providerId && fresh.providerId !== started.providerId)
          throw new ConflictException('Referință de plată neconcordantă.');
        fresh.providerId = started.providerId;
        fresh.paymentUrl = started.paymentUrl;
        if (fresh.state === 'created') fresh.state = 'pending';
        fresh.updatedAt = new Date();
      });
      return { state: 'pending', paymentUrl: started.paymentUrl };
    } catch (error) {
      await this.registrations.mutate(activityId, async (tx) => {
        const fresh = await tx.findOneOrFail(Checkout, { id: checkout.id });
        if (fresh.state === 'created')
          fresh.state =
            error instanceof PaymentNotSubmittedException
              ? 'failed'
              : 'unknown';
        fresh.updatedAt = new Date();
      });
      throw error;
    }
  }
  async notification(
    provider: PaymentProviderName,
    raw: Buffer,
    signature: string,
  ) {
    let unsigned: Record<string, unknown>, id: string;
    try {
      unsigned = record(JSON.parse(raw.toString('utf8')));
      const object =
        provider === 'stripe' ? record(record(unsigned.data).object) : null;
      id = uuid(
        object
          ? (record(object.metadata ?? {}).checkout_id ??
              object.client_reference_id)
          : record(unsigned.order).orderID,
      );
    } catch {
      return false;
    }
    // Routing data is untrusted. No state changes occur before provider verification.
    const checkout = await this.em.findOne(Checkout, { id, provider });
    if (!checkout) return false;
    const configuration =
      await this.configurations.getRevision<PaymentProviderConfiguration>(
        provider,
        checkout.providerConfigId,
      );
    if (!configuration || configuration.environment !== checkout.environment)
      throw new BadRequestException('Configurație notificare invalidă.');
    let event: VerifiedPaymentEvent;
    if (configuration.provider === 'stripe')
      event = this.stripe.verify(raw, signature, configuration);
    else {
      const verified = this.netopia.verify(raw, signature, configuration);
      const payment = record(verified.payment),
        order = record(verified.order);
      const status = Number(payment.status),
        value = Number(payment.amount);
      if (
        uuid(order.orderID) !== id ||
        !Number.isInteger(payment.status) ||
        status < 1 ||
        status > 23 ||
        payment.currency !== 'RON' ||
        typeof payment.amount !== 'number' ||
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.abs(value * 100 - Math.round(value * 100)) > 1e-8
      )
        throw new BadRequestException('Notificare NETOPIA invalidă.');
      event = {
        checkoutId: id,
        providerId: text(payment.ntpID, 100),
        providerStatus: String(status),
        amountBani: Math.round(value * 100),
        currency: 'RON',
        outcome: [8, 9, 10, 13, 16, 17].includes(status)
          ? 'review'
          : [3, 5].includes(status)
            ? 'succeeded'
            : [4, 11, 12, 23].includes(status)
              ? 'failed'
              : 'pending',
      };
    }
    const registration = await this.em.findOneOrFail(Registration, {
      id: checkout.registrationId,
    });
    await this.applyEvent(registration.activityId, provider, event);
    return true;
  }
  async applyEvent(
    activityId: number,
    provider: PaymentProviderName,
    event: VerifiedPaymentEvent,
  ) {
    return this.registrations.mutate(activityId, async (tx) => {
      const checkout = await tx.findOneOrFail(Checkout, {
        id: event.checkoutId,
      });
      const row = await tx.findOneOrFail(Registration, {
        id: checkout.registrationId,
        activityId,
      });
      if (
        checkout.provider !== provider ||
        event.currency !== 'RON' ||
        !Number.isSafeInteger(event.amountBani) ||
        event.amountBani <= 0 ||
        (event.outcome === 'review'
          ? event.amountBani > checkout.amountBani
          : event.amountBani !== checkout.amountBani) ||
        (checkout.providerId && checkout.providerId !== event.providerId)
      )
        throw new BadRequestException(
          'Plata notificată nu corespunde înscrierii.',
        );
      checkout.providerId = event.providerId;
      checkout.updatedAt = new Date();
      if (event.outcome === 'review') checkout.reviewRequired = true;
      if (event.outcome === 'succeeded') {
        checkout.state = 'succeeded';
        if (!(await tx.findOne(Entry, { checkoutId: checkout.id }))) {
          tx.persist(
            tx.create(Entry, {
              registrationId: row.id,
              method: 'card',
              checkoutId: checkout.id,
              amountBani: checkout.amountBani,
              receivedOn: localDate(new Date()),
              note: `${provider}: confirmare verificată`,
            }),
          );
          await tx.flush();
          const balance = await this.registrations.balance(row, tx);
          if (
            balance.excessBani ||
            !['accepted', 'reserved'].includes(row.state)
          )
            checkout.reviewRequired = true;
          if (row.state === 'reserved' && !balance.remainingBani)
            row.state = 'accepted';
          row.revision++;
          this.registrations.audit(
            tx,
            activityId,
            undefined,
            'card_confirmed',
            row.id,
            {
              checkoutId: checkout.id,
              amountBani: checkout.amountBani,
              reviewRequired: checkout.reviewRequired,
            },
          );
        }
      } else if (event.outcome === 'failed' && checkout.state !== 'succeeded')
        checkout.state = 'failed';
      this.registrations.audit(
        tx,
        activityId,
        undefined,
        'payment_event',
        row.id,
        {
          checkoutId: checkout.id,
          outcome: event.outcome,
          status: event.providerStatus,
        },
      );
    });
  }

  async closeAttempt(
    activityId: number,
    id: string,
    input: unknown,
    user: CurrentUser,
  ) {
    const b = record(input),
      note = text(b.note, 2000);
    const overview = await this.registrations.overview(activityId, user);
    if (!overview.capabilities.finance)
      throw new BadRequestException('Acces financiar necesar.');
    const checkout = await this.em.findOneOrFail(Checkout, { id: uuid(id) });
    const registration = await this.em.findOneOrFail(Registration, {
      id: checkout.registrationId,
      activityId,
    });
    if (['succeeded', 'failed'].includes(checkout.state))
      throw new ConflictException('Încercarea este deja încheiată.');
    if (checkout.provider === 'stripe' && checkout.providerId) {
      const configuration =
        await this.configurations.getRevision<StripeConfiguration>(
          'stripe',
          checkout.providerConfigId,
        );
      if (!configuration || configuration.environment !== checkout.environment)
        throw new BadRequestException('Configurația nu este disponibilă.');
      await this.stripe.expireUnpaid(
        checkout.providerId,
        checkout.id,
        checkout.amountBani,
        configuration,
      );
    } else if (b.confirmProviderUnpaid !== true)
      throw new BadRequestException(
        'Confirmă verificarea la procesator: plata nu s-a efectuat, iar linkul nu mai poate încasa.',
      );
    return this.registrations.mutate(activityId, async (tx) => {
      const fresh = await tx.findOneOrFail(Checkout, { id: checkout.id });
      if (
        fresh.state === 'succeeded' ||
        (await tx.findOne(Entry, { checkoutId: fresh.id }))
      )
        throw new ConflictException('Plata a fost confirmată între timp.');
      fresh.state = 'failed';
      fresh.updatedAt = new Date();
      this.registrations.audit(
        tx,
        activityId,
        user.id,
        'checkout_closed',
        registration.id,
        { checkoutId: id, note },
      );
      return { success: true };
    });
  }
}
