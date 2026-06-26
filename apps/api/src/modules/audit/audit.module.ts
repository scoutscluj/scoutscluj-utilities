import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditEntry } from './entities/audit-entry.entity';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([AuditEntry, Activity, User])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
