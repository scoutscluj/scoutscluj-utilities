import type {
  LayoutSettings,
  TemplateDocument,
} from '@scouts-cluj/parental-consent-schema';
import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { ParentalConsentTemplateStatus } from './parental-consent.enums';

export const ParentalConsentTemplateVersion = defineEntity({
  name: 'ParentalConsentTemplateVersion',
  tableName: 'parental_consent_template_versions',
  indexes: [{ properties: ['status'] }, { properties: ['createdAt'] }],
  uniques: [{ properties: ['version'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    version: p.integer(),
    name: p.string(),
    status: p
      .enum(() => ParentalConsentTemplateStatus)
      .default(ParentalConsentTemplateStatus.Draft)
      .nativeEnumName('parental_consent_template_status'),
    schemaVersion: p.integer().fieldName('schema_version'),
    document: p.json<TemplateDocument>().columnType('jsonb'),
    layout: p.json<LayoutSettings>().columnType('jsonb'),
    basedOnVersionId: p.integer().nullable().fieldName('based_on_version_id'),
    createdById: p.integer().nullable().fieldName('created_by_id'),
    activatedById: p.integer().nullable().fieldName('activated_by_id'),
    activatedAt: p.datetime().nullable().fieldName('activated_at'),
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

export type ParentalConsentTemplateVersion = InferEntity<
  typeof ParentalConsentTemplateVersion
>;
