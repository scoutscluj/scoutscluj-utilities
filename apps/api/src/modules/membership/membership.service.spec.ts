jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
jest.mock('./entities/membership.entity', () => ({
  MembershipPeriod: 'period',
  MembershipObligation: 'obligation',
  MembershipCheckout: 'checkout',
  MembershipReceipt: 'receipt',
  MembershipAllocation: 'allocation',
  MembershipNationalBatch: 'batch',
  MembershipNationalItem: 'item',
  MembershipProviderEvent: 'event',
  MembershipPayout: 'payout',
  MembershipPaymentSettings: 'settings',
  MembershipPaymentProviderConfig: 'provider-config',
}));

import type { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import { MembershipService } from './membership.service';
import type { NetopiaService } from './netopia.service';
import type { StripeService } from './stripe.service';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';

type Row = Record<string, unknown> & { id: string; table: string };

// This fixture exercises service rules, NOT PostgreSQL isolation/constraints.
// The separate PostgreSQL integration runner covers real transaction behavior.
function fixture() {
  const rows: Row[] = [];
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) =>
      value && typeof value === 'object' && '$in' in value
        ? (value.$in as unknown[]).includes(row[key])
        : row[key] === value,
    );
  const em = {
    transactional: jest.fn(
      <T>(fn: (tx: EntityManager) => Promise<T>): Promise<T> =>
        fn(em as unknown as EntityManager),
    ),
    execute: jest.fn(() => Promise.resolve([])),
    flush: jest.fn(() => Promise.resolve(undefined)),
    create: (table: string, data: Record<string, unknown>): Row => ({
      id: randomUUID(),
      createdAt: new Date(),
      active: false,
      reversed: false,
      reviewRequired: false,
      refundedBani: 0,
      payoutId: null,
      ...data,
      table,
    }),
    persist: (row: Row) => {
      if (!rows.includes(row)) rows.push(row);
    },
    find: (table: string, where: Record<string, unknown>) =>
      Promise.resolve(
        rows.filter((row) => row.table === table && matches(row, where)),
      ),
    findOne: (table: string, where: Record<string, unknown>) =>
      Promise.resolve(
        rows.find((row) => row.table === table && matches(row, where)) ?? null,
      ),
    findOneOrFail: (table: string, where: Record<string, unknown>) => {
      const row = rows.find((r) => r.table === table && matches(r, where));
      if (!row) return Promise.reject(new Error('Missing row'));
      return Promise.resolve(row);
    },
  };
  const netopia = {
    verify: (raw: Buffer) =>
      JSON.parse(raw.toString()) as Record<string, unknown>,
    start: jest.fn(() =>
      Promise.resolve({
        providerId: 'ntp-test',
        paymentUrl: 'https://secure.sandbox.netopia-payments.com/pay/test',
      }),
    ),
  };
  const stripe = {
    verify: jest.fn(),
    start: jest.fn(() =>
      Promise.resolve({
        providerId: 'cs_test_123',
        paymentUrl: 'https://checkout.stripe.com/c/pay/test',
      }),
    ),
  };
  rows.push(
    {
      id: '11111111-1111-4111-8111-111111111111',
      table: 'provider-config',
      provider: 'netopia',
      active: true,
      environment: 'sandbox',
      encryptedConfiguration: 'netopia',
      secretHint: 'opia',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      table: 'provider-config',
      provider: 'stripe',
      active: true,
      environment: 'test',
      encryptedConfiguration: 'stripe',
      secretHint: 'test',
    },
  );
  const runtimeConfiguration = (provider: 'netopia' | 'stripe') =>
    provider === 'stripe'
      ? {
          provider,
          environment: 'test' as const,
          secretKey: 'sk_test_secret',
          webhookSecret: 'whsec_test',
        }
      : {
          provider,
          environment: 'sandbox' as const,
          apiKey: 'api-key',
          posSignature: 'pos',
          publicKey: 'certificate',
        };
  const configurations = {
    vaultReady: () => true,
    summaries: () =>
      Promise.resolve(
        rows
          .filter((row) => row.table === 'provider-config' && row.active)
          .map((row) => ({
            id: row.provider,
            label: row.provider === 'stripe' ? 'Stripe' : 'NETOPIA Payments',
            ready: true,
            environment: row.environment,
            secretHint: row.secretHint,
            updatedAt: null,
          })),
      ),
    activeRevision: (provider: 'netopia' | 'stripe') => {
      const row = rows.find(
        (item) =>
          item.table === 'provider-config' &&
          item.provider === provider &&
          item.active,
      );
      return Promise.resolve(
        row
          ? {
              id: row.id,
              configuration: runtimeConfiguration(provider),
            }
          : null,
      );
    },
    getRevision: (provider: 'netopia' | 'stripe', id: string) =>
      Promise.resolve(
        rows.some(
          (row) =>
            row.table === 'provider-config' &&
            row.id === id &&
            row.provider === provider,
        )
          ? runtimeConfiguration(provider)
          : null,
      ),
    parse: (provider: 'netopia' | 'stripe') => runtimeConfiguration(provider),
    encrypt: (configuration: { provider: 'netopia' | 'stripe' }) =>
      Promise.resolve({
        ciphertext: `encrypted-${configuration.provider}`,
        secretHint: 'test',
      }),
  };
  const service = new MembershipService(
    em as unknown as EntityManager,
    netopia as unknown as NetopiaService,
    stripe as unknown as StripeService,
    configurations as never,
  );
  const staff: CurrentUser = {
    id: 1,
    displayName: 'Finance',
    roles: [UserRole.FinanceManager],
  };
  return { rows, em, netopia, stripe, configurations, service, staff };
}

async function setup() {
  const f = fixture();
  const period = await f.service.createPeriod(f.staff, {
    name: 'ORGO test period',
    startsOn: '2026-09-01',
    endsOn: '2027-08-31',
  });
  await f.service.activatePeriod(f.staff, period.id);
  const obligation = await f.service.createObligation(f.staff, {
    periodId: period.id,
    orgoUserId: '36805',
    cardId: 'at36805',
    memberName: 'Test Member',
    plan: 'normal',
    verificationNote: 'Test ORGO evidence',
  });
  return { ...f, period, obligation };
}

describe('membership service rules', () => {
  it('rejects administrative work from an ordinary member', async () => {
    const f = fixture(),
      user: CurrentUser = { id: 2, displayName: 'Member', roles: [] };
    await expect(f.service.dashboard(user)).rejects.toThrow();
    await expect(f.service.bankReceipt(user, {})).rejects.toThrow();
    await expect(f.service.nationalBatch(user, {})).rejects.toThrow();
    expect(
      f.rows.filter((row) => row.table !== 'provider-config'),
    ).toHaveLength(0);
  });

  it('allocates one receipt across members without spending it twice', async () => {
    const f = await setup();
    const second = await f.service.createObligation(f.staff, {
      periodId: f.period.id,
      orgoUserId: '36806',
      memberName: 'Second',
      plan: 'fam2',
      verificationNote: 'Verified',
    });
    const receipt = await f.service.bankReceipt(f.staff, {
      periodId: f.period.id,
      amountBani: 45000,
      reference: 'bank-1',
      receivedOn: '2026-09-21',
      note: 'Family payment',
    });
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: f.obligation.id,
      amountBani: 30000,
      note: 'First member',
    });
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: second.id,
      amountBani: 15000,
      note: 'Second member',
    });
    await expect(
      f.service.allocate(f.staff, {
        receiptId: receipt.id,
        obligationId: second.id,
        amountBani: 1,
        note: 'Overdraw',
      }),
    ).rejects.toThrow('Alocarea depășește');
    const batch = await f.service.nationalBatch(f.staff, {
      obligationIds: [f.obligation.id, second.id],
      transferredOn: '2026-09-22',
      reference: 'national-1',
      note: 'Transferred',
    });
    expect(batch.totalBani).toBe(22500);
    expect(
      f.rows
        .filter((r) => r.table === 'item')
        .every((r) => r.orgoState === 'awaiting_access'),
    ).toBe(true);
    await expect(
      f.service.nationalBatch(f.staff, {
        obligationIds: [second.id],
        transferredOn: '2026-09-22',
        reference: 'national-2',
        note: 'Duplicate',
      }),
    ).rejects.toThrow('deja într-un transfer');
  });

  it('validates a local member before guest payment and deduplicates success callbacks', async () => {
    const f = await setup();
    await expect(
      f.service.guestLookup({ identifier: 'at36805' }),
    ).resolves.toEqual({
      identifier: 'AT36805',
      displayName: 'Test M.',
      affiliation: 'Centrul Local Cluj',
      amountBani: 30000,
      paid: false,
    });
    await expect(
      f.service.guestLookup({ identifier: 'AT99999' }),
    ).rejects.toThrow('ID-ul nu corespunde');
    const body = {
      periodId: f.period.id,
      identifier: 'at36805',
      acceptTerms: true,
      attemptToken: 'a'.repeat(43),
      billing: {
        firstName: 'Payer',
        lastName: 'Test',
        email: 'payer@example.test',
        phone: '0700000000',
        city: 'Cluj',
        state: 'Cluj',
        postalCode: '400000',
      },
    };
    await f.service.checkout(body);
    await f.service.checkout(body);
    expect(f.netopia.start).toHaveBeenCalledTimes(1);
    const checkout = f.rows.find((r) => r.table === 'checkout')!;
    expect(checkout.identifier).toBe('AT36805');
    const callback = Buffer.from(
      JSON.stringify({
        order: { orderID: checkout.id },
        payment: { ntpID: 'ntp-test', amount: 300, currency: 'RON', status: 3 },
      }),
    );
    await f.service.notifyNetopia(callback, 'verified');
    await f.service.notifyNetopia(callback, 'verified');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(1);
    expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(1);
    const receipt = f.rows.find((r) => r.table === 'receipt')!;
    expect(receipt.reviewRequired).toBe(false);
  });

  it('requires explicit acceptance of the current legal policies', async () => {
    const f = await setup();
    await expect(f.service.checkout({ periodId: f.period.id })).rejects.toThrow(
      'Acceptă termenii',
    );
    expect(f.netopia.start).not.toHaveBeenCalled();
  });

  it('uses the administrator-selected provider only for new checkouts', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, { provider: 'stripe' });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 's'.repeat(43),
      billing: {
        firstName: 'Payer',
        lastName: 'Test',
        email: 'payer@example.test',
        phone: '0700000000',
        city: 'Cluj',
        state: 'Cluj',
        postalCode: '400000',
      },
    });
    expect(f.stripe.start).toHaveBeenCalledTimes(1);
    expect(f.netopia.start).not.toHaveBeenCalled();
    expect(f.rows.find((row) => row.table === 'checkout')?.provider).toBe(
      'stripe',
    );
    await expect(f.service.catalog()).resolves.toMatchObject({
      activeProvider: 'stripe',
      cardEnabled: true,
    });
  });

  it('keeps prior encrypted revisions for callbacks after credential rotation', async () => {
    const f = await setup();
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 'r'.repeat(43),
      billing: {
        firstName: 'Payer',
        lastName: 'Test',
        email: 'payer@example.test',
        phone: '0700000000',
        city: 'Cluj',
        state: 'Cluj',
        postalCode: '400000',
      },
    });
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    const originalConfigId = checkout.providerConfigId;
    await f.service.configurePaymentProvider(f.staff, {
      provider: 'netopia',
      environment: 'sandbox',
      apiKey: 'ultra-secret-new-key',
      posSignature: 'new-pos',
      publicKey: 'new-certificate',
    });
    const original = f.rows.find((row) => row.id === originalConfigId);
    expect(original?.active).toBe(false);
    const callback = Buffer.from(
      JSON.stringify({
        order: { orderID: checkout.id },
        payment: { ntpID: 'ntp-test', amount: 300, currency: 'RON', status: 3 },
      }),
    );
    await expect(
      f.service.notifyNetopia(callback, 'verified'),
    ).resolves.toEqual({ errorCode: 0 });
    expect(JSON.stringify(f.rows)).not.toContain('ultra-secret-new-key');
  });

  it('deduplicates signed Stripe success events and keeps provider attribution', async () => {
    const f = await setup();
    await f.service.selectPaymentProvider(f.staff, { provider: 'stripe' });
    await f.service.checkout({
      periodId: f.period.id,
      identifier: 'AT36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 't'.repeat(43),
      billing: {
        firstName: 'Payer',
        lastName: 'Test',
        email: 'payer@example.test',
        phone: '0700000000',
        city: 'Cluj',
        state: 'Cluj',
        postalCode: '400000',
      },
    });
    const checkout = f.rows.find((row) => row.table === 'checkout')!;
    f.stripe.verify.mockReturnValue({
      checkoutId: checkout.id,
      providerId: 'cs_test_123',
      providerStatus: 'checkout.session.completed:paid',
      amountBani: 30000,
      currency: 'RON',
      outcome: 'succeeded',
    });
    const raw = Buffer.from(
      JSON.stringify({
        id: 'evt_123',
        data: {
          object: {
            client_reference_id: checkout.id,
            metadata: { checkout_id: checkout.id },
          },
        },
      }),
    );
    await f.service.notifyStripe(raw, 'signed');
    await f.service.notifyStripe(raw, 'signed');
    expect(f.rows.filter((row) => row.table === 'receipt')).toHaveLength(1);
    expect(f.rows.find((row) => row.table === 'event')).toMatchObject({
      provider: 'stripe',
      providerStatus: 'checkout.session.completed:paid',
    });
  });

  it('rejects wrong-amount notifications and holds unknown checkout outcomes', async () => {
    const f = await setup();
    f.netopia.start.mockRejectedValueOnce(new Error('Lost response'));
    const body = {
      periodId: f.period.id,
      identifier: '36805',
      plan: 'normal',
      acceptUnverified: true,
      acceptTerms: true,
      attemptToken: 'b'.repeat(43),
      billing: {
        firstName: 'A',
        lastName: 'B',
        email: 'a@example.test',
        phone: '0700000000',
        city: 'Cluj',
        state: 'Cluj',
        postalCode: '400000',
      },
    };
    await expect(f.service.checkout(body)).rejects.toThrow(
      'Inițiere neconfirmată',
    );
    await expect(f.service.checkout(body)).resolves.toMatchObject({
      state: 'unknown',
    });
    expect(f.netopia.start).toHaveBeenCalledTimes(1);
    const checkout = f.rows.find((r) => r.table === 'checkout')!;
    await expect(
      f.service.notifyNetopia(
        Buffer.from(
          JSON.stringify({
            order: { orderID: checkout.id },
            payment: {
              ntpID: 'ntp-test',
              amount: 1,
              currency: 'RON',
              status: 3,
            },
          }),
        ),
        'verified',
      ),
    ).rejects.toThrow('nu corespunde');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(0);
  });

  it('reconciles refunds before recording the processor payout', async () => {
    const f = await setup();
    const checkout = f.em.create('checkout', {
      periodId: f.period.id,
      tokenHash: 'refund-test',
      identifier: 'AT36805',
      identifierKind: 'card_id',
      plan: 'normal',
      amountBani: 30000,
      provider: 'netopia',
      environment: 'sandbox',
      state: 'succeeded',
      reviewRequired: true,
    });
    f.em.persist(checkout);
    const receipt = f.em.create('receipt', {
      periodId: f.period.id,
      checkoutId: checkout.id,
      amountBani: 30000,
      refundedBani: 0,
      payoutId: null,
      method: 'card',
      receivedOn: '2026-09-21',
      note: 'NETOPIA',
      reference: 'ntp-refund',
      reviewRequired: true,
    });
    f.em.persist(receipt);

    await f.service.reconcileReceipt(f.staff, receipt.id, {
      refundedBani: 5000,
      note: 'Refund verified in NETOPIA',
    });
    expect(receipt).toMatchObject({
      refundedBani: 5000,
      reviewRequired: false,
    });
    await expect(
      f.service.recordPayout(f.staff, {
        receiptIds: [receipt.id],
        reference: 'payout-1',
        receivedOn: '2026-09-24',
        chargesBani: 400,
        netBani: 24600,
        note: 'Settlement statement',
      }),
    ).resolves.toMatchObject({
      grossBani: 30000,
      refundedBani: 5000,
      chargesBani: 400,
      netBani: 24600,
    });
    expect(receipt.payoutId).toBeTruthy();
  });

  it('requires evidence before staff closes an unknown checkout', async () => {
    const f = await setup();
    const checkout = f.em.create('checkout', {
      periodId: f.period.id,
      tokenHash: 'unknown-test',
      identifier: '36805',
      identifierKind: 'orgo_id',
      plan: 'normal',
      amountBani: 30000,
      provider: 'netopia',
      environment: 'sandbox',
      state: 'unknown',
    });
    f.em.persist(checkout);
    await expect(
      f.service.closeAttempt(f.staff, checkout.id, {
        evidence: 'Verified in NETOPIA dashboard: no matching transaction',
      }),
    ).resolves.toEqual({ success: true });
    expect(checkout.state).toBe('failed');
  });
});
