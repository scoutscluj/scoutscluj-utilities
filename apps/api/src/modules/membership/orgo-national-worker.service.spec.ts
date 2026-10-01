jest.mock('@mikro-orm/core', () => ({
  RequestContext: { create: (_em: unknown, fn: () => unknown) => fn() },
}));
jest.mock('../users/entities/user.entity', () => ({ User: 'user' }));
jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/membership.entity', () => ({
  MembershipNationalItem: 'item',
  MembershipObligation: 'obligation',
  MembershipPeriod: 'period',
  MembershipAllocation: 'allocation',
  MembershipReceipt: 'receipt',
}));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
jest.mock('./orgo-national.service', () => ({ OrgoNationalService: class {} }));
import type { EntityManager } from '@mikro-orm/postgresql';
import type {
  NationalTarget,
  NationalResult,
  OrgoNationalService,
} from './orgo-national.service';
import { OrgoNationalWorker } from './orgo-national-worker.service';

function fixture(state = 'queued') {
  const item = {
    id: 'item-1',
    obligationId: 'obligation-1',
    orgoActorId: 1,
    amountBani: 15000,
    orgoState: state,
    orgoLastAttemptAt: new Date(Date.now() - 180000),
    orgoError: null as string | null,
    evidence: null as string | null,
  };
  const obligation = {
    id: 'obligation-1',
    periodId: 'period-1',
    orgoUserId: 36805,
    totalBani: 30500,
    reviewState: null as string | null,
  };
  const allocations = [{ receiptId: 'receipt-1', amountBani: 30500 }];
  const receipt = { reviewRequired: false };
  const audits: unknown[] = [];
  const em = {
    fork: () => em,
    transactional: async <T>(
      fn: (tx: EntityManager) => Promise<T>,
    ): Promise<T> => fn(em as unknown as EntityManager),
    execute: jest.fn(() => Promise.resolve([])),
    find: (table: string) =>
      Promise.resolve(
        table === 'item' &&
          ['queued', 'syncing', 'pending_approval'].includes(item.orgoState)
          ? [item]
          : table === 'allocation'
            ? allocations
            : [],
      ),
    findOne: () => Promise.resolve({ id: 1, roles: ['finance_manager'] }),
    findOneOrFail: (table: string) =>
      Promise.resolve(
        table === 'item'
          ? item
          : table === 'obligation'
            ? obligation
            : table === 'receipt'
              ? receipt
              : { startsOn: '2026-09-01', endsOn: '2027-08-31' },
      ),
    create: (table: string, data: unknown) => ({ table, data }),
    persist: (row: unknown) => audits.push(row),
  };
  const synchronize = jest.fn<
    Promise<NationalResult>,
    [number, NationalTarget, boolean]
  >(() => Promise.resolve({ state: 'synced', message: 'Readback confirmed' }));
  const worker = new OrgoNationalWorker(
    em as unknown as EntityManager,
    { synchronize } as unknown as OrgoNationalService,
  );
  return {
    worker,
    item,
    obligation,
    receipt,
    allocations,
    synchronize,
    audits,
  };
}
describe('national ORGO persisted jobs', () => {
  it('confirms the item only after verified synchronization and does not process it twice', async () => {
    const f = fixture();
    await f.worker.run();
    await f.worker.run();
    expect(f.synchronize).toHaveBeenCalledTimes(1);
    expect(f.synchronize).toHaveBeenCalledWith(
      1,
      {
        orgoUserId: 36805,
        startsOn: '2026-09-01',
        endsOn: '2027-08-31',
        amountBani: 15000,
      },
      true,
    );
    expect(f.item.orgoState).toBe('synced');
    expect(f.audits).toHaveLength(1);
  });
  it('recovers an expired in-flight claim through readback only', async () => {
    const f = fixture('syncing');
    await f.worker.run();
    expect(f.synchronize.mock.calls[0][2]).toBe(false);
  });
  it('leaves a fresh in-flight claim with its owner', async () => {
    const f = fixture('syncing');
    f.item.orgoLastAttemptAt = new Date();
    await f.worker.run();
    expect(f.synchronize).not.toHaveBeenCalled();
  });
  it('checks pending approvals without submitting again', async () => {
    const f = fixture('pending_approval');
    await f.worker.run();
    expect(f.synchronize.mock.calls[0][2]).toBe(false);
  });
  it('does not process unknown or failed submissions automatically', async () => {
    for (const state of [
      'failed',
      'unknown',
      'manually_confirmed',
      'correction_required',
    ]) {
      const f = fixture(state);
      await f.worker.run();
      expect(f.synchronize).not.toHaveBeenCalled();
    }
  });
  it('blocks writes when payment or receipt needs correction', async () => {
    for (const kind of ['unpaid', 'review', 'receipt']) {
      const f = fixture();
      if (kind === 'unpaid') f.allocations[0].amountBani = 30000;
      if (kind === 'review') f.obligation.reviewState = 'changed';
      if (kind === 'receipt') f.receipt.reviewRequired = true;
      await f.worker.run();
      expect(f.item.orgoState).toBe('correction_required');
      expect(f.synchronize).not.toHaveBeenCalled();
    }
  });
  it('does not overwrite a financial correction made while ORGO was responding', async () => {
    const f = fixture();
    f.synchronize.mockImplementationOnce(() => {
      f.item.orgoState = 'correction_required';
      return Promise.resolve({
        state: 'synced',
        message: 'Readback confirmed',
      });
    });
    await f.worker.run();
    expect(f.item.orgoState).toBe('correction_required');
    expect(f.audits).toHaveLength(0);
  });
});
