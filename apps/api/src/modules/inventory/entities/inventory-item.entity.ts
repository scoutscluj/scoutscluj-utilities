import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const InventoryItem = defineEntity({
  name: 'InventoryItem',
  tableName: 'inventory_items',
  indexes: [
    { properties: ['name'] },
    { properties: ['category'] },
    { properties: ['subcategory'] },
    { properties: ['owner'] },
    { properties: ['locationDescription'] },
    { properties: ['condition'] },
    { properties: ['isConsumable'] },
    { properties: ['deletedAt'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    name: p.string(),
    quantity: p.integer().default(0),
    category: p.string().nullable(),
    subcategory: p.string().nullable(),
    owner: p.string().nullable(),
    locationDescription: p
      .string()
      .nullable()
      .fieldName('location_description'),
    condition: p.string().nullable().default('Buna'),
    isConsumable: p.boolean().default(false).fieldName('is_consumable'),
    notes: p.type('text').nullable(),
    createdByUserId: p.integer().nullable().fieldName('created_by_user_id'),
    createdByDisplayName: p
      .string()
      .nullable()
      .fieldName('created_by_display_name'),
    updatedByUserId: p.integer().nullable().fieldName('updated_by_user_id'),
    updatedByDisplayName: p
      .string()
      .nullable()
      .fieldName('updated_by_display_name'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .fieldName('updated_at')
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    deletedAt: p.datetime().nullable().fieldName('deleted_at'),
  },
});

export type InventoryItem = InferEntity<typeof InventoryItem>;
