import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { MembershipPaymentProviderConfig as ProviderConfig } from './entities/membership.entity';
import { PaymentSecretVault } from './payment-secret-vault.service';
import type {
  NetopiaConfiguration,
  PaymentProviderConfiguration,
  PaymentProviderName,
  StripeConfiguration,
} from './payment-provider';
import { record, text } from './membership.rules';

const secret = (value: unknown, maximum = 5000) => {
  const result = text(value, maximum).trim();
  if (!result)
    throw new BadRequestException('Completează toate credențialele.');
  return result;
};

@Injectable()
export class PaymentConfigurationService {
  constructor(
    private readonly em: EntityManager,
    private readonly vault: PaymentSecretVault,
  ) {}

  vaultReady() {
    return this.vault.ready();
  }

  async summaries(em = this.em) {
    const rows = await em.find(ProviderConfig, { active: true });
    return (['netopia', 'stripe'] as const).map((provider) => {
      const row = rows.find((item) => item.provider === provider);
      return {
        id: provider,
        label: provider === 'netopia' ? 'NETOPIA Payments' : 'Stripe',
        ready: Boolean(row),
        environment:
          row?.environment ?? (provider === 'netopia' ? 'sandbox' : 'test'),
        secretHint: row?.secretHint ?? null,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  async getActive<T extends PaymentProviderConfiguration>(
    provider: T['provider'],
    em = this.em,
  ): Promise<T | null> {
    const row = await em.findOne(ProviderConfig, { provider, active: true });
    if (!row) return null;
    return this.vault.decrypt<T>(provider, row.encryptedConfiguration);
  }

  async activeRevision<T extends PaymentProviderConfiguration>(
    provider: T['provider'],
    em = this.em,
  ): Promise<{ id: string; configuration: T } | null> {
    const row = await em.findOne(ProviderConfig, { provider, active: true });
    if (!row) return null;
    return {
      id: row.id,
      configuration: await this.vault.decrypt<T>(
        provider,
        row.encryptedConfiguration,
      ),
    };
  }

  async getRevision<T extends PaymentProviderConfiguration>(
    provider: T['provider'],
    id: string,
    em = this.em,
  ): Promise<T | null> {
    const row = await em.findOne(ProviderConfig, { id, provider });
    if (!row) return null;
    return this.vault.decrypt<T>(provider, row.encryptedConfiguration);
  }

  parse(provider: PaymentProviderName, input: unknown) {
    const body = record(input);
    if (provider === 'stripe') {
      const environment = body.environment;
      if (environment !== 'test' && environment !== 'live')
        throw new BadRequestException('Mediu Stripe invalid.');
      const secretKey = secret(body.secretKey);
      const webhookSecret = secret(body.webhookSecret);
      if (
        !secretKey.startsWith(environment === 'live' ? 'sk_live_' : 'sk_test_')
      )
        throw new BadRequestException(
          'Cheia secretă Stripe nu corespunde mediului.',
        );
      if (!webhookSecret.startsWith('whsec_'))
        throw new BadRequestException('Secretul webhook Stripe este invalid.');
      return {
        provider,
        environment,
        secretKey,
        webhookSecret,
      } satisfies StripeConfiguration;
    }
    const environment = body.environment;
    if (environment !== 'sandbox' && environment !== 'live')
      throw new BadRequestException('Mediu NETOPIA invalid.');
    const publicKey = secret(body.publicKey, 10000).replace(/\\n/g, '\n');
    if (!publicKey.includes('-----BEGIN CERTIFICATE-----'))
      throw new BadRequestException(
        'Certificatul public NETOPIA este invalid.',
      );
    return {
      provider,
      environment,
      apiKey: secret(body.apiKey),
      posSignature: secret(body.posSignature),
      publicKey,
    } satisfies NetopiaConfiguration;
  }

  async encrypt(configuration: PaymentProviderConfiguration) {
    const primarySecret =
      configuration.provider === 'stripe'
        ? configuration.secretKey
        : configuration.apiKey;
    if (Buffer.byteLength(JSON.stringify(configuration), 'utf8') > 3500)
      throw new BadRequestException(
        'Configurația procesatorului depășește dimensiunea acceptată.',
      );
    return {
      ciphertext: await this.vault.encrypt(
        configuration.provider,
        configuration,
      ),
      secretHint: primarySecret.slice(-4).padStart(4, '•'),
    };
  }
}
