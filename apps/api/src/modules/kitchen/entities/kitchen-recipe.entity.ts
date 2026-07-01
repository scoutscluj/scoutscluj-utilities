import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenRecipe = defineEntity({
  name: 'KitchenRecipe',
  tableName: 'kitchen_recipes',
  indexes: [{ properties: ['legacySourceId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    legacySourceId: p.string().nullable().fieldName('legacy_source_id'),
    name: p.string(),
    description: p.type('text').nullable(),
    condiments: p.json<string[]>().default([]),
    servings: p.decimal('number'),
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

export type KitchenRecipe = InferEntity<typeof KitchenRecipe>;
