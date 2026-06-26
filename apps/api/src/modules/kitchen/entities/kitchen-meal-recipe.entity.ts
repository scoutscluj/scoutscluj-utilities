import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { KitchenRecipeScalingMode } from './kitchen.enums';

export const KitchenMealRecipe = defineEntity({
  name: 'KitchenMealRecipe',
  tableName: 'kitchen_meal_recipes',
  indexes: [{ properties: ['mealId'] }, { properties: ['recipeId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    mealId: p.integer().fieldName('meal_id'),
    recipeId: p.integer().fieldName('recipe_id'),
    servingOverride: p
      .decimal('number')
      .nullable()
      .fieldName('serving_override'),
    scalingMode: p
      .enum(() => KitchenRecipeScalingMode)
      .default(KitchenRecipeScalingMode.Proportional)
      .nativeEnumName('kitchen_recipe_scaling_mode')
      .fieldName('scaling_mode'),
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

export type KitchenMealRecipe = InferEntity<typeof KitchenMealRecipe>;
