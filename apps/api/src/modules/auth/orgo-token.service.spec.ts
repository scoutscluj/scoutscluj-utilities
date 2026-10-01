jest.mock('@mikro-orm/core', () => ({ EntityManager: class {} }));
jest.mock('../users/entities/orgo-connection.entity', () => ({
  OrgoConnection: 'connection',
}));

import type { EntityManager } from '@mikro-orm/core';
import { ConfigService } from '@nestjs/config';
import { OrgoTokenService, safeOrgoProfile } from './orgo-token.service';

describe('ORGO member API credentials', () => {
  it('captures delegated credentials securely using a separate key derived from the production session secret', async () => {
    const connection = { apiTokenEncrypted: null as string | null };
    const em = {
      findOne: () => Promise.resolve(connection),
      flush: () => Promise.resolve(),
    };
    const config = new ConfigService({
      AUTH_SESSION_SECRET: 'session-secret-'.repeat(5),
      ORGO_OAUTH_BASE_URL: 'https://tenant.example.test',
    });
    const service = new OrgoTokenService(
      em as unknown as EntityManager,
      config,
    );
    await service.capture(1, { access_token: 'delegated-token' });
    expect(connection.apiTokenEncrypted).not.toContain('delegated-token');
    await expect(service.administrativeReady(1)).resolves.toBe(true);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    try {
      await service.administrativeJson(1, '/api/v1/users/123');
      expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
        Authorization: 'Bearer delegated-token',
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('uses only the financial actor OAuth token for national operations, even when a server token exists', async () => {
    const connection = { apiTokenEncrypted: null as string | null };
    const em = {
      findOne: jest.fn((_entity: unknown, where: { user: number }) =>
        Promise.resolve(where.user === 1 ? connection : null),
      ),
      flush: jest.fn(() => Promise.resolve()),
    };
    const service = new OrgoTokenService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
        ORGO_OAUTH_BASE_URL: 'https://tenant.example.test',
        ORGO_API_TOKEN: 'server-token',
      }),
    );
    await service.capture(1, { access_token: 'financial-user-token' });
    await expect(service.administrativeReady(1)).resolves.toBe(true);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    try {
      await expect(
        service.administrativeJson(2, '/api/v1/fee_payments', {}),
      ).rejects.toThrow();
      for (const path of [
        'https://foreign.example/api/v1/fee_payments',
        '/other',
        'http://tenant.example.test/api/v1/users',
      ])
        await expect(service.administrativeJson(1, path, {})).rejects.toThrow(
          'invalidă',
        );
      expect(fetchMock).not.toHaveBeenCalled();
      await service.administrativeJson(1, '/api/v1/fee_payments', {
        markAsPaid: true,
      });
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        headers: { Authorization: 'Bearer financial-user-token' },
        redirect: 'error',
      });
      await expect(
        service.administrativeJson(1, '/api/v1/users/123'),
      ).rejects.toThrow('refuzat');
      expect(connection.apiTokenEncrypted).toBeNull();
      await expect(service.administrativeReady(1)).resolves.toBe(false);
    } finally {
      fetchMock.mockRestore();
    }
  });

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

  it('prefers the server API token for administrative API calls', async () => {
    const em = {
      findOne: jest.fn(),
      flush: jest.fn(),
    };
    const service = new OrgoTokenService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_OAUTH_BASE_URL: 'https://tenant.example.test',
        ORGO_API_TOKEN: 'server-token',
      }),
    );
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ 'hydra:member': [] }), { status: 200 }),
      );
    try {
      await expect(service.apiJson(1, '/api/v1/users')).resolves.toEqual({
        'hydra:member': [],
      });
      expect(em.findOne).not.toHaveBeenCalled();
      expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
        'Api-Token': 'server-token',
      });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
