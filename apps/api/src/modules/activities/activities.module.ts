import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialDocument } from '../finance/entities/financial-document.entity';
import { User } from '../users/entities/user.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';

@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([Activity, FinancialDocument, User]),
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
