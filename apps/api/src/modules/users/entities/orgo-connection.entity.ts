import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { User } from './user.entity';

export const OrgoConnection = defineEntity({
  name: 'OrgoConnection',
  tableName: 'orgo_connections',
  indexes: [{ properties: ['email'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    user: () =>
      p
        .oneToOne(User)
        .owner()
        .inversedBy('orgoConnection')
        .deleteRule('cascade')
        .updateRule('cascade'),
    orgoUserId: p.integer().nullable().unique().fieldName('orgo_user_id'),
    cardId: p.string().nullable().unique().fieldName('card_id'),
    email: p.string().nullable(),
    profile: p.json<Record<string, unknown>>(),
    connectedAt: p
      .datetime()
      .fieldName('connected_at')
      .onCreate(() => new Date()),
    lastLoginAt: p
      .datetime()
      .fieldName('last_login_at')
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .fieldName('updated_at')
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export type OrgoConnection = InferEntity<typeof OrgoConnection>;
