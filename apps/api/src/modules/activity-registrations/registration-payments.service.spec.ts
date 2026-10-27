jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./registration.entity', () => ({
  ActivityRegistration: 'registration',
  ActivityRegistrationCheckout: 'checkout',
  ActivityRegistrationEntry: 'entry',
}));
jest.mock('./registration.service', () => ({ RegistrationService: class {} }));
jest.mock('../membership/entities/membership.entity', () => ({
  MembershipPaymentSettings: 'settings',
}));
jest.mock('../membership/payment-configuration.service', () => ({
  PaymentConfigurationService: class {},
}));
jest.mock('../membership/netopia.service', () => ({
  NetopiaService: class {},
}));
jest.mock('../membership/stripe.service', () => ({ StripeService: class {} }));
import { randomUUID } from 'node:crypto';
import type { EntityManager } from '@mikro-orm/postgresql';
import { RegistrationPaymentsService } from './registration-payments.service';
import type { RegistrationService } from './registration.service';
import type { PaymentConfigurationService } from '../membership/payment-configuration.service';
import type { NetopiaService } from '../membership/netopia.service';
import type { StripeService } from '../membership/stripe.service';
import { PaymentCallbacksService } from '../membership/payment-callbacks.service';
import type { VerifiedPaymentEvent } from '../membership/payment-provider';

describe('activity card receipts', () => {
  function setup() {
    const row = {
      id: randomUUID(),
      activityId: 10,
      state: 'reserved',
      totalBani: 10000,
      revision: 1,
    };
    const checkout = {
      id: randomUUID(),
      registrationId: row.id,
      amountBani: 10000,
      provider: 'stripe',
      providerId: null as string | null,
      state: 'pending',
      reviewRequired: false,
    };
    const entries: {
      checkoutId: string;
      amountBani: number;
      registrationId: string;
    }[] = [];
    const tx = {
      findOneOrFail: jest.fn(
        (entity: string, query: { id: string; activityId?: number }) => {
          if (entity === 'checkout' && query.id === checkout.id)
            return Promise.resolve(checkout);
          if (
            entity === 'registration' &&
            query.id === row.id &&
            query.activityId === row.activityId
          )
            return Promise.resolve(row);
          throw new Error('Wrong registration');
        },
      ),
      findOne: jest.fn((_entity: string, query: { checkoutId: string }) =>
        Promise.resolve(
          entries.find((e) => e.checkoutId === query.checkoutId) ?? null,
        ),
      ),
      create: jest.fn(
        (
          _entity: string,
          data: {
            checkoutId: string;
            amountBani: number;
            registrationId: string;
          },
        ) => data,
      ),
      persist: jest.fn(
        (entry: {
          checkoutId: string;
          amountBani: number;
          registrationId: string;
        }) => entries.push(entry),
      ),
      flush: jest.fn().mockResolvedValue(undefined),
    };
    const registrations = {
      mutate: (_id: number, work: (tx: unknown) => Promise<unknown>) =>
        work(tx),
      balance: () =>
        Promise.resolve({
          remainingBani: Math.max(
            0,
            row.totalBani - entries.reduce((s, e) => s + e.amountBani, 0),
          ),
          excessBani: Math.max(
            0,
            entries.reduce((s, e) => s + e.amountBani, 0) - row.totalBani,
          ),
        }),
      audit: jest.fn(),
    };
    const service = new RegistrationPaymentsService(
      {} as EntityManager,
      registrations as unknown as RegistrationService,
      {} as PaymentConfigurationService,
      {} as NetopiaService,
      {} as StripeService,
      new PaymentCallbacksService(),
    );
    const event: VerifiedPaymentEvent = {
      checkoutId: checkout.id,
      providerId: 'cs_test_123',
      providerStatus: 'paid',
      amountBani: 10000,
      currency: 'RON',
      outcome: 'succeeded',
    };
    return { row, checkout, entries, service, event };
  }
  it('credits one activity receipt for repeated success and never regresses on a delayed failure', async () => {
    const f = setup();
    await f.service.applyEvent(10, 'stripe', f.event);
    await f.service.applyEvent(10, 'stripe', f.event);
    await f.service.applyEvent(10, 'stripe', { ...f.event, outcome: 'failed' });
    expect(f.entries).toHaveLength(1);
    expect(f.entries[0].registrationId).toBe(f.row.id);
    expect(f.checkout.state).toBe('succeeded');
    expect(f.row.state).toBe('accepted');
  });
  it('rejects wrong currency, amount, provider and external transaction reference', async () => {
    for (const change of [{ currency: 'EUR' }, { amountBani: 1 }]) {
      const f = setup();
      await expect(
        f.service.applyEvent(10, 'stripe', { ...f.event, ...change }),
      ).rejects.toThrow();
      expect(f.entries).toHaveLength(0);
    }
    const f = setup();
    await expect(
      f.service.applyEvent(10, 'netopia', f.event),
    ).rejects.toThrow();
    f.checkout.providerId = 'a_different_session';
    await expect(f.service.applyEvent(10, 'stripe', f.event)).rejects.toThrow();
    expect(f.entries).toHaveLength(0);
  });
  it('preserves late money received after withdrawal and flags it for financial review', async () => {
    const f = setup();
    f.row.state = 'withdrawn';
    f.row.totalBani = 5000;
    await f.service.applyEvent(10, 'stripe', f.event);
    expect(f.entries).toHaveLength(1);
    expect(f.row.state).toBe('withdrawn');
    expect(f.checkout.reviewRequired).toBe(true);
  });
  it('does not treat refunds or disputed provider events as a second receipt', async () => {
    const f = setup();
    await f.service.applyEvent(10, 'stripe', f.event);
    await f.service.applyEvent(10, 'stripe', {
      ...f.event,
      outcome: 'review',
      amountBani: 5000,
    });
    expect(f.entries).toHaveLength(1);
    expect(f.checkout.reviewRequired).toBe(true);
  });
});
