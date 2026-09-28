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

  it('requires a NETOPIA verification certificate', () => {
    expect(() =>
      service.parse('netopia', {
        environment: 'sandbox',
        apiKey: 'api-key',
        posSignature: 'pos',
        publicKey: 'not a certificate',
      }),
    ).toThrow('Certificatul public NETOPIA este invalid');
  });

  it('returns only operational metadata to the administrator dashboard', async () => {
    const summary = await service.summaries();
    expect(summary.find((item) => item.id === 'stripe')).toMatchObject({
      ready: true,
      environment: 'test',
      secretHint: '1234',
    });
    expect(JSON.stringify(summary)).not.toContain('must-not-leak');
  });
});
