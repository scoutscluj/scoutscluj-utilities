import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
export const OrgoObjectJob = defineEntity({
  name: 'OrgoObjectJob',
  tableName: 'orgo_object_jobs',
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    subject: p.string(),
    subjectId: p.string(),
    state: p.string().default('pending'),
    payload: p.json<Record<string, unknown>>().onCreate(() => ({})),
    changedFields: p.json<string[]>().onCreate(() => []),
    message: p.text().default('În așteptarea sincronizării.'),
    createdAt: p.datetime().onCreate(() => new Date()),
    claimedAt: p.datetime().nullable(),
    claimToken: p.uuid().nullable(),
    attempts: p.integer().default(0),
    nextAttemptAt: p.datetime().nullable(),
  },
});
export type OrgoObjectJob = InferEntity<typeof OrgoObjectJob>;
export const OrgoObjectLink = defineEntity({
  name: 'OrgoObjectLink',
  tableName: 'orgo_object_links',
  properties: {
    id: p.string().primary(),
    remoteId: p.string().nullable(),
    creationStarted: p.boolean().default(false),
    baseline: p.json<Record<string, unknown>>().onCreate(() => ({})),
  },
});
export type OrgoObjectLink = InferEntity<typeof OrgoObjectLink>;
