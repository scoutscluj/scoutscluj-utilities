import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { record, text } from './membership.rules';
import {
  paymentOrigin,
  PaymentNotSubmittedException,
} from './payment-provider';
import type {
  NetopiaConfiguration,
  PaymentProvider,
  StartPaymentInput,
} from './payment-provider';

const CHECKOUT_CONTACT = {
  email: 'cluj.napoca@scout.ro',
  phone: '0749417925',
  firstName: 'Centrul Local',
  lastName: 'Cluj',
  city: 'Cluj-Napoca',
  country: 642,
  state: 'Cluj',
  postalCode: '400613',
  details: 'Cotizatie membru',
};

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
export class NetopiaService implements PaymentProvider<NetopiaConfiguration> {
  constructor(private readonly config: ConfigService) {}

  verify(raw: Buffer, token: string, configuration: NetopiaConfiguration) {
    return verifyNotification(
      raw,
      token,
      configuration.publicKey,
      configuration.posSignature,
    );
  }

  async start(input: StartPaymentInput, configuration: NetopiaConfiguration) {
    const endpoint =
      configuration.environment === 'live'
        ? 'https://secure.mobilpay.ro/pay/payment/card/start'
        : 'https://secure.sandbox.netopia-payments.com/payment/card/start';
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: configuration.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          notifyUrl: new URL(
            '/api/membership/netopia/notify',
            paymentOrigin(this.config, 'api'),
          ).href,
          redirectUrl: new URL(
            '/cotizatie/rezultat',
            paymentOrigin(this.config, 'web'),
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
          posSignature: configuration.posSignature,
          dateTime: new Date().toISOString(),
          description: input.description,
          amount: input.amountBani / 100,
          currency: 'RON',
          billing: CHECKOUT_CONTACT,
          shipping: CHECKOUT_CONTACT,
        },
      }),
    });
    if ([400, 401, 403, 404, 422].includes(response.status))
      throw new PaymentNotSubmittedException(
        'NETOPIA a respins inițierea plății. Verifică configurația procesatorului.',
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
      !(configuration.environment === 'live'
        ? ['secure.mobilpay.ro'].includes(paymentUrl.hostname)
        : [
            'secure.sandbox.netopia-payments.com',
            'sandbox.netopia-payments.com',
            'secure-sandbox.netopia-payments.com',
          ].includes(paymentUrl.hostname))
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
