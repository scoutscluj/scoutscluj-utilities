type CommandLike = { input: Record<string, unknown> };
const kmsSend = jest.fn<Promise<Record<string, unknown>>, [CommandLike]>();

jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn(() => ({ send: kmsSend })),
  EncryptCommand: class EncryptCommand {
    constructor(public readonly input: Record<string, unknown>) {}
  },
  DecryptCommand: class DecryptCommand {
    constructor(public readonly input: Record<string, unknown>) {}
  },
}));

import { ConfigService } from '@nestjs/config';
import { PaymentSecretVault } from './payment-secret-vault.service';

describe('payment secret KMS vault', () => {
  beforeEach(() => kmsSend.mockReset());

  it('binds encrypted provider data to the application and provider context', async () => {
    kmsSend.mockResolvedValueOnce({
      CiphertextBlob: Buffer.from('ciphertext'),
    });
    const vault = new PaymentSecretVault(
      new ConfigService({
        AWS_REGION: 'eu-central-1',
        PAYMENT_CONFIG_KMS_KEY_ID: 'alias/payment-test',
      }),
    );
    await expect(
      vault.encrypt('stripe', { secretKey: 'sk_test_secret' }),
    ).resolves.toBe(Buffer.from('ciphertext').toString('base64'));
    expect(kmsSend.mock.calls[0]?.[0].input).toMatchObject({
      KeyId: 'alias/payment-test',
      EncryptionContext: {
        application: 'scoutscluj-utilities',
        purpose: 'membership-payment-provider',
        provider: 'stripe',
      },
    });
  });

  it('decrypts only with the matching provider context', async () => {
    kmsSend.mockResolvedValueOnce({
      Plaintext: Buffer.from('{"provider":"netopia"}'),
    });
    const vault = new PaymentSecretVault(
      new ConfigService({ PAYMENT_CONFIG_KMS_KEY_ID: 'alias/payment-test' }),
    );
    await expect(
      vault.decrypt('netopia', Buffer.from('ciphertext').toString('base64')),
    ).resolves.toEqual({ provider: 'netopia' });
    expect(kmsSend.mock.calls[0]?.[0].input).toMatchObject({
      EncryptionContext: { provider: 'netopia' },
    });
  });

  it('refuses to encrypt when the non-exportable KMS root is unavailable', async () => {
    const vault = new PaymentSecretVault(new ConfigService());
    await expect(vault.encrypt('stripe', {})).rejects.toThrow('KMS');
    expect(kmsSend).not.toHaveBeenCalled();
  });
});
