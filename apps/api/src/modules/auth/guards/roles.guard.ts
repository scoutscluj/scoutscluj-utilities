import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user-role.enum';
import { RequestWithUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.Moderator]: 1,
  [UserRole.Admin]: 2,
  [UserRole.SuperAdmin]: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userRoles = request.user?.roles ?? [];

    const hasRole = requiredRoles.some((requiredRole) =>
      userRoles.some(
        (userRole) => ROLE_RANK[userRole] >= ROLE_RANK[requiredRole],
      ),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role.');
    }

    return true;
  }
}
