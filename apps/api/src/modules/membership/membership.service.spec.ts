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
}));

import type { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import { MembershipService } from './membership.service';
import type { NetopiaService } from './netopia.service';
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
    ready: () => true,
    environment: () => 'sandbox',
    verify: (raw: Buffer) =>
      JSON.parse(raw.toString()) as Record<string, unknown>,
    start: jest.fn(() =>
      Promise.resolve({
        providerId: 'ntp-test',
        paymentUrl: 'https://secure.sandbox.netopia-payments.com/pay/test',
      }),
    ),
  };
  const service = new MembershipService(
    em as unknown as EntityManager,
    netopia as unknown as NetopiaService,
  );
  const staff: CurrentUser = {
    id: 1,
    displayName: 'Finance',
    roles: [UserRole.FinanceManager],
  };
  return { rows, em, netopia, service, staff };
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
    expect(f.rows).toHaveLength(0);
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

  it('holds confirmed guest payment for review and deduplicates success callbacks', async () => {
    const f = await setup();
    const body = {
      periodId: f.period.id,
      identifier: 'at36805',
      plan: 'normal',
      acceptUnverified: true,
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
    await f.service.notify(callback, 'verified');
    await f.service.notify(callback, 'verified');
    expect(f.rows.filter((r) => r.table === 'receipt')).toHaveLength(1);
    expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(0);
    const receipt = f.rows.find((r) => r.table === 'receipt')!;
    expect(receipt.reviewRequired).toBe(true);
    await f.service.allocate(f.staff, {
      receiptId: receipt.id,
      obligationId: f.obligation.id,
      amountBani: 30000,
      note: 'Checked ID and plan in ORGO',
    });
    expect(receipt.reviewRequired).toBe(false);
    expect(f.rows.filter((r) => r.table === 'allocation')).toHaveLength(1);
  });

  it('rejects wrong-amount notifications and holds unknown checkout outcomes', async () => {
    const f = await setup();
    f.netopia.start.mockRejectedValueOnce(new Error('Lost response'));
    const body = {
      periodId: f.period.id,
      identifier: '36805',
      plan: 'normal',
      acceptUnverified: true,
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
      f.service.notify(
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
