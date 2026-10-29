import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { Answer, RegistrationSettings } from './registration.rules';
import type { RegistrationDraftData } from './registration-draft.rules';
const id = () =>
  p
    .uuid()
    .primary()
    .onCreate(() => randomUUID());
const created = () => p.datetime().onCreate(() => new Date());

export const ActivityRegistrationDraft = defineEntity({
  name: 'ActivityRegistrationDraft',
  tableName: 'activity_registration_drafts',
  indexes: [{ properties: ['ownerId', 'activityId'] }],
  properties: {
    id: id(),
    activityId: p.integer(),
    ownerId: p.integer(),
    data: p.json<RegistrationDraftData>(),
    revision: p.integer().default(1),
    createdAt: created(),
    updatedAt: created(),
  },
});
export type ActivityRegistrationDraft = InferEntity<
  typeof ActivityRegistrationDraft
>;

export const ActivityRegistrationSettings = defineEntity({
  name: 'ActivityRegistrationSettings',
  tableName: 'activity_registration_settings',
  properties: {
    activityId: p.integer().primary(),
    revision: p.integer().default(1),
    data: p.json<RegistrationSettings>(),
    updatedAt: created(),
  },
});
export type ActivityRegistrationSettings = InferEntity<
  typeof ActivityRegistrationSettings
>;
export const ActivityRegistration = defineEntity({
  name: 'ActivityRegistration',
  tableName: 'activity_registrations',
  uniques: [{ properties: ['activityId', 'memberId'] }],
  indexes: [
    { properties: ['activityId', 'state'] },
    { properties: ['ownerId'] },
  ],
  properties: {
    id: id(),
    activityId: p.integer(),
    memberId: p.uuid(),
    unitId: p.uuid().nullable(),
    orgoId: p.integer(),
    memberName: p.string(),
    branch: p.string(),
    role: p.string(),
    minor: p.boolean(),
    state: p.string(),
    ownerId: p.integer().nullable(),
    tokenHash: p.string().unique(),
    email: p.string(),
    answers: p.json<Record<string, Answer>>(),
    answerRevision: p.integer().default(1),
    questions: p.json<RegistrationSettings['questions']>(),
    totalBani: p.integer(),
    refundDueBani: p.integer().nullable(),
    familyKey: p.uuid().nullable(),
    familyPlan: p.string().nullable(),
    installments: p.json<RegistrationSettings['installments']>(),
    paymentDue: p.string(),
    consentState: p.string(),
    consentPublicationId: p.integer().nullable(),
    exceptionNote: p.text().nullable(),
    createdAt: created(),
    updatedAt: created(),
    revision: p.integer().default(1),
  },
});
export type ActivityRegistration = InferEntity<typeof ActivityRegistration>;
export const ActivityRegistrationEntry = defineEntity({
  name: 'ActivityRegistrationEntry',
  tableName: 'activity_registration_entries',
  indexes: [{ properties: ['registrationId'] }],
  properties: {
    id: id(),
    registrationId: p.uuid(),
    method: p.string(),
    amountBani: p.integer(),
    note: p.text(),
    installmentKey: p.string().length(100).nullable(),
    receivedOn: p.string(),
    actorId: p.integer().nullable(),
    checkoutId: p.uuid().nullable().unique(),
    reversedEntryId: p.uuid().nullable().unique(),
    createdAt: created(),
  },
});
export type ActivityRegistrationEntry = InferEntity<
  typeof ActivityRegistrationEntry
>;
export const ActivityRegistrationCheckout = defineEntity({
  name: 'ActivityRegistrationCheckout',
  tableName: 'activity_registration_checkouts',
  properties: {
    id: id(),
    registrationId: p.uuid(),
    amountBani: p.integer(),
    provider: p.string(),
    environment: p.string(),
    providerConfigId: p.uuid(),
    providerId: p.string().nullable(),
    paymentUrl: p.text().nullable(),
    state: p.string(),
    reviewRequired: p.boolean().default(false),
    createdAt: created(),
    updatedAt: created(),
  },
});
export type ActivityRegistrationCheckout = InferEntity<
  typeof ActivityRegistrationCheckout
>;
export const ActivityRegistrationDocument = defineEntity({
  name: 'ActivityRegistrationDocument',
  tableName: 'activity_registration_documents',
  properties: {
    id: id(),
    registrationId: p.uuid(),
    publicationId: p.integer(),
    kind: p.string(),
    filename: p.string(),
    checksum: p.string(),
    sourceDocumentId: p.uuid().nullable(),
    answerRevision: p.integer(),
    data: p.type('bytea').lazy(),
    createdAt: created(),
  },
});
export type ActivityRegistrationDocument = InferEntity<
  typeof ActivityRegistrationDocument
>;
export const ActivityRegistrationMail = defineEntity({
  name: 'ActivityRegistrationMail',
  tableName: 'activity_registration_mail',
  properties: {
    id: id(),
    registrationId: p.uuid(),
    recipient: p.string(),
    subject: p.string(),
    body: p.text(),
    state: p.string().default('pending'),
    attempts: p.integer().default(0),
    nextAttemptAt: created(),
    createdAt: created(),
  },
});
