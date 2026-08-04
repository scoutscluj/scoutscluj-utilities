import type {
  LayoutSettings,
  OrganizerDraft,
  TemplateDocument,
  ValidationIssue,
} from '@scouts-cluj/parental-consent-schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateParentalConsentOrganizationDto {
  @ApiProperty() revision!: number;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() legalName?: string;
  @ApiProperty() address!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() website?: string;
}

export class CreateParentalConsentAssetDto {
  @ApiProperty() name!: string;
  @ApiProperty() altText!: string;
  @ApiProperty({ enum: ['image/png', 'image/jpeg'] }) contentType!: string;
  @ApiProperty({ description: 'Base64-encoded PNG or JPEG bytes.' })
  dataBase64!: string;
}

export class CreateParentalConsentTemplateDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() basedOnVersionId?: number;
  @ApiPropertyOptional({ type: Object }) document?: TemplateDocument;
  @ApiPropertyOptional({ type: Object }) layout?: LayoutSettings;
}

export class UpdateParentalConsentTemplateDto {
  @ApiProperty() expectedUpdatedAt!: string;
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional({ type: Object }) document?: TemplateDocument;
  @ApiPropertyOptional({ type: Object }) layout?: LayoutSettings;
}

export class UpdateParentalConsentDraftDto {
  @ApiProperty() revision!: number;
  @ApiProperty({
    type: Object,
    description: 'Full draft or a recursively merged partial draft.',
  })
  data!: OrganizerDraft | Record<string, unknown>;
}

export class ParentalConsentValidationDto {
  @ApiProperty({ type: [Object] }) issues!: ValidationIssue[];
}
