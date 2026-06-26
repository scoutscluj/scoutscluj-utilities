import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { KitchenUnitFamily } from './kitchen.enums';

export const KitchenIngredient = defineEntity({
  name: 'KitchenIngredient',
  tableName: 'kitchen_ingredients',
  indexes: [{ properties: ['legacySourceId'] }, { properties: ['category'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    legacySourceId: p.string().nullable().fieldName('legacy_source_id'),
    name: p.string(),
    category: p.string(),
    unitFamily: p
      .enum(() => KitchenUnitFamily)
      .nativeEnumName('kitchen_unit_family')
      .fieldName('unit_family'),
    defaultUnit: p.string().fieldName('default_unit'),
    defaultPricePerUnit: p
      .decimal('number')
      .fieldName('default_price_per_unit'),
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

export type KitchenIngredient = InferEntity<typeof KitchenIngredient>;
