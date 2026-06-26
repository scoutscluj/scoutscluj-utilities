import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenRecipeIngredient = defineEntity({
  name: 'KitchenRecipeIngredient',
  tableName: 'kitchen_recipe_ingredients',
  indexes: [
    { properties: ['legacySourceId'] },
    { properties: ['recipeId'] },
    { properties: ['ingredientId'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    legacySourceId: p.string().nullable().fieldName('legacy_source_id'),
    recipeId: p.integer().fieldName('recipe_id'),
    ingredientId: p.integer().fieldName('ingredient_id'),
    quantity: p.decimal('number'),
    unit: p.string(),
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

export type KitchenRecipeIngredient = InferEntity<
  typeof KitchenRecipeIngredient
>;
