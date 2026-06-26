import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser as CurrentUserType } from '../users/users.types';
import {
  BroadcastNotificationDto,
  BroadcastSummaryDto,
  NotificationActionResultDto,
  NotificationDeliverySummaryDto,
  NotificationStatusDto,
  SubscribeNotificationDto,
  VapidPublicKeyDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  @ApiOkResponse({ type: VapidPublicKeyDto })
  getVapidPublicKey(): VapidPublicKeyDto {
    return this.notificationsService.getPublicConfig();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: NotificationStatusDto })
  getStatus(
    @CurrentUser() user: CurrentUserType,
    @Query('deviceId') deviceId?: string,
  ): Promise<NotificationStatusDto> {
    return this.notificationsService.getStatus(user, deviceId);
  }

  @Post('subscribe')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: NotificationActionResultDto })
  subscribe(
    @CurrentUser() user: CurrentUserType,
    @Body() body: SubscribeNotificationDto,
  ): Promise<NotificationActionResultDto> {
    return this.notificationsService.subscribe(user, body);
  }

  @Delete('subscriptions')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: NotificationActionResultDto })
  unsubscribeAll(
    @CurrentUser() user: CurrentUserType,
  ): Promise<NotificationActionResultDto> {
    return this.notificationsService.unsubscribeAll(user);
  }

  @Delete('subscriptions/:deviceId')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: NotificationActionResultDto })
  unsubscribeDevice(
    @CurrentUser() user: CurrentUserType,
    @Param('deviceId') deviceId: string,
  ): Promise<NotificationActionResultDto> {
    return this.notificationsService.unsubscribeDevice(user, deviceId);
  }

  @Post('test')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: NotificationDeliverySummaryDto })
  sendTest(
    @CurrentUser() user: CurrentUserType,
  ): Promise<NotificationDeliverySummaryDto> {
    return this.notificationsService.sendTest(user);
  }

  @Get('broadcast/summary')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @ApiOkResponse({ type: BroadcastSummaryDto })
  getBroadcastSummary(): Promise<BroadcastSummaryDto> {
    return this.notificationsService.getBroadcastSummary();
  }

  @Post('broadcast')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @ApiOkResponse({ type: NotificationDeliverySummaryDto })
  broadcast(
    @CurrentUser() user: CurrentUserType,
    @Body() body: BroadcastNotificationDto,
  ): Promise<NotificationDeliverySummaryDto> {
    return this.notificationsService.broadcast(user, body);
  }
}
