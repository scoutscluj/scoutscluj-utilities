import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  PaymentProvider,
  StartPaymentInput,
  StripeConfiguration,
  VerifiedPaymentEvent,
} from './payment-provider';
import { record, text, uuid } from './membership.rules';
import {
  paymentOrigin,
  PaymentNotSubmittedException,
} from './payment-provider';

export function verifyStripeNotification(
  raw: Buffer,
  signature: string,
  secret: string,
  live: boolean,
  now = Date.now(),
): VerifiedPaymentEvent {
  try {
    const parts = signature.split(',').map((part) => part.split('='));
    const timestampText = parts.find(([key]) => key === 't')?.[1];
    const signatures = parts
      .filter(([key]) => key === 'v1')
      .map(([, value]) => value);
    if (!timestampText || signatures.length === 0) throw new Error();
    const timestamp = Number(timestampText);
    if (!Number.isInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 300)
      throw new Error();
    const expected = createHmac('sha256', secret)
      .update(`${timestampText}.${raw.toString('utf8')}`)
      .digest();
    if (
      !signatures.some((value) => {
        try {
          const actual = Buffer.from(value, 'hex');
          return (
            actual.length === expected.length &&
            timingSafeEqual(actual, expected)
          );
        } catch {
          return false;
        }
      })
    )
      throw new Error();
    const event = record(JSON.parse(raw.toString('utf8')));
    if (event.livemode !== live) throw new Error();
    const type = text(event.type, 100);
    const object = record(record(event.data).object);
    if (object.object !== 'checkout.session') throw new Error();
    const metadata = record(object.metadata);
    const checkoutId = uuid(metadata.checkout_id ?? object.client_reference_id);
    const providerId = text(object.id, 100);
    const amountBani = object.amount_total;
    if (!Number.isInteger(amountBani) || Number(amountBani) <= 0)
      throw new Error();
    let outcome: VerifiedPaymentEvent['outcome'];
    if (
      [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
      ].includes(type) &&
      object.payment_status === 'paid'
    )
      outcome = 'succeeded';
    else if (
      [
        'checkout.session.expired',
        'checkout.session.async_payment_failed',
      ].includes(type)
    )
      outcome = 'failed';
    else outcome = 'pending';
    const status =
      typeof object.payment_status === 'string'
        ? object.payment_status
        : typeof object.status === 'string'
          ? object.status
          : '';
    return {
      checkoutId,
      providerId,
      providerStatus: `${type}:${status}`,
      amountBani: Number(amountBani),
      currency: text(object.currency, 10).toUpperCase(),
      outcome,
    };
  } catch {
    throw new UnauthorizedException('Notificare Stripe invalidă.');
  }
}

@Injectable()
export class StripeService implements PaymentProvider<StripeConfiguration> {
  constructor(private readonly config: ConfigService) {}

  verify(raw: Buffer, signature: string, configuration: StripeConfiguration) {
    return verifyStripeNotification(
      raw,
      signature,
      configuration.webhookSecret,
      configuration.environment === 'live',
    );
  }

  async start(input: StartPaymentInput, configuration: StripeConfiguration) {
    const origin = paymentOrigin(this.config, 'web');
    const body = new URLSearchParams({
      mode: 'payment',
      success_url: new URL('/cotizatie/rezultat', origin).href,
      cancel_url: new URL('/cotizatie', origin).href,
      client_reference_id: input.id,
      'metadata[checkout_id]': input.id,
      'payment_intent_data[metadata][checkout_id]': input.id,
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': 'ron',
      'line_items[0][price_data][unit_amount]': String(input.amountBani),
      'line_items[0][price_data][product_data][name]': input.description,
      'line_items[0][quantity]': '1',
      locale: 'ro',
      'custom_text[submit][message]':
        'Cotizație pentru Centrul Local Cluj. După plată, revino în aplicație pentru confirmare și situația cotizației. Pentru ajutor: cluj.napoca@scout.ro.',
    });
    const details = [
      input.beneficiaryName ? `Beneficiar: ${input.beneficiaryName}` : '',
      input.periodName ? `Perioada: ${input.periodName}` : '',
      'Plată unică a cotizației pentru Centrul Local Cluj.',
    ]
      .filter(Boolean)
      .join(' · ');
    body.set('line_items[0][price_data][product_data][description]', details);
    body.set(
      'payment_intent_data[description]',
      `${input.description} · ${details}`,
    );
    body.set(
      'custom_text[after_submit][message]',
      'Plata este înregistrată pentru beneficiarul și perioada indicate. Confirmarea și alocarea la cotizație se afișează în aplicație după confirmarea Stripe.',
    );
    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${configuration.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': input.id,
        },
        body,
      },
    );
    if ([400, 401, 403, 404, 422].includes(response.status))
      throw new PaymentNotSubmittedException(
        'Stripe a respins inițierea plății. Verifică configurația procesatorului.',
      );
    if (!response.ok)
      throw new BadGatewayException('Stripe nu a confirmat inițierea plății.');
    const payload = record(await response.json());
    if (payload.amount_total !== input.amountBani || payload.currency !== 'ron')
      throw new BadGatewayException(
        'Suma sau moneda sesiunii Stripe diferă de cotizația confirmată. Plata necesită verificare înainte de continuare.',
      );
    const paymentUrl = new URL(text(payload.url, 4000));
    if (
      paymentUrl.protocol !== 'https:' ||
      paymentUrl.username ||
      paymentUrl.password ||
      paymentUrl.hostname !== 'checkout.stripe.com'
    )
      throw new BadGatewayException(
        'Stripe nu a returnat o pagină de plată validă.',
      );
    return {
      providerId: text(payload.id, 100),
      paymentUrl: paymentUrl.href,
    };
  }
}
