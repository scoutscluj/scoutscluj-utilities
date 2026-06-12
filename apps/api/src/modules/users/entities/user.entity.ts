import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { OrgoConnection } from './orgo-connection.entity';
import { UserRole } from './user-role.enum';

export const User = defineEntity({
  name: 'User',
  tableName: 'users',
  properties: {
    id: p.integer().primary().autoincrement(),
    email: p.string().nullable().unique(),
    displayName: p.string().fieldName('display_name'),
    firstName: p.string().nullable().fieldName('first_name'),
    lastName: p.string().nullable().fieldName('last_name'),
    avatarUrl: p.string().nullable().fieldName('avatar_url'),
    roles: p
      .enum(() => UserRole)
      .array()
      .default([])
      .nativeEnumName('user_role'),
    orgoConnection: () =>
      p.oneToOne(OrgoConnection).mappedBy('user').nullable(),
    lastLoginAt: p.datetime().nullable().fieldName('last_login_at'),
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

export type User = InferEntity<typeof User>;
