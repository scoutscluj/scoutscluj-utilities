import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrgoTokenService,
  OrgoRequestRejectedException,
} from '../auth/orgo-token.service';

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Răspuns ORGO neașteptat.');
  return value as Record<string, unknown>;
};
const resourceId = (value: unknown): string => {
  const id =
    typeof value === 'object' && value
      ? object(value).id
      : typeof value === 'string'
        ? value.split('/').pop()
        : value;
  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    !/^[a-zA-Z0-9-]+$/.test(String(id))
  )
    throw new Error('Identificator ORGO lipsă sau invalid.');
  return String(id);
};
export type NationalTarget = {
  orgoUserId: number;
  startsOn: string;
  endsOn: string;
  amountBani: number;
};
export type NationalResult = {
  state: 'synced' | 'pending_approval' | 'failed' | 'unknown';
  message: string;
};

@Injectable()
export class OrgoNationalService {
  constructor(
    private readonly tokens: OrgoTokenService,
    private readonly config: ConfigService,
  ) {}

  async synchronize(
    actorId: number,
    target: NationalTarget,
    allowCreate: boolean,
  ): Promise<NationalResult> {
    let submitted = false;
    try {
      const member = object(
        await this.tokens.administrativeJson(
          actorId,
          `/api/v1/users/${target.orgoUserId}`,
        ),
      );
      if (Number(member.id) !== target.orgoUserId)
        throw new Error('Membrul ORGO nu corespunde.');
      const center = object(member.localCenter);
      const expectedId = this.config
        .get<string>('ORGO_LOCAL_CENTER_ID')
        ?.trim();
      const expectedName =
        this.config.get<string>('ORGO_LOCAL_CENTER_NAME') ||
        'Centrul Local Cluj';
      if (
        expectedId
          ? String(center.id) !== expectedId
          : String(center.name).trim().toLocaleLowerCase() !==
            expectedName.trim().toLocaleLowerCase()
      )
        throw new Error('Membrul nu aparține centrului local configurat.');
      const base = new URL(
        this.config.getOrThrow<string>('ORGO_OAUTH_BASE_URL'),
      );
      const payload = object(
        await this.tokens.administrativeJson(
          actorId,
          `/api/v1/tenants?appHost=${encodeURIComponent(base.hostname)}`,
        ),
      );
      const tenants = payload['hydra:member'];
      if (!Array.isArray(tenants) || tenants.length !== 1)
        throw new Error(
          'Organizația ORGO nu poate fi identificată fără ambiguitate.',
        );
      const fees = object(object(object(tenants[0]).settingFeatures).fees);
      const product = object(
        await this.tokens.administrativeJson(
          actorId,
          `/api/v1/products/${resourceId(fees.productUuid)}`,
        ),
      );
      const productId = resourceId(product);
      const price = object(member.feeTenantProductPrice);
      const intervalId = `${target.startsOn}_${target.endsOn}`;
      const historyPath = `/api/v1/fee-history/tenant/${productId}?uid=${target.orgoUserId}`;
      const readPeriod = async () => {
        const history = await this.tokens.administrativeJson(
          actorId,
          historyPath,
        );
        if (!Array.isArray(history))
          throw new Error(
            'Istoricul cotizației ORGO are un format neașteptat.',
          );
        const periods = history
          .map(object)
          .filter((p) => p.intervalId === intervalId);
        if (periods.length !== 1)
          throw new Error(
            'Perioada din Resurse nu corespunde unei perioade unice în ORGO.',
          );
        return periods[0];
      };
      const result = (
        period: Record<string, unknown>,
      ): NationalResult | null => {
        if (
          period.status === 'paid' &&
          !period.isPending &&
          Number.isFinite(Number(period.unpaid)) &&
          Number(period.unpaid) === 0 &&
          Math.round(Number(period.paid) * 100) >= target.amountBani
        )
          return {
            state: 'synced',
            message: `Cotizație ORGO confirmată pentru ${target.startsOn}–${target.endsOn}.`,
          };
        if (period.status === 'pending' || period.isPending)
          return {
            state: 'pending_approval',
            message:
              'Înregistrarea există în ORGO și așteaptă aprobarea organizației naționale.',
          };
        return null;
      };
      const period = await readPeriod();
      const existing = result(period);
      if (existing) return existing;
      if (!allowCreate)
        return {
          state: 'unknown',
          message:
            'Plata nu este încă confirmată în ORGO. Verifică istoricul înainte de o nouă trimitere.',
        };
      if (
        period.exempt ||
        period.status === 'refunded' ||
        Number(period.paid) > 0 ||
        !Number.isFinite(Number(period.unpaid)) ||
        Math.round(Number(period.unpaid) * 100) !== target.amountBani ||
        price.currency !== 'RON'
      )
        throw new Error(
          'Suma sau situația perioadei ORGO nu corespunde transferului național. Verifică manual.',
        );
      submitted = true;
      await this.tokens.administrativeJson(actorId, '/api/v1/fee_payments', {
        userId: target.orgoUserId,
        fees: {
          [`${target.orgoUserId}:${intervalId}`]: target.amountBani / 100,
        },
        type: 'tenant',
        method: 'check',
        markAsPaid: true,
        productPriceId:
          typeof price.id === 'number' ? price.id : resourceId(price),
        productId: resourceId(fees.productUuid),
      });
      return (
        result(await readPeriod()) ?? {
          state: 'unknown',
          message:
            'ORGO a primit cererea, dar confirmarea perioadei nu este încă disponibilă. Verifică în ORGO.',
        }
      );
    } catch (error) {
      return {
        state:
          submitted && !(error instanceof OrgoRequestRejectedException)
            ? 'unknown'
            : 'failed',
        message:
          error instanceof Error &&
          !(error instanceof ServiceUnavailableException)
            ? error.message
            : error instanceof ServiceUnavailableException
              ? error.message
              : 'Sincronizarea ORGO nu este disponibilă.',
      };
    }
  }
}
