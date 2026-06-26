import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialDocumentStatus } from '../entities/financial-document-status.enum';
import { KeezHandoffMode } from '../entities/keez-handoff-mode.enum';

export class CreateFinancialDocumentDto {
  @ApiProperty({ example: 'bon-farmacie.pdf' })
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiProperty({
    description: 'Base64 encoded file content.',
    example: 'JVBERi0xLjQK',
  })
  contentBase64!: string;

  @ApiPropertyOptional({ example: 'Camp Temerari 2026' })
  activityName?: string;

  @ApiPropertyOptional({ example: 12 })
  activityId?: number;

  @ApiPropertyOptional({ example: 'Plată făcută cu cardul BT.' })
  notes?: string;
}

export class UpdateFinancialDocumentStatusDto {
  @ApiProperty({ enum: FinancialDocumentStatus })
  status!: FinancialDocumentStatus;

  @ApiPropertyOptional({ example: 'Lipsește dovada plății.' })
  reviewerNotes?: string;
}

export class UpdateFinanceSettingsDto {
  @ApiProperty({ enum: KeezHandoffMode })
  keezHandoffMode!: KeezHandoffMode;
}

export class FinancialDocumentDto {
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

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty()
  checksumSha256!: string;

  @ApiPropertyOptional()
  activityId?: number;

  @ApiPropertyOptional()
  activityTitle?: string;

  @ApiPropertyOptional()
  activityType?: string;

  @ApiPropertyOptional()
  activityName?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  reviewerNotes?: string;

  @ApiPropertyOptional()
  keezExternalId?: string;

  @ApiPropertyOptional()
  keezSubmittedAt?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class FinancialDocumentAuditDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  documentId!: number;

  @ApiProperty()
  actorId!: number;

  @ApiProperty()
  actorName!: string;

  @ApiPropertyOptional({ enum: FinancialDocumentStatus })
  fromStatus?: FinancialDocumentStatus;

  @ApiProperty({ enum: FinancialDocumentStatus })
  toStatus!: FinancialDocumentStatus;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  createdAt!: string;
}

export class FinanceSettingsDto {
  @ApiProperty({ enum: KeezHandoffMode })
  keezHandoffMode!: KeezHandoffMode;

  @ApiProperty()
  keezConfigured!: boolean;

  @ApiProperty()
  keezEnvironment!: string;

  @ApiProperty()
  keezDocumentUploadAvailable!: boolean;
}

export class FinanceSummaryDto {
  @ApiProperty()
  totalDocuments!: number;

  @ApiProperty()
  generalDocuments!: number;

  @ApiProperty()
  activityDocuments!: number;

  @ApiProperty()
  openDocuments!: number;

  @ApiProperty()
  needsClarification!: number;

  @ApiProperty()
  sentDocuments!: number;
}
