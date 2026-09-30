import { BadRequestException } from '@nestjs/common';

export const BASELINE_PLANS = {
  normal: { label: 'Normală', nationalBani: 15000, totalBani: 30000 },
  fam1: { label: 'Fam 1', nationalBani: 15000, totalBani: 30000 },
  fam2: { label: 'Fam 2', nationalBani: 7500, totalBani: 15000 },
  fam3: { label: 'Fam 3', nationalBani: 3750, totalBani: 7500 },
  social: { label: 'Socială', nationalBani: 5000, totalBani: 10000 },
};
export type PlanKey = keyof typeof BASELINE_PLANS;
export type Prices = typeof BASELINE_PLANS;

export function membershipPeriodFor(value: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
    })
      .formatToParts(value)
      .filter((part) => part.type === 'year' || part.type === 'month')
      .map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const startYear = Number(parts.month) >= 9 ? year : year - 1;
  return {
    name: `Cotizație ${startYear}–${startYear + 1}`,
    startsOn: `${startYear}-09-01`,
    endsOn: `${startYear + 1}-08-31`,
  };
}

export function text(value: unknown, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new BadRequestException('Text invalid sau lipsă.');
  }
  return value.trim();
}

export function identifier(value: unknown) {
  const normalized = text(value, 32).toUpperCase();
  if (/^[1-9]\d{0,9}$/.test(normalized)) {
    return { kind: 'orgo_id' as const, value: normalized };
  }
  if (/^[A-Z]{1,8}[0-9]{1,12}$/.test(normalized)) {
    return { kind: 'card_id' as const, value: normalized };
  }
  throw new BadRequestException(
    'Introdu un ID ORGO numeric sau un ID Card (ex. AT36805).',
  );
}

export function bani(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) <= 0 ||
    Number(value) > 100000000
  ) {
    throw new BadRequestException('Suma trebuie să fie pozitivă, în bani.');
  }
  return Number(value);
}

export function plan(value: unknown): PlanKey {
  if (typeof value !== 'string' || !Object.hasOwn(BASELINE_PLANS, value)) {
    throw new BadRequestException('Plan de cotizație necunoscut.');
  }
  return value as PlanKey;
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Date invalide.');
  }
  return value as Record<string, unknown>;
}

export function date(value: unknown): string {
  const result = text(value, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    !Number.isFinite(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  ) {
    throw new BadRequestException('Data trebuie să fie AAAA-LL-ZZ.');
  }
  return result;
}

export function uuid(value: unknown): string {
  const result = text(value, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result,
    )
  ) {
    throw new BadRequestException('Referință invalidă.');
  }
  return result;
}
