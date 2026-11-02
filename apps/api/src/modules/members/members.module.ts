import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module';
import { MEMBER_ENTITIES } from './entities/member.entity';
import { MembersService } from './members.service';
import { MemberOrgoService } from './orgo.service';
import { MembersController } from './members.controller';
import { MembersWorker } from './members.worker';
import { AdmissionsService } from './admissions.service';
import { AdmissionsController } from './admissions.controller';
import {
  MemberApplication,
  MemberGuardian,
} from './entities/member-application.entity';
import { OrgoObjectsService } from './orgo-objects.service';
@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([
      ...MEMBER_ENTITIES,
      MemberApplication,
      MemberGuardian,
    ]),
  ],
  exports: [MembersService, MemberOrgoService, 'MEMBER_ORGO_SERVICE'],
  controllers: [MembersController, AdmissionsController],
  providers: [
    MembersService,
    MemberOrgoService,
    MembersWorker,
    AdmissionsService,
    OrgoObjectsService,
    { provide: 'MEMBER_ORGO_SERVICE', useExisting: MemberOrgoService },
  ],
})
export class MembersModule {}
