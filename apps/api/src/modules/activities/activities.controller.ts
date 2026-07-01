import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser as CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ActivitiesService } from './activities.service';
import {
  ActivityDto,
  CreateActivityDto,
  UpdateActivityDepartmentsDto,
} from './dto/activity.dto';

@ApiTags('activities')
@UseGuards(AuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOkResponse({ type: [ActivityDto] })
  listActivities(@CurrentUserDecorator() user: AuthenticatedUser) {
    return this.activitiesService.listActivities(user);
  }

  @Post()
  @ApiOkResponse({ type: ActivityDto })
  createActivity(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: CreateActivityDto,
  ) {
    return this.activitiesService.createActivity(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ type: ActivityDto })
  getActivity(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) activityId: number,
  ) {
    return this.activitiesService.getActivity(user, activityId);
  }

  @Patch(':id/departments')
  @ApiOkResponse({ type: ActivityDto })
  updateDepartments(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) activityId: number,
    @Body() body: UpdateActivityDepartmentsDto,
  ) {
    return this.activitiesService.updateDepartments(user, activityId, body);
  }
}
