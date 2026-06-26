import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { KitchenDayStatus } from './kitchen.enums';

export const KitchenDay = defineEntity({
  name: 'KitchenDay',
  tableName: 'kitchen_days',
  indexes: [{ properties: ['kitchenPlanId'] }, { properties: ['date'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    kitchenPlanId: p.integer().fieldName('kitchen_plan_id'),
    date: p.datetime(),
    dateStatus: p
      .enum(() => KitchenDayStatus)
      .default(KitchenDayStatus.Current)
      .nativeEnumName('kitchen_day_status')
      .fieldName('date_status'),
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

export type KitchenDay = InferEntity<typeof KitchenDay>;
