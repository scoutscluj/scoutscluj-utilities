import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { ActivityStatus } from './activity-status.enum';
import { ActivityType } from './activity-type.enum';

export const Activity = defineEntity({
  name: 'Activity',
  tableName: 'activities',
  indexes: [
    { properties: ['coordinatorId'] },
    { properties: ['status'] },
    { properties: ['startDate'] },
    { properties: ['orgoEventId'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    coordinatorId: p.integer().fieldName('coordinator_id'),
    title: p.string(),
    type: p
      .enum(() => ActivityType)
      .default(ActivityType.Other)
      .nativeEnumName('activity_type'),
    status: p
      .enum(() => ActivityStatus)
      .default(ActivityStatus.Planned)
      .nativeEnumName('activity_status'),
    startDate: p.datetime().nullable().fieldName('start_date'),
    endDate: p.datetime().nullable().fieldName('end_date'),
    location: p.string().nullable(),
    description: p.type('text').nullable(),
    orgoEventId: p.string().nullable().fieldName('orgo_event_id'),
    orgoEventIri: p.string().nullable().fieldName('orgo_event_iri'),
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

export type Activity = InferEntity<typeof Activity>;
