import {
  defaultSettings,
  hasCapacity,
  installmentBalance,
  parseSettings,
  priceAdvice,
  validateAnswers,
} from './registration.rules';

describe('activity registration rules', () => {
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
