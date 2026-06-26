import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export enum NotificationDeliveryStatus {
  Success = 'success',
  Failed = 'failed',
  Skipped = 'skipped',
  Expired = 'expired',
  RetryScheduled = 'retry_scheduled',
}

export const NotificationDeliveryLog = defineEntity({
  name: 'NotificationDeliveryLog',
  tableName: 'notification_delivery_logs',
  indexes: [
    { properties: ['messageId', 'status'] },
    { properties: ['userId', 'createdAt'] },
    { properties: ['subscriptionId', 'createdAt'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    messageId: p.integer().nullable().fieldName('message_id'),
    subscriptionId: p.integer().nullable().fieldName('subscription_id'),
    userId: p.integer().fieldName('user_id'),
    deviceId: p.string().nullable().fieldName('device_id'),
    status: p
      .enum(() => NotificationDeliveryStatus)
      .nativeEnumName('notification_delivery_status'),
    httpStatus: p.integer().nullable().fieldName('http_status'),
    errorCode: p.string().nullable().fieldName('error_code'),
    errorMessage: p.type('text').nullable().fieldName('error_message'),
    attempt: p.integer().default(1),
    deliveredAt: p.datetime().nullable().fieldName('delivered_at'),
    failedAt: p.datetime().nullable().fieldName('failed_at'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type NotificationDeliveryLog = InferEntity<
  typeof NotificationDeliveryLog
>;
