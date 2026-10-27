import { Injectable } from '@nestjs/common';
import type { PaymentProviderName } from './payment-provider';

export type PaymentCallbackHandler = (
  provider: PaymentProviderName,
  raw: Buffer,
  signature: string,
) => Promise<boolean>;

// Additional payment domains register ownership checks. Each owner verifies the
// signature against the immutable credential revision before applying an event.
@Injectable()
export class PaymentCallbacksService {
  private readonly handlers = new Set<PaymentCallbackHandler>();
  register(handler: PaymentCallbackHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  async dispatch(
    provider: PaymentProviderName,
    raw: Buffer,
    signature: string,
  ) {
    for (const handler of this.handlers)
      if (await handler(provider, raw, signature)) return true;
    return false;
  }
}
