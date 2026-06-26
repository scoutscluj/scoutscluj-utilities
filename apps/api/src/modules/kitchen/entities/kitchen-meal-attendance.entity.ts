import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenMealAttendance = defineEntity({
  name: 'KitchenMealAttendance',
  tableName: 'kitchen_meal_attendance',
  indexes: [{ properties: ['mealId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    mealId: p.integer().fieldName('meal_id'),
    subgroupName: p.string().fieldName('subgroup_name'),
    attendance: p.integer(),
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

export type KitchenMealAttendance = InferEntity<typeof KitchenMealAttendance>;
