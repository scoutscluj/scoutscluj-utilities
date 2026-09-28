export type PaymentProviderName = 'netopia' | 'stripe';

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
