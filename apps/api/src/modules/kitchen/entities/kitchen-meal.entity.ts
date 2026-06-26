import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { KitchenAttendanceMode, KitchenMealSlot } from './kitchen.enums';

export const KitchenMeal = defineEntity({
  name: 'KitchenMeal',
  tableName: 'kitchen_meals',
  indexes: [{ properties: ['kitchenDayId'] }, { properties: ['slot'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    kitchenDayId: p.integer().fieldName('kitchen_day_id'),
    slot: p
      .enum(() => KitchenMealSlot)
      .nativeEnumName('kitchen_meal_slot'),
    context: p.string().nullable(),
    name: p.string().nullable(),
    sortOrder: p.integer().default(0).fieldName('sort_order'),
    attendanceMode: p
      .enum(() => KitchenAttendanceMode)
      .default(KitchenAttendanceMode.PlanDefault)
      .nativeEnumName('kitchen_attendance_mode')
      .fieldName('attendance_mode'),
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

export type KitchenMeal = InferEntity<typeof KitchenMeal>;
