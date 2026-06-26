import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export enum NotificationMessageKind {
  AdminBroadcast = 'admin_broadcast',
  Test = 'test',
}

export enum NotificationMessageStatus {
  Sending = 'sending',
  Sent = 'sent',
  PartialFailure = 'partial_failure',
  Failed = 'failed',
}

export const NotificationMessage = defineEntity({
  name: 'NotificationMessage',
  tableName: 'notification_messages',
  indexes: [
    { properties: ['kind'] },
    { properties: ['status'] },
    { properties: ['sentAt'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    kind: p
      .enum(() => NotificationMessageKind)
      .nativeEnumName('notification_message_kind'),
    title: p.string(),
    body: p.type('text'),
    routePath: p.string().nullable().fieldName('route_path'),
    data: p.json<Record<string, unknown>>(),
    sentByUserId: p.integer().nullable().fieldName('sent_by_user_id'),
    targeting: p.json<Record<string, unknown>>(),
    status: p
      .enum(() => NotificationMessageStatus)
      .nativeEnumName('notification_message_status')
      .default(NotificationMessageStatus.Sending),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
    sentAt: p.datetime().nullable().fieldName('sent_at'),
  },
});

export type NotificationMessage = InferEntity<typeof NotificationMessage>;
