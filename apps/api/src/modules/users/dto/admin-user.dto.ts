import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user-role.enum';

export class AdminUserOrgoConnectionDto {
  @ApiPropertyOptional()
  orgoUserId?: number;

  @ApiPropertyOptional()
  cardId?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  connectedAt?: string;

  @ApiPropertyOptional()
  lastLoginAt?: string;
}

export class AdminUserDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles!: UserRole[];

  @ApiPropertyOptional({ type: AdminUserOrgoConnectionDto })
  orgoConnection?: AdminUserOrgoConnectionDto;

  @ApiPropertyOptional()
  lastLoginAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UpdateUserRolesDto {
  @ApiProperty({ enum: UserRole, isArray: true })
  roles!: UserRole[];
}
