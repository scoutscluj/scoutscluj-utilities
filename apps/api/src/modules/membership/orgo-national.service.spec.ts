jest.mock('../auth/orgo-token.service', () => ({
  OrgoTokenService: class {},
  OrgoRequestRejectedException: class extends Error {},
}));
import { ConfigService } from '@nestjs/config';
import type { OrgoTokenService } from '../auth/orgo-token.service';
import { OrgoRequestRejectedException } from '../auth/orgo-token.service';
import { OrgoNationalService } from './orgo-national.service';

const target = {
  orgoUserId: 36805,
  startsOn: '2026-09-01',
  endsOn: '2027-08-31',
  amountBani: 15000,
};
const unpaid = {
  intervalId: '2026-09-01_2027-08-31',
  status: 'short',
  paid: 0,
  unpaid: 150,
  isPending: false,
};
function fixture() {
  let period: Record<string, unknown> = { ...unpaid };
  let extraPeriods: Record<string, unknown>[] = [];
  const member = {
    id: 36805,
    localCenter: { id: 42, name: 'Centrul Local Cluj' },
    feeTenantProductPrice: { id: 7, currency: 'RON' },
  };
  const post = jest.fn(() => {
    period = { ...period, status: 'paid', paid: 150, unpaid: 0 };
    return Promise.resolve({ id: 123 });
  });
  const request = jest.fn(
    async (
      _actorId: number,
      path: string,
      body?: Record<string, unknown>,
    ): Promise<unknown> => {
      if (body) return post();
      if (path.includes('/users/')) return member;
      if (path.includes('/tenants?'))
        return {
          'hydra:member': [
            { settingFeatures: { fees: { productUuid: 'product-1' } } },
          ],
        };
      if (path.includes('/products/')) return { id: 'product-1' };
      if (path.includes('/fee-history/')) return [period, ...extraPeriods];
      throw new Error('Unexpected request');
    },
  );
  const tokens = { administrativeJson: request, serverApiReady: () => true };
  const service = new OrgoNationalService(
    tokens as unknown as OrgoTokenService,
    new ConfigService({
      ORGO_LOCAL_CENTER_ID: '42',
      ORGO_OAUTH_BASE_URL: 'https://membri.scout.ro',
    }),
  );
  return {
    service,
    post,
    request,
    member,
    setExtraPeriods: (value: Record<string, unknown>[]) => {
      extraPeriods = value;
    },
    setPeriod: (value: Record<string, unknown>) => {
      period = value;
    },
  };
}

describe('national ORGO marking', () => {
  const annual = {
    intervalId: '2026-10-01_2027-09-30',
    paid: 150,
    unpaid: 0,
    paidMonths: 12,
    unpaidMonths: 0,
    intervals: [],
    intervalGroups: [],
  };
  it('reads the live annual aggregate contract and maps the legacy local year without writing', async () => {
    const f = fixture();
    f.setPeriod(annual);
    const result = await f.service.synchronize(1, target, false);
    expect(result.state).toBe('synced');
    expect(result.message).toContain('2026-10-01–2027-09-30');
    expect(f.post).not.toHaveBeenCalled();
    await expect(
      f.service.synchronize(
        1,
        { ...target, startsOn: '2026-10-01', endsOn: '2027-09-30' },
        false,
      ),
    ).resolves.toMatchObject({ state: 'synced' });
  });
  it('uses the resolved national interval when submitting and reading back', async () => {
    const f = fixture();
    f.setPeriod({ ...annual, paid: 0, unpaid: 150 });
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      { state: 'synced' },
    );
    expect(f.request).toHaveBeenCalledWith(
      1,
      '/api/v1/fee_payments',
      expect.objectContaining({ fees: { '36805:2026-10-01_2027-09-30': 150 } }),
    );
  });
  it.each([
    { paid: 0 },
    { paid: 149 },
    { unpaid: null },
    { unpaid: '' },
    { unpaid: false },
    { paid: 'bad' },
    { exempt: true },
    { status: 'refunded' },
    { status: 'short' },
    { status: 'other' },
  ])(
    'does not mistake incomplete, exempt or refunded evidence for payment: %j',
    async (patch) => {
      const f = fixture();
      f.setPeriod({ ...annual, ...patch });
      await expect(
        f.service.synchronize(1, target, false),
      ).resolves.toMatchObject({ state: 'unknown' });
      expect(f.post).not.toHaveBeenCalled();
    },
  );
  it.each([{ status: 'pending' }, { isPending: true }])(
    'preserves pending approval even when aggregate amounts appear paid: %j',
    async (patch) => {
      const f = fixture();
      f.setPeriod({ ...annual, ...patch });
      await expect(
        f.service.synchronize(1, target, true),
      ).resolves.toMatchObject({ state: 'pending_approval' });
      expect(f.post).not.toHaveBeenCalled();
    },
  );
  it('rejects ambiguous annual candidates and custom ranges instead of guessing', async () => {
    const f = fixture();
    f.setPeriod(annual);
    f.setExtraPeriods([{ ...annual, intervalId: unpaid.intervalId }]);
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      { state: 'failed' },
    );
    f.setExtraPeriods([]);
    await expect(
      f.service.synchronize(1, { ...target, startsOn: '2026-09-02' }, true),
    ).resolves.toMatchObject({ state: 'failed' });
    expect(f.post).not.toHaveBeenCalled();
  });
  it('uses the national marking operation for the exact member and period and reads back confirmation', async () => {
    const f = fixture();
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      {
        state: 'synced',
      },
    );
    expect(f.request).toHaveBeenCalledWith(1, '/api/v1/fee_payments', {
      userId: 36805,
      fees: { '36805:2026-09-01_2027-08-31': 150 },
      type: 'tenant',
      method: 'check',
      markAsPaid: true,
      productPriceId: 7,
      productId: 'product-1',
    });
    expect(
      f.request.mock.calls.filter(([, path]) => path.includes('/fee-history/')),
    ).toHaveLength(2);
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      {
        state: 'synced',
      },
    );
    expect(f.post).toHaveBeenCalledTimes(1);
  });
  it('never submits a duplicate for an existing pending approval', async () => {
    const f = fixture();
    f.setPeriod({ ...unpaid, status: 'pending', isPending: true });
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      {
        state: 'pending_approval',
      },
    );
    expect(f.post).not.toHaveBeenCalled();
  });
  it('does not mark a different center, period or national amount', async () => {
    for (const kind of ['center', 'period', 'amount', 'partial', 'currency']) {
      const f = fixture();
      if (kind === 'center') f.member.localCenter.id = 99;
      if (kind === 'period')
        f.setPeriod({ ...unpaid, intervalId: '2025-09-01_2026-08-31' });
      if (kind === 'amount') f.setPeriod({ ...unpaid, unpaid: 100 });
      if (kind === 'partial') f.setPeriod({ ...unpaid, paid: 50, unpaid: 100 });
      if (kind === 'currency') f.member.feeTenantProductPrice.currency = 'EUR';
      await expect(
        f.service.synchronize(1, target, true),
      ).resolves.toMatchObject({
        state: 'failed',
      });
      expect(f.post).not.toHaveBeenCalled();
    }
  });
  it('keeps an uncertain write unknown and permits readback without another submission', async () => {
    const f = fixture();
    f.post.mockRejectedValueOnce(new Error('Timeout'));
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      {
        state: 'unknown',
      },
    );
    await expect(
      f.service.synchronize(1, target, false),
    ).resolves.toMatchObject({
      state: 'unknown',
    });
    expect(f.post).toHaveBeenCalledTimes(1);
  });
  it('does not treat a successful POST alone as confirmation', async () => {
    const f = fixture();
    f.post.mockResolvedValueOnce({ id: 123 });
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      {
        state: 'unknown',
      },
    );
  });
  it('allows retry after a definitive permission rejection', async () => {
    const f = fixture();
    f.post.mockRejectedValueOnce(
      new OrgoRequestRejectedException('Permission denied'),
    );
    await expect(f.service.synchronize(1, target, true)).resolves.toMatchObject(
      {
        state: 'failed',
      },
    );
  });
});
