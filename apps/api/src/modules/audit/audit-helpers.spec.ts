import {
  canViewActivityAudit,
  canViewGlobalAudit,
  sanitizeAuditMetadata,
} from './audit-helpers';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';

const currentUser = (overrides: Partial<CurrentUser> = {}): CurrentUser =>
  ({
    id: 1,
    displayName: 'Ana',
    roles: [],
    ...overrides,
  }) as CurrentUser;

describe('audit helpers', () => {
  it('redacts sensitive metadata recursively', () => {
    expect(
      sanitizeAuditMetadata({
        fileName: 'bon.pdf',
        contentBase64: 'secret-file',
        nested: { token: 'secret-token', kept: 'visible' },
        rows: [{ password: 'secret-password', kept: true }],
      }),
    ).toEqual({
      fileName: 'bon.pdf',
      contentBase64: '[redacted]',
      nested: { token: '[redacted]', kept: 'visible' },
      rows: [{ password: '[redacted]', kept: true }],
    });
  });

  it('allows only super admins to see the global audit journal', () => {
    expect(
      canViewGlobalAudit(currentUser({ roles: [UserRole.SuperAdmin] })),
    ).toBe(true);
    expect(
      canViewGlobalAudit(currentUser({ roles: [UserRole.FinanceManager] })),
    ).toBe(false);
  });

  it('allows coordinators, finance managers, and super admins to see activity audit entries', () => {
    const activity = { coordinatorId: 5 };

    expect(canViewActivityAudit(currentUser({ id: 5 }), activity)).toBe(true);
    expect(
      canViewActivityAudit(
        currentUser({ roles: [UserRole.FinanceManager] }),
        activity,
      ),
    ).toBe(true);
    expect(
      canViewActivityAudit(
        currentUser({ roles: [UserRole.SuperAdmin] }),
        activity,
      ),
    ).toBe(true);
    expect(canViewActivityAudit(currentUser(), activity)).toBe(false);
  });
});
