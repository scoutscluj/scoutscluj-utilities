import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const ParentalConsentOrganizationSettings = defineEntity({
  name: 'ParentalConsentOrganizationSettings',
  tableName: 'parental_consent_organization_settings',
  properties: {
    id: p.integer().primary(),
    name: p.string(),
    legalName: p.string().nullable().fieldName('legal_name'),
    address: p.type('text'),
    email: p.string(),
    phone: p.string(),
    website: p.string().nullable(),
    revision: p.integer().default(1),
    updatedById: p.integer().nullable().fieldName('updated_by_id'),
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

export type ParentalConsentOrganizationSettings = InferEntity<
  typeof ParentalConsentOrganizationSettings
>;
