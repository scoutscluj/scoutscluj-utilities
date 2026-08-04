import type { OrganizerDraft } from '@scouts-cluj/parental-consent-schema';
import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const ParentalConsentActivityDraft = defineEntity({
  name: 'ParentalConsentActivityDraft',
  tableName: 'parental_consent_activity_drafts',
  uniques: [{ properties: ['activityId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    activityId: p.integer().fieldName('activity_id'),
    schemaVersion: p.integer().fieldName('schema_version'),
    revision: p.integer().default(1),
    data: p.json<OrganizerDraft>().columnType('jsonb'),
    createdById: p.integer().fieldName('created_by_id'),
    updatedById: p.integer().fieldName('updated_by_id'),
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

export type ParentalConsentActivityDraft = InferEntity<
  typeof ParentalConsentActivityDraft
>;
