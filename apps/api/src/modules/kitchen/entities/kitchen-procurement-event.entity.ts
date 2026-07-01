import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import {
  KitchenProcurementMethod,
  KitchenProcurementStatus,
} from './kitchen.enums';

export const KitchenProcurementEvent = defineEntity({
  name: 'KitchenProcurementEvent',
  tableName: 'kitchen_procurement_events',
  indexes: [
    { properties: ['kitchenPlanId'] },
    { properties: ['supplier'] },
    { properties: ['status'] },
    { properties: ['date'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    kitchenPlanId: p.integer().fieldName('kitchen_plan_id'),
    name: p.string(),
    supplier: p.string().nullable(),
    ownerName: p.string().nullable().fieldName('owner_name'),
    date: p.datetime().nullable(),
    method: p
      .enum(() => KitchenProcurementMethod)
      .default(KitchenProcurementMethod.SelfPurchase)
      .nativeEnumName('kitchen_procurement_method'),
    status: p
      .enum(() => KitchenProcurementStatus)
      .default(KitchenProcurementStatus.Planned)
      .nativeEnumName('kitchen_procurement_status'),
    notes: p.type('text').nullable(),
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

export type KitchenProcurementEvent = InferEntity<
  typeof KitchenProcurementEvent
>;
