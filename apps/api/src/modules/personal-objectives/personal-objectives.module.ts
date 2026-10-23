import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PersonalObjective } from './entities/personal-objective.entity';
import { PersonalObjectivesController } from './personal-objectives.controller';
import { PersonalObjectivesService } from './personal-objectives.service';

@Module({
  imports: [AuthModule, MikroOrmModule.forFeature([PersonalObjective])],
  controllers: [PersonalObjectivesController],
  providers: [PersonalObjectivesService],
})
export class PersonalObjectivesModule {}
