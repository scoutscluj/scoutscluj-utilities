import { ConfigService } from '@nestjs/config';
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
  const token = (overrides: Record<string, unknown> = {}, alg = 'RS256') => {
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
    return `${header}.${payload}.${sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), keys.privateKey).toString('base64url')}`;
  };

  it('accepts a signed notification bound to the exact raw body and POS', () => {
    expect(
      verifyNotification(raw, token(), publicKey, 'sandbox-pos', now),
    ).toMatchObject({ payment: { status: 3 } });
  });

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

  it('does not enable live payments or incomplete sandbox configuration', () => {
    expect(
      new NetopiaService(
        new ConfigService({
          MEMBERSHIP_CARD_ENABLED: 'true',
          NETOPIA_ENVIRONMENT: 'live',
        }),
      ).ready(),
    ).toBe(false);
    expect(
      new NetopiaService(
        new ConfigService({ MEMBERSHIP_CARD_ENABLED: 'true' }),
      ).ready(),
    ).toBe(false);
  });

  it('sends only server prices and requests hosted card collection', async () => {
    const mock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          payment: {
            ntpID: '123',
            paymentURL:
              'https://secure.sandbox.netopia-payments.com/checkout/123',
          },
        }),
        { status: 200 },
      ),
    );
    try {
      const service = new NetopiaService(
        new ConfigService({
          MEMBERSHIP_CARD_ENABLED: 'true',
          NETOPIA_ENVIRONMENT: 'sandbox',
          NETOPIA_API_KEY: 'test-key',
          NETOPIA_POS_SIGNATURE: 'sandbox-pos',
          NETOPIA_PUBLIC_KEY: publicKey,
          MEMBERSHIP_API_ORIGIN: 'https://api.example.test',
          MEMBERSHIP_WEB_ORIGIN: 'https://example.test',
        }),
      );
      await expect(
        service.start({
          id: 'order-id',
          amountBani: 7500,
          description: 'Cotizație',
          billing: { email: 'payer@example.test' },
        }),
      ).resolves.toMatchObject({ providerId: '123' });
      const sentBody = mock.mock.calls[0][1]?.body;
      if (typeof sentBody !== 'string')
        throw new Error('Expected JSON request body');
      const body = JSON.parse(sentBody) as {
        order: { amount: number; currency: string };
        payment: { instrument: unknown };
      };
      expect(body.order).toMatchObject({ amount: 75, currency: 'RON' });
      expect(body.payment.instrument).toEqual({ type: 'card' });
    } finally {
      mock.mockRestore();
    }
  });
});
