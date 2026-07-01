import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { PushSubscription } from '../notifications/entities/push-subscription.entity';
import { OrgoConnection } from './entities/orgo-connection.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, OrgoConnection, PushSubscription]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
