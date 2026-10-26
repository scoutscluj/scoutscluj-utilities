import type { PlanKey } from './membership.rules';

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
