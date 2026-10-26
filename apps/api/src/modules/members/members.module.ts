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
  exports: [MemberOrgoService, 'MEMBER_ORGO_SERVICE'],
  controllers: [MembersController],
  providers: [
    MembersService,
    MemberOrgoService,
    MembersWorker,
    { provide: 'MEMBER_ORGO_SERVICE', useExisting: MemberOrgoService },
  ],
})
export class MembersModule {}
