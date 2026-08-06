import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const InventoryItemImage = defineEntity({
  name: 'InventoryItemImage',
  tableName: 'inventory_item_images',
  indexes: [{ properties: ['inventoryItemId'] }],
  uniques: [{ properties: ['inventoryItemId'] }],
  properties: {
    id: p.integer().primary().autoincrement(),
    inventoryItemId: p.integer().fieldName('inventory_item_id'),
    originalFilename: p.string().fieldName('original_filename'),
    contentType: p.string().fieldName('content_type'),
    fileSize: p.integer().fieldName('file_size'),
    checksumSha256: p.string().fieldName('checksum_sha256'),
    fileData: p.type('bytea').fieldName('file_data'),
    uploadedByUserId: p.integer().nullable().fieldName('uploaded_by_user_id'),
    uploadedByDisplayName: p
      .string()
      .nullable()
      .fieldName('uploaded_by_display_name'),
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

export type InventoryItemImage = InferEntity<typeof InventoryItemImage>;
