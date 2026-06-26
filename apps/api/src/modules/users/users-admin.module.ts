import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersModule } from './users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [UsersController],
})
export class UsersAdminModule {}
