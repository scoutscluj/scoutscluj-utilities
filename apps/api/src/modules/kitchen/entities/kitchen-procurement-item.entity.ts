import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenProcurementItem = defineEntity({
  name: 'KitchenProcurementItem',
  tableName: 'kitchen_procurement_items',
  indexes: [
    { properties: ['procurementEventId'] },
    { properties: ['ingredientId'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    procurementEventId: p.integer().fieldName('procurement_event_id'),
    ingredientId: p.integer().fieldName('ingredient_id'),
    quantity: p.decimal('number'),
    unit: p.string(),
    estimatedUnitPrice: p
      .decimal('number')
      .nullable()
      .fieldName('estimated_unit_price'),
    estimatedTotalCost: p
      .decimal('number')
      .nullable()
      .fieldName('estimated_total_cost'),
    realUnitPrice: p.decimal('number').nullable().fieldName('real_unit_price'),
    realTotalCost: p.decimal('number').nullable().fieldName('real_total_cost'),
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

export type KitchenProcurementItem = InferEntity<typeof KitchenProcurementItem>;
