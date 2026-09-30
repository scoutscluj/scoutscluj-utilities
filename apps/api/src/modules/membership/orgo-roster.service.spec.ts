jest.mock('../auth/orgo-token.service', () => ({
  OrgoTokenService: class {},
}));

import { ConfigService } from '@nestjs/config';
import { OrgoTokenService } from '../auth/orgo-token.service';
import {
  OrgoRosterService,
  orgoPlan,
  parseOrgoRoster,
} from './orgo-roster.service';

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

  it('uses the configured center ID even when its ORGO name differs', () => {
    expect(
      parseOrgoRoster(
        {
          'hydra:member': [
            {
              id: 36805,
              fullName: 'Test Member',
              localCenter: { id: 8, name: 'Vest' },
              feeTenantProductPrice: { name: 'Normală' },
            },
            {
              id: 2,
              fullName: 'Other Member',
              localCenter: { id: 9, name: 'Centrul Local Cluj' },
              feeTenantProductPrice: { name: 'Fam 3' },
            },
          ],
        },
        'Centrul Local Cluj',
        8,
      ),
    ).toEqual([
      expect.objectContaining({
        orgoUserId: 36805,
        plan: 'normal',
        eligible: true,
      }),
    ]);
  });

  const member = (id: number) => ({
    id,
    fullName: `Member ${id}`,
    localCenter: { id: 8, name: 'Vest' },
    feeTenantProductPrice: { name: 'Normală' },
  });
  const roster = (apiJson: jest.Mock) =>
    new OrgoRosterService(
      { apiJson } as unknown as OrgoTokenService,
      new ConfigService({
        ORGO_LOCAL_CENTER_ID: '8',
        ORGO_OAUTH_BASE_URL: 'https://tenant.example.test',
      }),
    );

  it('follows pagination and includes members beyond the first page', async () => {
    const apiJson = jest
      .fn()
      .mockResolvedValueOnce({
        'hydra:member': [member(1)],
        'hydra:totalItems': 2,
        'hydra:view': { 'hydra:next': '/api/v1/users?localCenter=8&page=2' },
      })
      .mockResolvedValueOnce({
        'hydra:member': [member(36805)],
        'hydra:totalItems': 2,
      });
    expect((await roster(apiJson).members(2)).map((m) => m.orgoUserId)).toEqual(
      [1, 36805],
    );
    expect(apiJson).toHaveBeenLastCalledWith(
      2,
      '/api/v1/users?localCenter=8&page=2',
    );
  });

  it.each([
    'https://untrusted.example/api/v1/users?localCenter=8&page=2',
    '/api/v1/users?localCenter=9&page=2',
    '/api/v1/users?localCenter=8&page=1',
    '/api/v1/other?localCenter=8&page=2',
  ])('rejects unsafe or looping pagination: %s', async (next) => {
    const apiJson = jest.fn().mockResolvedValue({
      'hydra:member': [member(1)],
      'hydra:view': { 'hydra:next': next },
    });
    await expect(roster(apiJson).members(2)).rejects.toThrow('Paginarea');
    expect(apiJson).toHaveBeenCalledTimes(1);
  });

  it('fails before synchronizing if the collection is incomplete', async () => {
    const apiJson = jest.fn().mockResolvedValue({
      'hydra:member': [member(1)],
      'hydra:totalItems': 2,
    });
    await expect(roster(apiJson).members(2)).rejects.toThrow('incomplet');
  });

  it('does not read a national roster with a server token before the center is configured', async () => {
    const apiJson = jest.fn();
    const service = new OrgoRosterService(
      { apiJson } as unknown as OrgoTokenService,
      new ConfigService({ ORGO_API_TOKEN: 'read-only-token' }),
    );
    await expect(service.members(2)).rejects.toThrow('Configurează ID-ul');
    expect(apiJson).not.toHaveBeenCalled();
  });
});
