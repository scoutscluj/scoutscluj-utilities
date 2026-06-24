import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user-role.enum';
import { RolesGuard } from './roles.guard';

const createContext = (roles: UserRole[]) =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 1,
          displayName: 'Test User',
          roles,
        },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  it('allows higher roles to satisfy lower role requirements', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => [UserRole.Moderator]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([UserRole.Admin]))).toBe(true);
  });

  it('rejects users below the required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => [UserRole.Admin]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(createContext([UserRole.Moderator])),
    ).toThrow(ForbiddenException);
  });

  it('does not let admins inherit finance permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => [UserRole.FinanceManager]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext([UserRole.Admin]))).toThrow(
      ForbiddenException,
    );
  });

  it('lets super admins cover finance permissions', () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => [UserRole.FinanceManager]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext([UserRole.SuperAdmin]))).toBe(true);
  });
});
