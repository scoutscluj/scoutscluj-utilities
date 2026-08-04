import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const ParentalConsentAsset = defineEntity({
  name: 'ParentalConsentAsset',
  tableName: 'parental_consent_assets',
  indexes: [{ properties: ['checksumSha256'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    name: p.string(),
    altText: p.string().fieldName('alt_text'),
    contentType: p.string().fieldName('content_type'),
    fileSize: p.integer().fieldName('file_size'),
    width: p.integer(),
    height: p.integer(),
    checksumSha256: p.string().fieldName('checksum_sha256'),
    fileData: p.type('bytea').fieldName('file_data'),
    createdById: p.integer().nullable().fieldName('created_by_id'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type ParentalConsentAsset = InferEntity<typeof ParentalConsentAsset>;
