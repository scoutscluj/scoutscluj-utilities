import {
  bani,
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
