import type {
  OrganizerDraft,
  OrganizationSettings,
  TemplateSnapshot,
} from '@scouts-cluj/parental-consent-schema';
import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { ParentalConsentPublicationStatus } from './parental-consent.enums';

export const ParentalConsentPublication = defineEntity({
  name: 'ParentalConsentPublication',
  tableName: 'parental_consent_publications',
  indexes: [
    { properties: ['activityId', 'status'] },
    { properties: ['createdAt'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    reference: p.string().length(16).unique(),
    activityId: p.integer().fieldName('activity_id'),
    status: p
      .enum(() => ParentalConsentPublicationStatus)
      .default(ParentalConsentPublicationStatus.Active)
      .nativeEnumName('parental_consent_publication_status'),
    templateVersionId: p.integer().fieldName('template_version_id'),
    draftRevision: p.integer().fieldName('draft_revision'),
    draftSnapshot: p
      .json<OrganizerDraft>()
      .columnType('jsonb')
      .fieldName('draft_snapshot'),
    organizationSnapshot: p
      .json<OrganizationSettings>()
      .columnType('jsonb')
      .fieldName('organization_snapshot'),
    templateSnapshot: p
      .json<TemplateSnapshot>()
      .columnType('jsonb')
      .fieldName('template_snapshot'),
    publishedById: p.integer().fieldName('published_by_id'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
    archivedAt: p.datetime().nullable().fieldName('archived_at'),
  },
});

export type ParentalConsentPublication = InferEntity<
  typeof ParentalConsentPublication
>;
