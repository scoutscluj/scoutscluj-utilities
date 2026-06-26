import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const AuditEntry = defineEntity({
  name: 'AuditEntry',
  tableName: 'app_audit_entries',
  indexes: [
    { properties: ['actorId'] },
    { properties: ['activityId'] },
    { properties: ['entityType'] },
    { properties: ['createdAt'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    actorId: p.integer().nullable().fieldName('actor_id'),
    action: p.string(),
    entityType: p.string().fieldName('entity_type'),
    entityId: p.string().fieldName('entity_id'),
    activityId: p.integer().nullable().fieldName('activity_id'),
    metadata: p.json<Record<string, unknown>>(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type AuditEntry = InferEntity<typeof AuditEntry>;
