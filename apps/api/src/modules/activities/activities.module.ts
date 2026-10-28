import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RegistrationModule } from '../activity-registrations/registration.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FinancialDocument } from '../finance/entities/financial-document.entity';
import { User } from '../users/entities/user.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';

@Module({
  imports: [
    RegistrationModule,
    AuthModule,
    AuditModule,
    MikroOrmModule.forFeature([Activity, FinancialDocument, User]),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
