jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/membership.entity', () => ({
  MembershipPaymentProviderConfig: 'provider-config',
}));

import type { EntityManager } from '@mikro-orm/postgresql';
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

  it.each(['sandbox', 'live'])(
    'stores only %s payment credentials, ignoring legacy publicKey',
    (environment) => {
      const configuration = service.parse('netopia', {
        environment,
        apiKey: 'unchanged-api-key',
        posSignature: 'pos',
        publicKey: 'obsolete-key',
      });
      expect(configuration).toEqual({
        provider: 'netopia',
        environment,
        apiKey: 'unchanged-api-key',
        posSignature: 'pos',
      });
      expect(
        service.parse('netopia', {
          environment,
          apiKey: 'api-key',
          posSignature: 'pos',
        }),
      ).not.toHaveProperty('publicKey');
    },
  );

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
