import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { CurrentUser as CurrentUserType } from '../users/users.types';
import {
  CreatePersonalObjectiveDto,
  PersonalObjectiveDto,
} from './dto/personal-objective.dto';
import { PersonalObjectivesService } from './personal-objectives.service';

@ApiTags('personal-objectives')
@UseGuards(AuthGuard)
@Controller('personal-objectives')
export class PersonalObjectivesController {
  constructor(private readonly objectives: PersonalObjectivesService) {}

  @Get()
  @ApiOkResponse({ type: [PersonalObjectiveDto] })
  list(@CurrentUser() user: CurrentUserType) {
    return this.objectives.list(user);
  }

  @Post()
  @ApiCreatedResponse({ type: PersonalObjectiveDto })
  create(
    @CurrentUser() user: CurrentUserType,
    @Body() input: CreatePersonalObjectiveDto,
  ) {
    return this.objectives.create(user, input);
  }
}
