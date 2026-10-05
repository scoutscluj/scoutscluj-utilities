import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { NetopiaService, verifyNotification } from './netopia.service';

describe('NETOPIA notification boundary', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const raw = Buffer.from(
    '{"order":{"orderID":"test"},"payment":{"status":3}}',
  );
  const now = 1800000000000;
  const token = (overrides: Record<string, unknown> = {}, alg = 'RS512') => {
    const header = Buffer.from(JSON.stringify({ alg })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: 'NETOPIA Payments',
        aud: 'sandbox-pos',
        sub: createHash('sha512').update(raw).digest('base64'),
        exp: now / 1000 + 60,
        ...overrides,
      }),
    ).toString('base64url');
    const hash =
      { RS256: 'RSA-SHA256', RS384: 'RSA-SHA384', RS512: 'RSA-SHA512' }[alg] ??
      'RSA-SHA256';
    return `${header}.${payload}.${sign(hash, Buffer.from(`${header}.${payload}`), keys.privateKey).toString('base64url')}`;
  };

  it('accepts a signed notification bound to the exact raw body and POS', () => {
    expect(
      verifyNotification(raw, token(), publicKey, 'sandbox-pos', now),
    ).toMatchObject({ payment: { status: 3 } });
  });

  it.each(['RS256', 'RS384', 'RS512'])(
    'accepts only explicitly supported RSA algorithms: %s',
    (alg) => {
      expect(
        verifyNotification(raw, token({}, alg), publicKey, 'sandbox-pos', now),
      ).toMatchObject({ payment: { status: 3 } });
    },
  );

  it('strips Bearer and validates optional time claims', () => {
    expect(
      verifyNotification(
        raw,
        `Bearer ${token({ exp: undefined, nbf: now / 1000 })}`,
        publicKey,
        'sandbox-pos',
        now,
      ),
    ).toMatchObject({ payment: { status: 3 } });
  });

  it.each(['', 'not-a-jwt', 'a.b.c', 'a.b.c.extra'])(
    'rejects a missing or malformed JWT: %s',
    (jwt) => {
      expect(() =>
        verifyNotification(raw, jwt, publicKey, 'sandbox-pos', now),
      ).toThrow('Notificare NETOPIA invalidă');
    },
  );

  it('rejects a JWT signed by a different key and alg none', () => {
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
      .publicKey.export({ type: 'spki', format: 'pem' })
      .toString();
    expect(() =>
      verifyNotification(raw, token(), otherKey, 'sandbox-pos', now),
    ).toThrow();
    expect(() =>
      verifyNotification(raw, token({}, 'none'), publicKey, 'sandbox-pos', now),
    ).toThrow();
  });

  it.each(['', 'broken-key'])(
    'fails closed when the common IPN key is unavailable: %s',
    (key) => {
      const service = new NetopiaService(
        new ConfigService({ NETOPIA_IPN_PUBLIC_KEY: key }),
      );
      expect(() =>
        service.verify(raw, token(), {
          provider: 'netopia',
          environment: 'sandbox',
          apiKey: 'key',
          posSignature: 'sandbox-pos',
          publicKey,
        }),
      ).toThrow('NETOPIA_IPN_PUBLIC_KEY');
    },
  );

  it.each(['sandbox', 'live'] as const)(
    'uses the common IPN key instead of the historical %s payment key',
    (environment) => {
      const service = new NetopiaService(
        new ConfigService({
          NETOPIA_IPN_PUBLIC_KEY: publicKey.replace(/\n/g, '\\n'),
        }),
      );
      expect(
        service.verify(raw, token({ exp: Date.now() / 1000 + 60 }), {
          provider: 'netopia',
          environment,
          apiKey: 'unchanged-api-key',
          posSignature: 'sandbox-pos',
          publicKey: 'obsolete-key',
        }),
      ).toMatchObject({ payment: { status: 3 } });
    },
  );

  it.each([
    { iss: 'another provider' },
    { aud: 'another-pos' },
    { sub: 'wrong-hash' },
    { exp: now / 1000 - 1 },
    { nbf: now / 1000 + 1 },
    { exp: 'tomorrow' },
  ])('rejects invalid claims %j', (claims) => {
    expect(() =>
      verifyNotification(raw, token(claims), publicKey, 'sandbox-pos', now),
    ).toThrow('Notificare NETOPIA invalidă');
  });

  it('rejects changed JSON whitespace, unsigned tokens and algorithm confusion', () => {
    expect(() =>
      verifyNotification(
        Buffer.concat([raw, Buffer.from(' ')]),
        token(),
        publicKey,
        'sandbox-pos',
        now,
      ),
    ).toThrow();
    expect(() =>
      verifyNotification(
        raw,
        token().split('.').slice(0, 2).join('.') + '.',
        publicKey,
        'sandbox-pos',
        now,
      ),
    ).toThrow();
    expect(() =>
      verifyNotification(
        raw,
        token({}, 'HS256'),
        publicKey,
        'sandbox-pos',
        now,
      ),
    ).toThrow();
  });

  it.each([
    ['sandbox', 'secure-sandbox.netopia-payments.com'],
    ['live', 'secure.mobilpay.ro'],
    ['live', 'secure.netopia-payments.com'],
  ] as const)(
    'starts %s payments on %s with environment-specific credentials',
    async (environment, paymentHost) => {
      const mock = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: '101', message: 'Redirect user to payment page' },
            payment: {
              ntpID: '123',
              paymentURL: `https://${paymentHost}/checkout/123`,
            },
          }),
          { status: 200 },
        ),
      );
      try {
        const service = new NetopiaService(
          new ConfigService({
            NETOPIA_IPN_PUBLIC_KEY:
              'invalid-IPN-key-does-not-affect-payment-start',
            PUBLIC_API_BASE_URL: 'https://api.example.test',
            WEB_ORIGIN: 'https://example.test',
          }),
        );
        await expect(
          service.start(
            {
              id: 'order-id',
              amountBani: 7500,
              description: 'Cotizație',
            },
            {
              provider: 'netopia',
              environment,
              apiKey: `${environment}-api-key`,
              posSignature: `${environment}-pos`,
            },
          ),
        ).resolves.toMatchObject({ providerId: '123' });
        const sentBody = mock.mock.calls[0][1]?.body;
        if (typeof sentBody !== 'string')
          throw new Error('Expected JSON request body');
        const body = JSON.parse(sentBody) as {
          order: {
            amount: number;
            currency: string;
            billing: { email: string };
          };
          payment: { instrument: unknown };
        };
        expect(body.order).toMatchObject({
          amount: 75,
          currency: 'RON',
          posSignature: `${environment}-pos`,
        });
        expect(body.order.billing.email).toBe('cluj.napoca@scout.ro');
        expect(body.payment.instrument).toEqual({ type: 'card' });
        expect(mock.mock.calls[0][0]).toBe(
          environment === 'live'
            ? 'https://secure.mobilpay.ro/pay/payment/card/start'
            : 'https://secure.sandbox.netopia-payments.com/payment/card/start',
        );
        expect(mock.mock.calls[0][1]?.headers).toMatchObject({
          Authorization: `${environment}-api-key`,
        });
        expect(sentBody).not.toContain('PUBLIC KEY');
        expect(sentBody).not.toContain('publicKey');
      } finally {
        mock.mockRestore();
      }
    },
  );
});

describe('NETOPIA LIVE hosted page validation', () => {
  const service = new NetopiaService(
    new ConfigService({
      PUBLIC_API_BASE_URL: 'https://api.example.test',
      WEB_ORIGIN: 'https://example.test',
    }),
  );
  const input = { id: 'order-id', amountBani: 30500, description: 'Cotizație' };
  const configuration = {
    provider: 'netopia',
    environment: 'live',
    apiKey: 'secret-api-key',
    posSignature: 'live-pos',
  } as const;

  afterEach(() => jest.restoreAllMocks());

  it.each([
    'https://secure.netopia-payments.com.attacker.test/checkout/secret-token',
    'https://secure-sandbox.netopia-payments.com/checkout/secret-token',
    'http://secure.netopia-payments.com/checkout/secret-token',
    'https://user:secret-password@secure.netopia-payments.com/checkout/secret-token',
  ])(
    'rejects unsafe LIVE redirects and logs only diagnostics: %s',
    async (url) => {
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: '101', message: 'secret-provider-message' },
            payment: { ntpID: '123', paymentURL: url },
          }),
        ),
      );
      const log = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});
      await expect(service.start(input, configuration)).rejects.toThrow(
        'NETOPIA nu a returnat o pagină de plată validă',
      );
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'netopia.start',
          orderId: input.id,
          httpStatus: 200,
          errorCode: '101',
          providerId: '123',
          reason: 'invalid_payment_url',
        }),
      );
      const logged = JSON.stringify(log.mock.calls);
      for (const secret of [
        'secret-token',
        'secret-password',
        'secret-api-key',
        'secret-provider-message',
      ])
        expect(logged).not.toContain(secret);
    },
  );

  it('logs transport failures without credentials or the raw exception', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('secret-api-key'));
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    await expect(service.start(input, configuration)).rejects.toThrow(
      'secret-api-key',
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'netopia.start',
        reason: 'request_failed',
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-api-key');
  });
});
