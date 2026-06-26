import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { FinancialDocumentStatus } from './financial-document-status.enum';

export const FinancialDocument = defineEntity({
  name: 'FinancialDocument',
  tableName: 'financial_documents',
  properties: {
    id: p.integer().primary().autoincrement(),
    uploaderId: p.integer().fieldName('uploader_id'),
    status: p
      .enum(() => FinancialDocumentStatus)
      .default(FinancialDocumentStatus.Uploaded)
      .nativeEnumName('financial_document_status'),
    originalFilename: p.string().fieldName('original_filename'),
    contentType: p.string().fieldName('content_type'),
    fileSize: p.integer().fieldName('file_size'),
    checksumSha256: p.string().fieldName('checksum_sha256'),
    fileData: p.type('bytea').fieldName('file_data'),
    activityId: p.integer().nullable().fieldName('activity_id'),
    activityName: p.string().nullable().fieldName('activity_name'),
    notes: p.type('text').nullable(),
    reviewerNotes: p.type('text').nullable().fieldName('reviewer_notes'),
    keezExternalId: p.string().nullable().fieldName('keez_external_id'),
    keezSubmittedAt: p.datetime().nullable().fieldName('keez_submitted_at'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .fieldName('updated_at')
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export type FinancialDocument = InferEntity<typeof FinancialDocument>;
