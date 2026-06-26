import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';

const SENSITIVE_KEYS = new Set([
  'content',
  'contentBase64',
  'fileData',
  'password',
  'secret',
  'session',
  'successToken',
  'token',
]);

export const sanitizeAuditMetadata = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEYS.has(key) ? '[redacted]' : sanitizeAuditMetadata(entry),
      ]),
    );
  }

  return value;
};

export const canViewGlobalAudit = (user: CurrentUser) =>
  user.roles.includes(UserRole.SuperAdmin);

export const canViewActivityAudit = (
  user: CurrentUser,
  activity: { coordinatorId: number },
) =>
  activity.coordinatorId === user.id ||
  user.roles.includes(UserRole.FinanceManager) ||
  user.roles.includes(UserRole.SuperAdmin);
