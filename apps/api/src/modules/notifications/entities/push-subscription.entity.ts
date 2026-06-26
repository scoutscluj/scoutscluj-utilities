import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const PushSubscription = defineEntity({
  name: 'PushSubscription',
  tableName: 'push_subscriptions',
  indexes: [
    { properties: ['userId', 'isActive'] },
    { properties: ['deviceId', 'userId'] },
    { properties: ['lastSeenAt'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    userId: p.integer().fieldName('user_id'),
    deviceId: p.string().fieldName('device_id'),
    endpoint: p.type('text'),
    endpointHash: p.string().fieldName('endpoint_hash').unique(),
    p256dh: p.type('text'),
    authSecret: p.type('text').fieldName('auth_secret'),
    expirationTime: p.datetime().nullable().fieldName('expiration_time'),
    platform: p.string().nullable(),
    browserName: p.string().nullable().fieldName('browser_name'),
    browserVersion: p.string().nullable().fieldName('browser_version'),
    osName: p.string().nullable().fieldName('os_name'),
    isMobile: p.boolean().default(false).fieldName('is_mobile'),
    userAgent: p.type('text').nullable().fieldName('user_agent'),
    isActive: p.boolean().default(true).fieldName('is_active'),
    lastSeenAt: p
      .datetime()
      .fieldName('last_seen_at')
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    subscribedAt: p
      .datetime()
      .fieldName('subscribed_at')
      .onCreate(() => new Date()),
    unsubscribedAt: p.datetime().nullable().fieldName('unsubscribed_at'),
    expiredAt: p.datetime().nullable().fieldName('expired_at'),
    lastErrorCode: p.string().nullable().fieldName('last_error_code'),
    lastErrorMessage: p.type('text').nullable().fieldName('last_error_message'),
    lastFailedAt: p.datetime().nullable().fieldName('last_failed_at'),
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

export type PushSubscription = InferEntity<typeof PushSubscription>;
