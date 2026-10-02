jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/membership.entity', () => ({
  MembershipPaymentProviderConfig: 'provider-config',
}));

import type { EntityManager } from '@mikro-orm/postgresql';
import { generateKeyPairSync } from 'node:crypto';
import { PaymentConfigurationService } from './payment-configuration.service';
import type { PaymentSecretVault } from './payment-secret-vault.service';

describe('administrator-managed payment configuration', () => {
  const vault = {
    ready: () => true,
    encrypt: jest.fn(() => Promise.resolve('encrypted-value')),
    decrypt: jest.fn(),
  };
  const em = {
    find: jest.fn(() =>
      Promise.resolve([
        {
          provider: 'stripe',
          environment: 'test',
          encryptedConfiguration: 'must-not-leak',
          secretHint: '1234',
          updatedAt: new Date('2026-09-28T10:00:00Z'),
        },
      ]),
    ),
  };
  const service = new PaymentConfigurationService(
    em as unknown as EntityManager,
    vault as unknown as PaymentSecretVault,
  );

  it('validates environment-specific Stripe credentials before encryption', async () => {
    expect(() =>
      service.parse('stripe', {
        environment: 'live',
        secretKey: 'sk_test_wrong_environment',
        webhookSecret: 'whsec_test',
      }),
    ).toThrow('nu corespunde mediului');
    const configuration = service.parse('stripe', {
      environment: 'test',
      secretKey: 'sk_test_1234',
      webhookSecret: 'whsec_5678',
    });
    await expect(service.encrypt(configuration)).resolves.toEqual({
      ciphertext: 'encrypted-value',
      secretHint: '1234',
    });
    expect(vault.encrypt).toHaveBeenCalledWith('stripe', configuration);
  });

  it('requires a valid NETOPIA verification public key', () => {
    expect(() =>
      service.parse('netopia', {
        environment: 'sandbox',
        apiKey: 'api-key',
        posSignature: 'pos',
        publicKey: 'not a certificate',
      }),
    ).toThrow('Cheia publică NETOPIA este invalidă');
  });

  it('accepts actual RSA verification public keys in SPKI and PKCS1 formats', () => {
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    for (const type of ['spki', 'pkcs1'] as const) {
      const publicKey = keys.publicKey
        .export({ format: 'pem', type })
        .toString();
      expect(
        service.parse('netopia', {
          environment: 'sandbox',
          apiKey: 'api-key',
          posSignature: 'pos',
          publicKey,
        }),
      ).toMatchObject({ publicKey: publicKey.trim() });
      expect(
        service.parse('netopia', {
          environment: 'live',
          apiKey: 'api-key',
          posSignature: 'pos',
          publicKey: publicKey.replace(/\n/g, '\\n'),
        }),
      ).toMatchObject({ publicKey: publicKey.trim() });
    }
  });

  it('rejects private keys, broken PEM and non-RSA keys before saving', () => {
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    for (const publicKey of [
      keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
      '-----BEGIN CERTIFICATE-----\nbroken\n-----END CERTIFICATE-----',
      ec.publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    ])
      expect(() =>
        service.parse('netopia', {
          environment: 'sandbox',
          apiKey: 'api-key',
          posSignature: 'pos',
          publicKey,
        }),
      ).toThrow('Cheia publică NETOPIA este invalidă');
  });

  it('returns only operational metadata to the administrator dashboard', async () => {
    const summary = await service.summaries();
    expect(
      summary.find(
        (item) => item.id === 'stripe' && item.environment === 'test',
      ),
    ).toMatchObject({
      ready: true,
      environment: 'test',
      secretHint: '1234',
    });
    expect(summary).toHaveLength(4);
    expect(summary.map((item) => item.targetId)).toEqual([
      'netopia:sandbox',
      'netopia:live',
      'stripe:test',
      'stripe:live',
    ]);
    expect(JSON.stringify(summary)).not.toContain('must-not-leak');
  });
});
