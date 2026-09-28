export type PaymentProviderName = 'netopia' | 'stripe';

export type StartPaymentInput = {
  id: string;
  amountBani: number;
  description: string;
  billing: Record<string, string>;
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

export interface PaymentProvider {
  ready(): boolean;
  environment(): string;
  start(input: StartPaymentInput): Promise<StartedPayment>;
}
