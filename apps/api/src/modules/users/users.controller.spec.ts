jest.mock('../auth/guards/auth.guard', () => ({
  AuthGuard: class AuthGuard {},
}));

jest.mock('../auth/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

jest.mock('./users.service', () => ({
  UsersService: class UsersService {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user-role.enum';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  it('is guarded for super-admin access', () => {
    expect(Reflect.getMetadata(ROLES_KEY, UsersController)).toEqual([
      UserRole.SuperAdmin,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, UsersController)).toEqual([
      AuthGuard,
      RolesGuard,
    ]);
  });

  it('delegates user listing and role updates to the service', async () => {
    const usersService = {
      listAdminUsers: jest.fn(() => Promise.resolve([])),
      updateRoles: jest.fn(() =>
        Promise.resolve({ id: 1, roles: [UserRole.Admin] }),
      ),
    };
    const controller = new UsersController(usersService as never);

    await expect(controller.listUsers()).resolves.toEqual([]);
    await expect(
      controller.updateUserRoles(1, { roles: [UserRole.Admin] }),
    ).resolves.toEqual({ id: 1, roles: [UserRole.Admin] });

    expect(usersService.listAdminUsers).toHaveBeenCalledTimes(1);
    expect(usersService.updateRoles).toHaveBeenCalledWith(1, [UserRole.Admin]);
  });
});
