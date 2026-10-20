import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { AssignmentRole, Branch, Profile } from '../member.types';
const id = () =>
  p
    .uuid()
    .primary()
    .onCreate(() => randomUUID());
const created = () => p.datetime().onCreate(() => new Date());
export const LocalStructure = defineEntity({
  name: 'LocalStructure',
  tableName: 'local_structures',
  properties: {
    id: p.string().primary(),
    name: p.string(),
    forming: p.boolean().default(false),
  },
});
export type LocalStructure = InferEntity<typeof LocalStructure>;
export const ScoutUnit = defineEntity({
  name: 'ScoutUnit',
  tableName: 'scout_units',
  properties: {
    id: id(),
    name: p.string(),
    branch: p.string().$type<Branch>(),
    structureId: p.string().default('cluj'),
    structureConfirmed: p.boolean().default(false),
    parentId: p.uuid().nullable(),
    graduationYear: p.integer().nullable(),
    orgoId: p.integer().nullable().unique(),
    archived: p.boolean().default(false),
    createdAt: created(),
  },
});
export type ScoutUnit = InferEntity<typeof ScoutUnit>;
export const ScoutMember = defineEntity({
  name: 'ScoutMember',
  tableName: 'scout_members',
  properties: {
    id: id(),
    orgoId: p.integer().nullable().unique(),
    accountId: p.integer().nullable().unique(),
    name: p.string(),
    birthDate: p.string().nullable(),
    structureId: p.string().default('cluj'),
    structureConfirmed: p.boolean().default(false),
    grade: p.integer().nullable(),
    unitId: p.uuid().nullable(),
    groupId: p.uuid().nullable(),
    status: p.string().default('active'),
    adultKind: p.string().nullable(),
    promiseDate: p.string().nullable(),
    profile: p.json<Profile>(),
    revision: p.integer().default(1),
    remote: p.json<Record<string, unknown>>().onCreate(() => ({})),
    lastProgressionYear: p.integer().nullable(),
    skipProgressionYear: p.integer().nullable(),
    feeResumePeriod: p.string().nullable(),
    createdAt: created(),
    updatedAt: created(),
  },
});
export type ScoutMember = InferEntity<typeof ScoutMember>;
export const ScoutAssignment = defineEntity({
  name: 'ScoutAssignment',
  tableName: 'scout_assignments',
  properties: {
    id: id(),
    memberId: p.uuid(),
    unitId: p.uuid().nullable(),
    structureId: p.string().nullable(),
    groupId: p.uuid().nullable(),
    role: p.string().$type<AssignmentRole>(),
    canEdit: p.boolean().default(false),
    canSeeFees: p.boolean().default(false),
    canSeeSensitive: p.boolean().default(false),
    startedAt: created(),
    endedAt: p.datetime().nullable(),
    actorId: p.integer(),
  },
});
export type ScoutAssignment = InferEntity<typeof ScoutAssignment>;
export const ScoutNote = defineEntity({
  name: 'ScoutNote',
  tableName: 'scout_notes',
  properties: {
    id: id(),
    memberId: p.uuid(),
    authorId: p.integer(),
    body: p.text(),
    createdAt: created(),
  },
});
export type ScoutNote = InferEntity<typeof ScoutNote>;
export const MemberSync = defineEntity({
  name: 'MemberSync',
  tableName: 'member_sync_operations',
  properties: {
    id: id(),
    memberId: p.uuid(),
    revision: p.integer(),
    actorId: p.integer().nullable(),
    kind: p.string(),
    state: p.string().default('pending'),
    message: p.text(),
    payload: p.json<Record<string, unknown>>(),
    baseline: p.json<Record<string, unknown>>(),
    createdAt: created(),
    completedAt: p.datetime().nullable(),
    claimedAt: p.datetime().nullable(),
  },
});
export type MemberSync = InferEntity<typeof MemberSync>;
export const MemberTransition = defineEntity({
  name: 'MemberTransition',
  tableName: 'member_transitions',
  uniques: [{ properties: ['memberId', 'year'] }],
  properties: {
    id: id(),
    memberId: p.uuid(),
    year: p.integer(),
    state: p.string(),
    message: p.text(),
    createdAt: created(),
  },
});
export type MemberTransition = InferEntity<typeof MemberTransition>;
export const MemberSettings = defineEntity({
  name: 'MemberSettings',
  tableName: 'member_settings',
  properties: {
    id: p.string().primary(),
    progressionEnabled: p.boolean().default(false),
  },
});
export const MemberNotice = defineEntity({
  name: 'MemberNotice',
  tableName: 'member_notices',
  properties: {
    id: id(),
    unitId: p.uuid(),
    memberId: p.uuid(),
    createdAt: created(),
  },
});
export const MEMBER_ENTITIES = [
  LocalStructure,
  ScoutUnit,
  ScoutMember,
  ScoutAssignment,
  ScoutNote,
  MemberSync,
  MemberTransition,
  MemberSettings,
  MemberNotice,
];
