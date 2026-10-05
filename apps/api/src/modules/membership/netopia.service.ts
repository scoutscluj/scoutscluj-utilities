import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
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
  let reason = 'invalid_format';
  try {
    const parts = token
      .trim()
      .replace(/^Bearer\s+/i, '')
      .split('.');
    if (
      parts.length !== 3 ||
      parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
    )
      throw new Error();
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
    reason = 'invalid_signature_or_algorithm';
    const key = createPublicKey(publicKey);
    if (
      !algorithm ||
      key.asymmetricKeyType !== 'rsa' ||
      header.crit !== undefined ||
      !verify(
        algorithm,
        Buffer.from(`${parts[0]}.${parts[1]}`),
        key,
        Buffer.from(parts[2], 'base64url'),
      )
    )
      throw new Error();
    const claims = record(
      JSON.parse(Buffer.from(parts[1], 'base64url').toString()),
    );
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    reason = 'issuer_audience_or_body_mismatch';
    if (
      claims.iss !== 'NETOPIA Payments' ||
      !audiences.includes(pos) ||
      claims.sub !== createHash('sha512').update(raw).digest('base64')
    )
      throw new Error();
    for (const field of ['exp', 'nbf', 'iat']) {
      reason = 'invalid_time_claim';
      if (
        claims[field] !== undefined &&
        (typeof claims[field] !== 'number' || !Number.isFinite(claims[field]))
      )
        throw new Error();
    }
    reason = 'expired_or_not_yet_valid';
    if (typeof claims.exp === 'number' && claims.exp <= now / 1000)
      throw new Error();
    if (typeof claims.nbf === 'number' && claims.nbf > now / 1000)
      throw new Error();
    if (typeof claims.iat === 'number' && claims.iat > now / 1000 + 60)
      throw new Error();
    return record(JSON.parse(raw.toString('utf8')));
  } catch {
    throw new UnauthorizedException({
      message: 'Notificare NETOPIA invalidă.',
      reason,
    });
  }
}

@Injectable()
export class NetopiaService implements PaymentProvider<NetopiaConfiguration> {
  private readonly logger = new Logger(NetopiaService.name);
  constructor(private readonly config: ConfigService) {}

  verify(raw: Buffer, token: string, configuration: NetopiaConfiguration) {
    // These fields are diagnostic only until verification succeeds. Limit logged values.
    let orderId: string | undefined;
    let algorithm = 'unknown';
    try {
      const id = record(record(JSON.parse(raw.toString('utf8'))).order).orderID;
      if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) orderId = id;
      const normalized = token.trim().replace(/^Bearer\s+/i, '');
      const alg = record(
        JSON.parse(
          Buffer.from(normalized.split('.')[0], 'base64url').toString(),
        ),
      ).alg;
      algorithm =
        typeof alg === 'string' && ['RS256', 'RS384', 'RS512'].includes(alg)
          ? alg
          : 'unsupported';
    } catch {
      // Malformed input is rejected by verifyNotification below.
    }
    const publicKey = this.config
      .get<string>('NETOPIA_IPN_PUBLIC_KEY')
      ?.replace(/\\n/g, '\n')
      .trim();
    if (!publicKey) {
      this.logger.error({
        event: 'netopia.ipn',
        timestamp: new Date().toISOString(),
        jwtValid: false,
        orderId,
        algorithm,
        reason: 'missing_ipn_public_key',
      });
      throw new ServiceUnavailableException(
        'NETOPIA_IPN_PUBLIC_KEY nu este configurată.',
      );
    }
    try {
      if (
        !/^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY|CERTIFICATE)-----/.test(
          publicKey,
        ) ||
        createPublicKey(publicKey).asymmetricKeyType !== 'rsa'
      )
        throw new Error();
    } catch {
      this.logger.error({
        event: 'netopia.ipn',
        timestamp: new Date().toISOString(),
        jwtValid: false,
        orderId,
        algorithm,
        reason: 'invalid_ipn_public_key',
      });
      throw new ServiceUnavailableException(
        'NETOPIA_IPN_PUBLIC_KEY trebuie să fie o cheie publică RSA validă.',
      );
    }
    try {
      const body = verifyNotification(
        raw,
        token,
        publicKey,
        configuration.posSignature,
      );
      this.logger.log({
        event: 'netopia.ipn.jwt',
        timestamp: new Date().toISOString(),
        jwtValid: true,
        orderId,
        algorithm,
      });
      return body;
    } catch (error) {
      this.logger.warn({
        event: 'netopia.ipn.jwt',
        timestamp: new Date().toISOString(),
        jwtValid: false,
        orderId,
        algorithm,
        reason:
          error instanceof UnauthorizedException
            ? error.getResponse()
            : 'verification_failed',
      });
      throw error;
    }
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
