import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminUserDto, UpdateUserRolesDto } from './dto/admin-user.dto';
import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SuperAdmin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [AdminUserDto] })
  listUsers(): Promise<AdminUserDto[]> {
    return this.usersService.listAdminUsers();
  }

  @Patch(':id/roles')
  @ApiOkResponse({ type: AdminUserDto })
  updateUserRoles(
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: UpdateUserRolesDto,
  ): Promise<AdminUserDto> {
    return this.usersService.updateRoles(userId, body.roles);
  }
}
