import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { User } from '../../users/entities/user.entity';

export const PersonalObjective = defineEntity({
  name: 'PersonalObjective',
  tableName: 'personal_objectives',
  indexes: [{ properties: ['userId', 'deadline'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    userId: () =>
      p.manyToOne(User).mapToPk().fieldName('user_id').deleteRule('cascade'),
    title: p.string().length(200),
    description: p.text(),
    deadline: p.type('date'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type PersonalObjective = InferEntity<typeof PersonalObjective>;
