import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenPlan = defineEntity({
  name: 'KitchenPlan',
  tableName: 'kitchen_plans',
  indexes: [{ properties: ['activityId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    activityId: p.integer().fieldName('activity_id'),
    defaultParticipantCount: p
      .integer()
      .default(0)
      .fieldName('default_participant_count'),
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

export type KitchenPlan = InferEntity<typeof KitchenPlan>;
