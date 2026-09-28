import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import type { PaymentProviderName } from './payment-provider';

const context = (provider: PaymentProviderName) => ({
  application: 'scoutscluj-utilities',
  purpose: 'membership-payment-provider',
  provider,
});

@Injectable()
export class PaymentSecretVault {
  private readonly client: KMSClient;

  constructor(private readonly config: ConfigService) {
    this.client = new KMSClient({
      region: this.config.get<string>('AWS_REGION') ?? 'eu-central-1',
    });
  }

  ready() {
    return Boolean(this.config.get<string>('PAYMENT_CONFIG_KMS_KEY_ID'));
  }

  async encrypt(provider: PaymentProviderName, value: unknown) {
    const keyId = this.config.get<string>('PAYMENT_CONFIG_KMS_KEY_ID');
    if (!keyId)
      throw new ServiceUnavailableException(
        'Seiful KMS pentru configurația plăților nu este disponibil.',
      );
    const result = await this.client.send(
      new EncryptCommand({
        KeyId: keyId,
        Plaintext: Buffer.from(JSON.stringify(value), 'utf8'),
        EncryptionContext: context(provider),
      }),
    );
    if (!result.CiphertextBlob)
      throw new ServiceUnavailableException('KMS nu a criptat configurația.');
    return Buffer.from(result.CiphertextBlob).toString('base64');
  }

  async decrypt<T>(provider: PaymentProviderName, ciphertext: string) {
    const result = await this.client.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
        EncryptionContext: context(provider),
      }),
    );
    if (!result.Plaintext)
      throw new ServiceUnavailableException('KMS nu a decriptat configurația.');
    return JSON.parse(Buffer.from(result.Plaintext).toString('utf8')) as T;
  }
}
