import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { OrgoConnection } from './entities/orgo-connection.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [MikroOrmModule.forFeature([User, OrgoConnection])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
