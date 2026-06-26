import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialDocumentStatus } from '../../finance/entities/financial-document-status.enum';
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
