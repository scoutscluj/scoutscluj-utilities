import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenQuantityAdjustment = defineEntity({
  name: 'KitchenQuantityAdjustment',
  tableName: 'kitchen_quantity_adjustments',
  indexes: [{ properties: ['mealId'] }, { properties: ['ingredientId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    mealId: p.integer().fieldName('meal_id'),
    ingredientId: p.integer().fieldName('ingredient_id'),
    quantityDelta: p.decimal('number').fieldName('quantity_delta'),
    unit: p.string(),
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

export type KitchenQuantityAdjustment = InferEntity<
  typeof KitchenQuantityAdjustment
>;
