import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser as CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { AuditService } from './audit.service';
import { AuditEntryDto } from './dto/audit.dto';

@ApiTags('audit')
@UseGuards(AuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.SuperAdmin)
  @Get()
  @ApiOkResponse({ type: [AuditEntryDto] })
  listGlobal(@CurrentUserDecorator() user: AuthenticatedUser) {
    return this.auditService.listGlobal(user);
  }

  @Get('activities/:activityId')
  @ApiOkResponse({ type: [AuditEntryDto] })
  listForActivity(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.auditService.listForActivity(user, activityId);
  }
}
