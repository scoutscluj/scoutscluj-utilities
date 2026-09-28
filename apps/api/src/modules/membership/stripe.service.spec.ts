import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { StripeService, verifyStripeNotification } from './stripe.service';

const signed = (raw: Buffer, secret: string, timestamp: number) => {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${raw.toString('utf8')}`)
    .digest('hex');
  return `t=${timestamp},v1=${digest}`;
};

describe('Stripe payment boundary', () => {
  const secret = 'whsec_test';
  const now = Date.UTC(2026, 8, 28, 8, 0, 0);
  const raw = Buffer.from(
    JSON.stringify({
      id: 'evt_123',
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          object: 'checkout.session',
          id: 'cs_test_123',
          client_reference_id: '11111111-1111-4111-8111-111111111111',
          metadata: {
            checkout_id: '11111111-1111-4111-8111-111111111111',
          },
          amount_total: 30000,
          currency: 'ron',
          payment_status: 'paid',
        },
      },
    }),
  );

  it('verifies the raw body, timestamp, mode and checkout values', () => {
    expect(
      verifyStripeNotification(
        raw,
        signed(raw, secret, now / 1000),
        secret,
        false,
        now,
      ),
    ).toEqual({
      checkoutId: '11111111-1111-4111-8111-111111111111',
      providerId: 'cs_test_123',
      providerStatus: 'checkout.session.completed:paid',
      amountBani: 30000,
      currency: 'RON',
      outcome: 'succeeded',
    });
  });

  it('rejects tampered, stale and wrong-environment events', () => {
    const signature = signed(raw, secret, now / 1000);
    expect(() =>
      verifyStripeNotification(
        Buffer.concat([raw, Buffer.from(' ')]),
        signature,
        secret,
        false,
        now,
      ),
    ).toThrow('Notificare Stripe invalidă');
    expect(() =>
      verifyStripeNotification(raw, signature, secret, false, now + 301000),
    ).toThrow('Notificare Stripe invalidă');
    expect(() =>
      verifyStripeNotification(raw, signature, secret, true, now),
    ).toThrow('Notificare Stripe invalidă');
  });

  it('creates a hosted RON Checkout Session without trusting browser prices', async () => {
    const originalFetch = global.fetch;
    const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/test',
        }),
    } as Response);
    global.fetch = fetchMock;
    try {
      const service = new StripeService(
        new ConfigService({
          MEMBERSHIP_CARD_ENABLED: 'true',
          STRIPE_ENVIRONMENT: 'test',
          STRIPE_SECRET_KEY: 'sk_test_secret',
          STRIPE_WEBHOOK_SECRET: secret,
          MEMBERSHIP_WEB_ORIGIN: 'https://resurse.example.test',
        }),
      );
      await expect(
        service.start({
          id: '11111111-1111-4111-8111-111111111111',
          amountBani: 30000,
          description: 'Cotizație Centrul Local Cluj',
          billing: { email: 'payer@example.test' },
        }),
      ).resolves.toEqual({
        providerId: 'cs_test_123',
        paymentUrl: 'https://checkout.stripe.com/c/pay/test',
      });
      const request = fetchMock.mock.calls[0]?.[1];
      if (!request) throw new Error('Stripe request was not made');
      const form = request.body as URLSearchParams;
      expect(form.get('line_items[0][price_data][currency]')).toBe('ron');
      expect(form.get('line_items[0][price_data][unit_amount]')).toBe('30000');
      expect(form.get('metadata[checkout_id]')).toBe(
        '11111111-1111-4111-8111-111111111111',
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
