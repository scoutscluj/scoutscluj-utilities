import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { record, text } from './membership.rules';
import type { PaymentProvider, StartPaymentInput } from './payment-provider';

export function verifyNotification(
  raw: Buffer,
  token: string,
  publicKey: string,
  pos: string,
  now = Date.now(),
) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error();
    const header = record(
      JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
    );
    const algorithms: Record<string, string> = {
      RS256: 'RSA-SHA256',
      RS384: 'RSA-SHA384',
      RS512: 'RSA-SHA512',
    };
    const algorithm =
      typeof header.alg === 'string' ? algorithms[header.alg] : undefined;
    if (
      !algorithm ||
      !verify(
        algorithm,
        Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey(publicKey),
        Buffer.from(parts[2], 'base64url'),
      )
    )
      throw new Error();
    const claims = record(
      JSON.parse(Buffer.from(parts[1], 'base64url').toString()),
    );
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      claims.iss !== 'NETOPIA Payments' ||
      !audiences.includes(pos) ||
      claims.sub !== createHash('sha512').update(raw).digest('base64')
    )
      throw new Error();
    for (const field of ['exp', 'nbf', 'iat']) {
      if (claims[field] !== undefined && typeof claims[field] !== 'number')
        throw new Error();
    }
    if (typeof claims.exp === 'number' && claims.exp <= now / 1000)
      throw new Error();
    if (typeof claims.nbf === 'number' && claims.nbf > now / 1000)
      throw new Error();
    if (typeof claims.iat === 'number' && claims.iat > now / 1000 + 60)
      throw new Error();
    return record(JSON.parse(raw.toString('utf8')));
  } catch {
    throw new UnauthorizedException('Notificare NETOPIA invalidă.');
  }
}

@Injectable()
export class NetopiaService implements PaymentProvider {
  constructor(private readonly config: ConfigService) {}

  environment() {
    return this.config.get<string>('NETOPIA_ENVIRONMENT') ?? 'sandbox';
  }

  ready() {
    return (
      this.config.get<string>('MEMBERSHIP_CARD_ENABLED') === 'true' &&
      this.environment() === 'sandbox' &&
      [
        'NETOPIA_API_KEY',
        'NETOPIA_POS_SIGNATURE',
        'NETOPIA_PUBLIC_KEY',
        'MEMBERSHIP_API_ORIGIN',
        'MEMBERSHIP_WEB_ORIGIN',
      ].every((key) => Boolean(this.config.get<string>(key)))
    );
  }

  verify(raw: Buffer, token: string) {
    return verifyNotification(
      raw,
      token,
      this.config
        .getOrThrow<string>('NETOPIA_PUBLIC_KEY')
        .replace(/\\n/g, '\n'),
      this.config.getOrThrow<string>('NETOPIA_POS_SIGNATURE'),
    );
  }

  async start(input: StartPaymentInput) {
    if (!this.ready())
      throw new ServiceUnavailableException(
        'Plata cu cardul nu este încă activată pentru testare.',
      );
    const response = await fetch(
      'https://secure.sandbox.netopia-payments.com/payment/card/start',
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: this.config.getOrThrow<string>('NETOPIA_API_KEY'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            notifyUrl: new URL(
              '/api/membership/netopia/notify',
              this.config.getOrThrow<string>('MEMBERSHIP_API_ORIGIN'),
            ).href,
            redirectUrl: new URL(
              '/cotizatie/rezultat',
              this.config.getOrThrow<string>('MEMBERSHIP_WEB_ORIGIN'),
            ).href,
            language: 'ro',
            emailTemplate: '',
          },
          payment: {
            options: { installments: 0, bonus: 0 },
            instrument: { type: 'card' },
          },
          order: {
            orderID: input.id,
            posSignature: this.config.getOrThrow<string>(
              'NETOPIA_POS_SIGNATURE',
            ),
            dateTime: new Date().toISOString(),
            description: input.description,
            amount: input.amountBani / 100,
            currency: 'RON',
            billing: { ...input.billing, country: 642 },
            shipping: { ...input.billing, country: 642 },
          },
        }),
      },
    );
    if (!response.ok)
      throw new BadGatewayException('NETOPIA nu a confirmat inițierea plății.');
    const payload = record(await response.json());
    const payment = record(payload.payment);
    const paymentUrl = new URL(text(payment.paymentURL, 4000));
    if (
      paymentUrl.protocol !== 'https:' ||
      paymentUrl.username ||
      paymentUrl.password ||
      ![
        'secure.sandbox.netopia-payments.com',
        'sandbox.netopia-payments.com',
      ].includes(paymentUrl.hostname)
    ) {
      throw new BadGatewayException(
        'NETOPIA nu a returnat o pagină de plată validă.',
      );
    }
    return {
      providerId: text(payment.ntpID, 100),
      paymentUrl: paymentUrl.href,
    };
  }
}
