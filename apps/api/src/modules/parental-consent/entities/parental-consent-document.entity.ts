import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { ParentalConsentBranch } from './parental-consent.enums';

export const ParentalConsentDocument = defineEntity({
  name: 'ParentalConsentDocument',
  tableName: 'parental_consent_documents',
  indexes: [
    { properties: ['publicationId'] },
    { properties: ['checksumSha256'] },
  ],
  uniques: [{ properties: ['publicationId', 'branch'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    publicationId: p.integer().fieldName('publication_id'),
    branch: p
      .enum(() => ParentalConsentBranch)
      .nativeEnumName('parental_consent_branch'),
    filename: p.string(),
    contentType: p.string().fieldName('content_type'),
    fileSize: p.integer().fieldName('file_size'),
    checksumSha256: p.string().fieldName('checksum_sha256'),
    fileData: p.type('bytea').fieldName('file_data'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type ParentalConsentDocument = InferEntity<
  typeof ParentalConsentDocument
>;
