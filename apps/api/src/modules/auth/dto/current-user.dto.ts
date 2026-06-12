import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user-role.enum';

class OrgoConnectionSummaryDto {
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

export class CurrentUserDto {
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

  @ApiPropertyOptional({ type: OrgoConnectionSummaryDto })
  orgoConnection?: OrgoConnectionSummaryDto;
}
