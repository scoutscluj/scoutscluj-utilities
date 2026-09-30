import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrgoTokenService } from '../auth/orgo-token.service';
import type { PlanKey } from './membership.rules';

export type OrgoRosterMember = {
  orgoUserId: number;
  cardId?: string;
  memberName: string;
  plan?: PlanKey;
  eligible: boolean;
  issue?: string;
};

const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const string = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;
const label = (value: unknown) => {
  if (typeof value === 'string') return value;
  const item = object(value);
  return item
    ? (string(item.label) ??
        string(item.name) ??
        string(item.title) ??
        string(item.fullName))
    : undefined;
};
const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function orgoPlan(value: unknown): PlanKey | undefined {
  const item = object(value);
  const candidate = normalized(
    label(value) ??
      label(item?.productPrice) ??
      label(item?.product) ??
      label(item?.price) ??
      '',
  );
  if (/\bfam(?:ilia)?\s*3\b/.test(candidate)) return 'fam3';
  if (/\bfam(?:ilia)?\s*2\b/.test(candidate)) return 'fam2';
  if (/\bfam(?:ilia)?\s*1\b/.test(candidate)) return 'fam1';
  if (/\bsocial/.test(candidate)) return 'social';
  if (/\bnormal/.test(candidate)) return 'normal';
  return undefined;
}

export function parseOrgoRoster(
  payload: Record<string, unknown>,
  localCenterName: string,
): OrgoRosterMember[] {
  const rawMembers = payload['hydra:member'] ?? payload.member ?? payload.items;
  if (!Array.isArray(rawMembers))
    throw new BadGatewayException(
      'Răspunsul ORGO pentru registrul de membri are un format neașteptat.',
    );
  const expectedCenter = normalized(localCenterName);
  return rawMembers.flatMap((raw) => {
    const item = object(raw);
    const id = Number(item?.id);
    if (!item || !Number.isInteger(id) || id <= 0) return [];
    const center = normalized(label(item.localCenter) ?? '');
    if (!center || center !== expectedCenter) return [];
    const memberName =
      string(item.fullName) ??
      [string(item.firstName), string(item.lastName)].filter(Boolean).join(' ');
    const status = normalized(label(item.status) ?? '');
    const explicitlyInactive =
      item.active === false ||
      item.isActive === false ||
      /inactive|inactiv|deactiv|resign|demision|archiv/.test(status);
    const price =
      item.feeTenantProductPrice ?? item.membershipFeePrice ?? item.feePrice;
    const plan = orgoPlan(price);
    const issue = explicitlyInactive
      ? 'Membrul nu mai este activ în ORGO.'
      : !memberName
        ? 'Numele membrului lipsește din ORGO.'
        : !plan
          ? 'Planul de cotizație lipsește sau nu este recunoscut.'
          : undefined;
    return [
      {
        orgoUserId: id,
        cardId: string(item.cardId)?.toUpperCase(),
        memberName: memberName || `ORGO ${id}`,
        plan,
        eligible: !issue,
        issue,
      },
    ];
  });
}

@Injectable()
export class OrgoRosterService {
  constructor(
    private readonly tokens: OrgoTokenService,
    private readonly config: ConfigService,
  ) {}

  async members(actorId: number) {
    const payload = await this.tokens.apiJson(
      actorId,
      '/api/v1/users?pagination=false',
    );
    return parseOrgoRoster(
      payload,
      this.config.get<string>('ORGO_LOCAL_CENTER_NAME') ?? 'Centrul Local Cluj',
    );
  }
}
