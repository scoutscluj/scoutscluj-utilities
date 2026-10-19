import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module';
import { MEMBER_ENTITIES } from './entities/member.entity';
import { MembersService } from './members.service';
import { MemberOrgoService } from './orgo.service';
import { MembersController } from './members.controller';
import { MembersWorker } from './members.worker';
@Module({
  imports: [AuthModule, MikroOrmModule.forFeature(MEMBER_ENTITIES)],
  controllers: [MembersController],
  providers: [MembersService, MemberOrgoService, MembersWorker],
})
export class MembersModule {}
