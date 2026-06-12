import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OrgoClientService } from './orgo-client.service';
import { OrgoCallbackController } from './orgo-callback.controller';
import { SessionService } from './session.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, OrgoCallbackController],
  providers: [
    AuthService,
    OrgoClientService,
    SessionService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, AuthGuard, RolesGuard, SessionService],
})
export class AuthModule {}
