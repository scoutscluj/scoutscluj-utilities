import {
  bani,
  cardPaymentAmount,
  date,
  identifier,
  membershipPeriodFor,
  plan,
} from './membership.rules';

describe('membership input rules', () => {
  it('keeps numeric ORGO IDs distinct from uppercase card IDs', () => {
    expect(identifier(' 36805 ')).toEqual({ kind: 'orgo_id', value: '36805' });
    expect(identifier(' at36805 ')).toEqual({
      kind: 'card_id',
      value: 'AT36805',
    });
  });
  it.each(['', '0', '0036805', 'AT 36805', '3e4', '../36805', '36.805'])(
    'rejects ambiguous identifier %s',
    (input) => expect(() => identifier(input)).toThrow(),
  );
  it.each([0, -1, 37.5, '300', NaN, Infinity])(
    'rejects invalid integer bani %s',
    (input) => expect(() => bani(input)).toThrow(),
  );
  it('does not coerce inherited properties into plans or roll invalid dates forward', () => {
    expect(() => plan('constructor')).toThrow();
    expect(() => date('2026-02-30')).toThrow();
    expect(date('2026-10-28')).toBe('2026-10-28');
  });
  it('changes the membership year on 1 September in Bucharest', () => {
    expect(membershipPeriodFor(new Date('2026-08-31T20:59:59Z'))).toEqual({
      name: 'Cotizație 2025–2026',
      startsOn: '2025-09-01',
      endsOn: '2026-08-31',
    });
    expect(membershipPeriodFor(new Date('2026-08-31T21:00:00Z'))).toEqual({
      name: 'Cotizație 2026–2027',
      startsOn: '2026-09-01',
      endsOn: '2027-08-31',
    });
  });
});

describe('card payment amount', () => {
  it.each([
    [30000, 100, 0, 30500],
    [30000, 200, 0, 31000],
    [30000, 150, 100, 31000],
    [29700, 100, 0, 30000],
    [29701, 100, 0, 30500],
    [30000, 0, 0, 30000],
    [1, 100, 100, 500],
    [0, 100, 100, 0],
  ])(
    'charges the smallest multiple of 5 lei for %i bani',
    (due, percent, fixed, expected) => {
      const gross = cardPaymentAmount(due, percent, fixed);
      expect(gross).toBe(expected);
      if (due > 0) {
        const net = (charge: number) =>
          charge - Math.ceil((charge * percent) / 10000) - fixed;
        expect(net(gross)).toBeGreaterThanOrEqual(due);
        expect(net(gross - 500)).toBeLessThan(due);
      }
    },
  );

  it.each([
    [-1, 100, 0],
    [30000, 10000, 0],
    [30000, -1, 0],
    [30000, 1.5, 0],
    [30000, 100, -1],
    [30000, 100, 1.5],
    [30000, NaN, 0],
    [100000000, 9999, 0],
  ])('rejects invalid or excessive amounts', (due, percent, fixed) => {
    expect(() => cardPaymentAmount(due, percent, fixed)).toThrow();
  });
});
