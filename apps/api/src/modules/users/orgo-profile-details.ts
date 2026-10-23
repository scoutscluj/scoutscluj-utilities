import type { OrgoProfileDetails } from './users.types';

const text = (value: unknown) =>
  typeof value === 'string' ? value.trim() || undefined : undefined;

const calendarDate = (value: unknown): string | undefined => {
  const raw =
    value && typeof value === 'object' && 'date' in value ? value.date : value;
  if (typeof raw !== 'string') return undefined;
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:$|[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$)/.exec(
      raw,
    );
  if (!match || match[1].startsWith('0000')) return undefined;
  const date = new Date(`${match[1]}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === match[1]
    ? match[1]
    : undefined;
};

export const profileImageUrl = (value: unknown): string | undefined => {
  const url = text(value);
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
};

// Only expose the personal fields needed by the current user's profile page.
export const orgoProfileDetails = (
  profile: Record<string, unknown> | null | undefined,
): OrgoProfileDetails => ({
  email: text(profile?.email),
  status: text(profile?.status),
  dateOfBirth: calendarDate(profile?.dateOfBirth),
  dateJoined: calendarDate(profile?.dateJoined),
  feeValidUntilDate: calendarDate(profile?.feeValidUntilDate),
});
