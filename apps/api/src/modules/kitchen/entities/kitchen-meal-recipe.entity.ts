import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { KitchenRecipeScalingMode, KitchenUnitFamily } from './kitchen.enums';

export type KitchenAssignedRecipeIngredientSnapshot = {
  ingredientId: number;
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  defaultUnit: string;
  unitFamily: KitchenUnitFamily;
  estimatedUnitPrice: number;
};

export const KitchenMealRecipe = defineEntity({
  name: 'KitchenMealRecipe',
  tableName: 'kitchen_meal_recipes',
  indexes: [{ properties: ['mealId'] }, { properties: ['recipeId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    mealId: p.integer().fieldName('meal_id'),
    recipeId: p.integer().fieldName('recipe_id'),
    recipeNameSnapshot: p.string().nullable().fieldName('recipe_name_snapshot'),
    recipeServingsSnapshot: p
      .decimal('number')
      .nullable()
      .fieldName('recipe_servings_snapshot'),
    ingredientsSnapshot: p
      .json<KitchenAssignedRecipeIngredientSnapshot[]>()
      .default([])
      .fieldName('ingredients_snapshot'),
    condimentsSnapshot: p
      .json<string[]>()
      .default([])
      .fieldName('condiments_snapshot'),
    recipeSnapshotHash: p.string().nullable().fieldName('recipe_snapshot_hash'),
    sourceRecipeUpdatedAt: p
      .datetime()
      .nullable()
      .fieldName('source_recipe_updated_at'),
    snapshotCreatedAt: p.datetime().nullable().fieldName('snapshot_created_at'),
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
