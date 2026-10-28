import {
  defaultSettings,
  activityEnded,
  activityIsPublic,
  hasCapacity,
  installmentBalance,
  parseSettings,
  paymentBreakdown,
  priceAdvice,
  validateAnswers,
} from './registration.rules';

describe('activity registration rules', () => {
  it('keeps the last day public until midnight in Romania, including DST changes', () => {
    const activity = {
      endDate: new Date('2026-10-25T00:00Z'),
      status: 'planned',
    };
    expect(activityEnded(activity, new Date('2026-10-25T21:59:59Z'))).toBe(
      false,
    );
    expect(activityEnded(activity, new Date('2026-10-25T22:00:00Z'))).toBe(
      true,
    );
    expect(
      activityIsPublic(
        { ...activity, status: 'completed' },
        { published: true },
        new Date('2026-10-20T10:00Z'),
      ),
    ).toBe(false);
    expect(
      activityIsPublic(
        activity,
        { published: false },
        new Date('2026-10-20T10:00Z'),
      ),
    ).toBe(false);
    expect(
      activityEnded({ startDate: '2026-10-25' }, new Date('2026-10-25T22:00Z')),
    ).toBe(true);
  });
  it('reserves beneficiary, staff, branch and total capacity independently', () => {
    const settings = {
      ...defaultSettings(),
      beneficiaryCapacity: 1,
      staffCapacity: 1,
      totalCapacity: 2,
      branchCapacities: { lupisori: 1 },
    };
    const beneficiary = {
      role: 'beneficiary',
      branch: 'lupisori',
      state: 'reserved',
    };
    expect(
      hasCapacity(settings, [beneficiary], 'beneficiary', 'temerari'),
    ).toBe(false);
    expect(hasCapacity(settings, [beneficiary], 'staff', '')).toBe(true);
    expect(
      hasCapacity(
        settings,
        [beneficiary, { role: 'staff', branch: '', state: 'accepted' }],
        'staff',
        '',
      ),
    ).toBe(false);
    expect(
      hasCapacity(
        settings,
        [{ ...beneficiary, state: 'withdrawn' }],
        'beneficiary',
        'lupisori',
      ),
    ).toBe(true);
    expect(
      hasCapacity(
        { ...settings, beneficiaryCapacity: 10 },
        [beneficiary],
        'beneficiary',
        'lupisori',
      ),
    ).toBe(false);
  });
  it('does not consume places for pending approvals or a waiting list', () => {
    const settings = { ...defaultSettings(), totalCapacity: 1 };
    expect(
      hasCapacity(
        settings,
        [
          { role: 'beneficiary', branch: 'lupisori', state: 'pending' },
          { role: 'beneficiary', branch: 'lupisori', state: 'waitlisted' },
        ],
        'beneficiary',
        'lupisori',
      ),
    ).toBe(true);
  });
  it('zero capacity closes that category while null means unlimited', () => {
    expect(
      hasCapacity({ ...defaultSettings(), staffCapacity: 0 }, [], 'staff', ''),
    ).toBe(false);
    expect(hasCapacity(defaultSettings(), [], 'staff', '')).toBe(true);
  });
  it('pays the remaining part of a tranche after bank receipts and center support', () => {
    const installments = [
      { amountBani: 20000, due: '2026-11-01' },
      { amountBani: 30000, due: '2026-12-01' },
    ];
    expect(installmentBalance(50000, 15000, installments)).toEqual({
      amountBani: 5000,
      due: '2026-11-01',
    });
    expect(installmentBalance(50000, 20000, installments)).toEqual({
      amountBani: 30000,
      due: '2026-12-01',
    });
    expect(installmentBalance(25000, 20000, installments)).toEqual({
      amountBani: 5000,
      due: '2026-12-01',
    });
    expect(installmentBalance(25000, 30000, installments).amountBani).toBe(0);
    expect(installmentBalance(60000, 50000, installments).amountBani).toBe(
      10000,
    );
  });
  it('recommends the minimum multiple of five lei that covers the configured fee', () => {
    for (const net of [0, 1, 10000, 50000, 99001]) {
      const result = priceAdvice(net, {
        percentageBasisPoints: 119,
        fixedBani: 30,
      });
      expect(result.recommendedBani % 500).toBe(0);
      expect(result.estimatedNetBani).toBeGreaterThanOrEqual(net);
      if (result.recommendedBani >= 500) {
        const previous = result.recommendedBani - 500;
        expect(previous - Math.ceil(previous * 0.0119) - 30).toBeLessThan(net);
      }
    }
  });
  it('rejects malformed configuration and unscheduled or overlarge tranches', () => {
    expect(() =>
      parseSettings({ ...defaultSettings(), feeBani: -1 }),
    ).toThrow();
    expect(() =>
      parseSettings({
        ...defaultSettings(),
        feeBani: 10000,
        installments: [{ amountBani: 20000, due: '2026-11-01' }],
      }),
    ).toThrow();
    expect(() =>
      parseSettings({
        ...defaultSettings(),
        feeBani: 10000,
        installments: [{ amountBani: 5000, due: '' }],
      }),
    ).toThrow();
    expect(() =>
      parseSettings({ ...defaultSettings(), medicalUserIds: [-1] }),
    ).toThrow();
  });
  it('requires branch-specific answers and rejects invented options', () => {
    const question = {
      code: 'shirt',
      label: 'Tricou',
      type: 'choice' as const,
      required: true,
      options: ['S', 'M'],
      branches: ['lupisori'],
      inPdf: false,
    };
    expect(() => validateAnswers([question], {}, 'lupisori')).toThrow();
    expect(() =>
      validateAnswers([question], { shirt: 'XL' }, 'lupisori'),
    ).toThrow();
    expect(validateAnswers([question], {}, 'temerari')).toEqual({});
    expect(
      validateAnswers(
        [question],
        { shirt: 'S', arbitrary: 'private' },
        'lupisori',
      ),
    ).toEqual({ shirt: 'S' });
  });
});

describe('cash at handoff', () => {
  const plan = [
    {
      key: 'online',
      amountBani: 20000,
      due: '2027-07-01',
      method: 'platform' as const,
    },
    {
      key: 'handoff',
      amountBani: 15000,
      due: '2027-08-01',
      method: 'cash' as const,
    },
  ];
  it('keeps cash in the gross balance while card excludes it and includes unscheduled fees', () => {
    const result = paymentBreakdown(40000, 5000, plan);
    expect(result.cardRemainingBani).toBe(20000);
    expect(result.cashRemainingBani).toBe(15000);
    expect(result.installment.amountBani).toBe(15000);
  });
  it('accepts the cash tranche first without treating the platform tranche as paid', () => {
    const result = paymentBreakdown(35000, 15000, plan, [
      { amountBani: 15000, installmentKey: 'handoff' },
    ]);
    expect(result.cardRemainingBani).toBe(20000);
    expect(result.cashRemainingBani).toBe(0);
    expect(result.installment.amountBani).toBe(20000);
  });
  it('honors family price clipping and center support without charging twice', () => {
    const result = paymentBreakdown(25000, 22000, plan, [
      { amountBani: 22000 },
    ]);
    expect(result.cashRemainingBani).toBe(3000);
    expect(result.cardRemainingBani).toBe(0);
    expect(paymentBreakdown(10000, 10000, plan).cashRemainingBani).toBe(0);
  });
  it('reopens the cash tranche on correction and caps allocations after refunds', () => {
    const result = paymentBreakdown(35000, 20000, plan, [
      { amountBani: 15000, installmentKey: 'handoff' },
      { amountBani: -15000, installmentKey: 'handoff' },
      { amountBani: 20000 },
    ]);
    expect(result.cashRemainingBani).toBe(15000);
    expect(result.cardRemainingBani).toBe(0);
    const refunded = paymentBreakdown(35000, 5000, plan, [
      { amountBani: 15000, installmentKey: 'handoff' },
      { amountBani: -10000 },
    ]);
    expect(refunded.cashRemainingBani + refunded.cardRemainingBani).toBe(30000);
  });
  it('skips cash tranches even when scheduled before the card tranche', () => {
    const result = paymentBreakdown(35000, 0, [plan[1], plan[0]]);
    expect(result.installment).toEqual({
      amountBani: 20000,
      due: '2027-07-01',
    });
  });
  it('preserves old all-platform schedules', () => {
    for (const covered of [0, 5000, 20000, 35000, 50000])
      expect(
        paymentBreakdown(
          40000,
          covered,
          plan.map(({ amountBani, due }) => ({ amountBani, due })),
        ).installment,
      ).toEqual(installmentBalance(40000, covered, plan));
  });
});
