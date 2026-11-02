import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { AdmissionData } from '../admission.rules';

export const MemberApplication = defineEntity({
  name: 'MemberApplication',
  tableName: 'member_applications',
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    requestKey: p.uuid().unique(),
    unitId: p.uuid().nullable(),
    memberId: p.uuid().nullable(),
    data: p.json<AdmissionData>(),
    state: p.string().default('pending'),
    revision: p.integer().default(1),
    reason: p.text().default(''),
    approvedBy: p.integer().nullable(),
    createdBy: p.integer().nullable(),
    existingOrgoId: p.integer().nullable(),
    attemptedAt: p.datetime().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    reviewedAt: p.datetime().nullable(),
    consentVersion: p.string().default('2026-11-02'),
  },
});
export type MemberApplication = InferEntity<typeof MemberApplication>;

export const MemberGuardian = defineEntity({
  name: 'MemberGuardian',
  tableName: 'member_guardians',
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    memberId: p.uuid(),
    name: p.string(),
    email: p.string(),
    phone: p.string(),
    relation: p.string(),
    verifiedAccountId: p.integer().nullable(),
    verifiedBy: p.integer().nullable(),
    sourceApplicationId: p.uuid().nullable(),
    endedAt: p.datetime().nullable(),
  },
});
export type MemberGuardian = InferEntity<typeof MemberGuardian>;
