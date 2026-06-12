import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { RequestWithUser } from '../auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.authService.extractSessionToken(request.headers);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    request.user = await this.authService.getCurrentUserFromToken(token);
    return true;
  }
}
