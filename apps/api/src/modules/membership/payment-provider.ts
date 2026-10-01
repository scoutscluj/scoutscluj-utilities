export type PaymentProviderName = 'netopia' | 'stripe';
export type PaymentEnvironment = 'sandbox' | 'test' | 'live';

export type NetopiaConfiguration = {
  provider: 'netopia';
  environment: 'sandbox' | 'live';
  apiKey: string;
  posSignature: string;
  publicKey: string;
};

export type StripeConfiguration = {
  provider: 'stripe';
  environment: 'test' | 'live';
  secretKey: string;
  webhookSecret: string;
};

export type PaymentProviderConfiguration =
  | NetopiaConfiguration
  | StripeConfiguration;

export type StartPaymentInput = {
  id: string;
  amountBani: number;
  description: string;
  beneficiaryName?: string;
  periodName?: string;
};

export type StartedPayment = {
  providerId: string;
  paymentUrl: string;
};

export type VerifiedPaymentEvent = {
  checkoutId: string;
  providerId: string;
  providerStatus: string;
  amountBani: number;
  currency: string;
  outcome: 'succeeded' | 'failed' | 'review' | 'pending';
};

export interface PaymentProvider<T extends PaymentProviderConfiguration> {
  start(input: StartPaymentInput, configuration: T): Promise<StartedPayment>;
}
import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

// Only use when it is certain no payment was submitted/accepted.
export class PaymentNotSubmittedException extends ServiceUnavailableException {}

export function paymentOrigin(config: ConfigService, kind: 'web' | 'api') {
  const value =
    config.get<string>(
      kind === 'web' ? 'MEMBERSHIP_WEB_ORIGIN' : 'MEMBERSHIP_API_ORIGIN',
    ) ||
    config.get<string>(kind === 'web' ? 'WEB_ORIGIN' : 'PUBLIC_API_BASE_URL') ||
    config.get<string>('WEB_ORIGIN');
  try {
    const url = new URL(value ?? '');
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new PaymentNotSubmittedException(
      'Adresa aplicației pentru plăți nu este configurată. Contactează administratorul.',
    );
  }
}
