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
  const configuration = {
    provider: 'stripe' as const,
    environment: 'test' as const,
    secretKey: 'sk_test_secret',
    webhookSecret: 'whsec_test',
  };
  const session = {
    id: 'cs_test_123',
    client_reference_id: '11111111-1111-4111-8111-111111111111',
    amount_total: 31000,
    currency: 'ron',
    livemode: false,
    status: 'open',
    payment_status: 'unpaid',
  };

  it('expires only the matching open unpaid session, and accepts an already expired link', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(session) })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...session, status: 'expired' }),
      });
    global.fetch = fetchMock;
    try {
      const service = new StripeService(new ConfigService());
      await service.expireUnpaid(
        session.id,
        session.client_reference_id,
        31000,
        configuration,
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/cs_test_123/expire'),
        expect.objectContaining({ method: 'POST' }),
      );
      await service.expireUnpaid(
        session.id,
        session.client_reference_id,
        31000,
        configuration,
      );
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it.each([
    { status: 'complete', payment_status: 'paid' },
    { status: 'complete', payment_status: 'unpaid' },
    { status: 'expired', payment_status: 'paid' },
    { livemode: true },
    { amount_total: 30000 },
    { client_reference_id: 'another-checkout' },
    { currency: 'eur' },
    { id: 'another-session' },
  ])(
    'never expires or releases a completed or mismatched session: %j',
    async (values) => {
      const originalFetch = global.fetch;
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...session, ...values }),
      });
      global.fetch = fetchMock;
      try {
        await expect(
          new StripeService(new ConfigService()).expireUnpaid(
            session.id,
            session.client_reference_id,
            31000,
            configuration,
          ),
        ).rejects.toThrow();
        expect(fetchMock).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
      }
    },
  );

  it('keeps the attempt protected if payment wins the expiration race or the response is lost', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(session) })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(session) })
      .mockRejectedValueOnce(new Error('timeout'));
    global.fetch = fetchMock;
    try {
      const service = new StripeService(new ConfigService());
      await expect(
        service.expireUnpaid(
          session.id,
          session.client_reference_id,
          31000,
          configuration,
        ),
      ).rejects.toThrow('Stripe nu a confirmat');
      await expect(
        service.expireUnpaid(
          session.id,
          session.client_reference_id,
          31000,
          configuration,
        ),
      ).rejects.toThrow('timeout');
    } finally {
      global.fetch = originalFetch;
    }
  });
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
          amount_total: 31000,
          currency: 'ron',
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
          WEB_ORIGIN: 'https://resurse.example.test',
        }),
      );
      await expect(
        service.start(
          {
            id: '11111111-1111-4111-8111-111111111111',
            amountBani: 31000,
            description: 'Cotizație Centrul Local Cluj',
            beneficiaryName: 'Test M.',
            periodName: '2026–2027',
          },
          {
            provider: 'stripe',
            environment: 'test',
            secretKey: 'sk_test_secret',
            webhookSecret: secret,
          },
        ),
      ).resolves.toEqual({
        providerId: 'cs_test_123',
        paymentUrl: 'https://checkout.stripe.com/c/pay/test',
      });
      const request = fetchMock.mock.calls[0]?.[1];
      if (!request) throw new Error('Stripe request was not made');
      const form = request.body as URLSearchParams;
      expect(form.get('line_items[0][price_data][currency]')).toBe('ron');
      expect(form.has('customer_email')).toBe(false);
      expect(form.get('line_items[0][price_data][unit_amount]')).toBe('31000');
      expect(
        form.get('line_items[0][price_data][product_data][description]'),
      ).toContain('Beneficiar: Test M. · Perioada: 2026–2027');
      expect(form.get('custom_text[submit][message]')).toContain(
        'revino în aplicație',
      );
      expect(form.get('custom_text[after_submit][message]')).toContain(
        'confirmarea Stripe',
      );
      expect(form.get('metadata[checkout_id]')).toBe(
        '11111111-1111-4111-8111-111111111111',
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it.each([
    { amount_total: 30000, currency: 'ron' },
    { amount_total: 31000, currency: 'eur' },
  ])(
    'refuses a redirect when Stripe returns a different total or currency: %j',
    async (values) => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/test',
            ...values,
          }),
      });
      try {
        const service = new StripeService(
          new ConfigService({ WEB_ORIGIN: 'https://resurse.example.test' }),
        );
        await expect(
          service.start(
            {
              id: '11111111-1111-4111-8111-111111111111',
              amountBani: 31000,
              description: 'Cotizație Centrul Local Cluj',
            },
            {
              provider: 'stripe',
              environment: 'test',
              secretKey: 'sk_test_secret',
              webhookSecret: secret,
            },
          ),
        ).rejects.toThrow('Suma sau moneda sesiunii Stripe diferă');
      } finally {
        global.fetch = originalFetch;
      }
    },
  );
});
