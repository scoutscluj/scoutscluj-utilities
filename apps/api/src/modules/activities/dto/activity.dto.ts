import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialDocumentStatus } from '../../finance/entities/financial-document-status.enum';
import { ActivityDepartment } from '../entities/activity-department.enum';
import { ActivityStatus } from '../entities/activity-status.enum';
import { ActivityType } from '../entities/activity-type.enum';

export class CreateActivityDto {
  @ApiProperty({ example: 'Camp Lupișori 2026' })
  title!: string;

  @ApiProperty({ enum: ActivityType, default: ActivityType.Other })
  type!: ActivityType;

  @ApiPropertyOptional({ example: '2026-07-12' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-18' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'Beliș' })
  location?: string;

  @ApiPropertyOptional({
    example: 'Activitate locală cu buget urmărit în aplicație.',
  })
  description?: string;

  @ApiPropertyOptional({
    enum: ActivityDepartment,
    isArray: true,
    default: [ActivityDepartment.Finance, ActivityDepartment.Kitchen],
  })
  departments?: ActivityDepartment[];
}

export class UpdateActivityDto {
  @ApiPropertyOptional({ example: 'Camp Lupișori 2026' })
  title?: string;

  @ApiPropertyOptional({ enum: ActivityType })
  type?: ActivityType;

  @ApiPropertyOptional({ enum: ActivityStatus })
  status?: ActivityStatus;

  @ApiPropertyOptional({ example: '2026-07-12' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-18' })
  endDate?: string;

  @ApiPropertyOptional({ example: 'Beliș' })
  location?: string;

  @ApiPropertyOptional({
    example: 'Activitate locală cu buget urmărit în aplicație.',
  })
  description?: string;

  @ApiPropertyOptional({ enum: ActivityDepartment, isArray: true })
  departments?: ActivityDepartment[];
}

export class UpdateActivityDepartmentsDto {
  @ApiProperty({ enum: ActivityDepartment, isArray: true })
  departments!: ActivityDepartment[];
}

export class ActivityFinanceSummaryDto {
  @ApiProperty()
  totalDocuments!: number;

  @ApiProperty()
  openDocuments!: number;

  @ApiProperty()
  sentDocuments!: number;

  @ApiProperty()
  needsClarification!: number;
}

export class ActivityDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ActivityType })
  type!: ActivityType;

  @ApiProperty({ enum: ActivityStatus })
  status!: ActivityStatus;

  @ApiProperty()
  coordinatorId!: number;

  @ApiProperty()
  coordinatorName!: string;

  @ApiProperty({ enum: ActivityDepartment, isArray: true })
  departments!: ActivityDepartment[];

  @ApiPropertyOptional()
  startDate?: string;

  @ApiPropertyOptional()
  endDate?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  orgoEventId?: string;

  @ApiPropertyOptional()
  orgoEventIri?: string;

  @ApiProperty({ type: ActivityFinanceSummaryDto })
  financeSummary!: ActivityFinanceSummaryDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ActivityDocumentSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  uploaderId!: number;

  @ApiProperty()
  uploaderName!: string;

  @ApiProperty({ enum: FinancialDocumentStatus })
  status!: FinancialDocumentStatus;

  @ApiProperty()
  originalFilename!: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  reviewerNotes?: string;

  @ApiProperty()
  createdAt!: string;
}
