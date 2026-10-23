import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser as User } from '../users/users.types';
import { CalendarPageDto } from './calendar.dto';
import { CalendarsService } from './calendars.service';

@ApiTags('calendars')
@Controller('calendars')
@UseGuards(AuthGuard)
export class CalendarsController {
  constructor(private readonly calendars: CalendarsService) {}

  @Get(':source')
  @Header('Cache-Control', 'private, no-store')
  @ApiParam({ name: 'source', enum: ['events', 'headquarters'] })
  @ApiQuery({ name: 'from', type: String, description: 'RFC3339 lower bound' })
  @ApiQuery({
    name: 'to',
    type: String,
    description: 'RFC3339 exclusive upper bound; maximum 93 days',
  })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiOkResponse({ type: CalendarPageDto })
  list(
    @Param('source') source: string,
    @Query() query: Record<string, unknown>,
    @CurrentUser() user: User,
  ) {
    return this.calendars.list(source, query, user.id);
  }
}
