import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditEntryDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  actorId?: number;

  @ApiPropertyOptional()
  actorName?: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional()
  activityId?: number;

  @ApiProperty()
  metadata!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}

export class CreateAuditEntryInput {
  actorId?: number;
  action!: string;
  entityType!: string;
  entityId!: string | number;
  activityId?: number;
  metadata?: Record<string, unknown>;
}
