jest.mock('@mikro-orm/core', () => ({ EntityManager: class {} }));
jest.mock('../users/entities/orgo-connection.entity', () => ({
  OrgoConnection: 'connection',
}));

import type { EntityManager } from '@mikro-orm/core';
import { ConfigService } from '@nestjs/config';
import { OrgoTokenService, safeOrgoProfile } from './orgo-token.service';

describe('ORGO member API credentials', () => {
  it('keeps credentials and unknown fields out of persisted/returned profiles', () => {
    const raw = {
      id: 36805,
      cardId: 'AT36805',
      access_token: 'secret',
      refresh_token: 'refresh',
      unexpectedSecret: 'hidden',
    };
    expect(safeOrgoProfile(raw)).toEqual({ id: 36805, cardId: 'AT36805' });
  });

  it('encrypts the token, limits its use to member self, and clears revoked tokens', async () => {
    const connection: { apiTokenEncrypted: string | null } = {
      apiTokenEncrypted: null,
    };
    const em = {
      findOne: jest.fn(() => Promise.resolve(connection)),
      flush: jest.fn(() => Promise.resolve(undefined)),
    };
    const service = new OrgoTokenService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
        ORGO_OAUTH_BASE_URL: 'https://tenant.example.test',
      }),
    );
    await service.capture(1, { access_token: 'private-member-token' });
    expect(connection.apiTokenEncrypted).toBeTruthy();
    expect(connection.apiTokenEncrypted).not.toContain('private-member-token');
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 36805 }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    try {
      await expect(service.memberSelf(1)).resolves.toEqual({ id: 36805 });
      expect((fetchMock.mock.calls[0][0] as URL).href).toBe(
        'https://tenant.example.test/api/v1/users/me',
      );
      expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
        Authorization: 'Bearer private-member-token',
      });
      await expect(service.memberSelf(2)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await expect(service.memberSelf(1)).rejects.toThrow(
        'expirat sau revocat',
      );
      expect(connection.apiTokenEncrypted).toBeNull();
    } finally {
      fetchMock.mockRestore();
    }
  });
});
