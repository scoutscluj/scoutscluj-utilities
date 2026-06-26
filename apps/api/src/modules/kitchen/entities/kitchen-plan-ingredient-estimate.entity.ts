import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenPlanIngredientEstimate = defineEntity({
  name: 'KitchenPlanIngredientEstimate',
  tableName: 'kitchen_plan_ingredient_estimates',
  indexes: [
    { properties: ['kitchenPlanId'] },
    { properties: ['ingredientId'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    kitchenPlanId: p.integer().fieldName('kitchen_plan_id'),
    ingredientId: p.integer().fieldName('ingredient_id'),
    estimatedUnitPrice: p
      .decimal('number')
      .fieldName('estimated_unit_price'),
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

export type KitchenPlanIngredientEstimate = InferEntity<
  typeof KitchenPlanIngredientEstimate
>;
