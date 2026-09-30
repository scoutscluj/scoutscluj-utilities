jest.mock('../auth/orgo-token.service', () => ({
  OrgoTokenService: class {},
}));

import { orgoPlan, parseOrgoRoster } from './orgo-roster.service';

describe('ORGO membership roster parsing', () => {
  it.each([
    ['Normală', 'normal'],
    ['Fam 1', 'fam1'],
    ['Familia 2', 'fam2'],
    [{ name: 'Fam 3' }, 'fam3'],
    [{ product: { title: 'Socială' } }, 'social'],
  ])('maps %p to %s', (value, expected) => {
    expect(orgoPlan(value)).toBe(expected);
  });

  it('keeps only local-center members and flags unusable records', () => {
    const members = parseOrgoRoster(
      {
        'hydra:member': [
          {
            id: 1,
            fullName: 'Ana Cercetaș',
            cardId: 'at1',
            localCenter: { name: 'Centrul Local Cluj' },
            feeTenantProductPrice: { name: 'Fam 2' },
            status: { name: 'Activ' },
          },
          {
            id: 2,
            firstName: 'Ion',
            lastName: 'Test',
            localCenter: { name: 'Centrul Local Cluj' },
            status: 'Inactiv',
          },
          {
            id: 3,
            fullName: 'Alt Centru',
            localCenter: { name: 'Centrul Local Brașov' },
            feeTenantProductPrice: 'Normală',
          },
        ],
      },
      'Centrul Local Cluj',
    );
    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({
      orgoUserId: 1,
      cardId: 'AT1',
      plan: 'fam2',
      eligible: true,
    });
    expect(members[1]).toMatchObject({
      orgoUserId: 2,
      eligible: false,
    });
  });

  it('rejects an unexpected collection shape instead of treating everyone as missing', () => {
    expect(() =>
      parseOrgoRoster({ unexpected: [] }, 'Centrul Local Cluj'),
    ).toThrow('format neașteptat');
  });
});
