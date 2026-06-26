import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const KitchenProcurementDocument = defineEntity({
  name: 'KitchenProcurementDocument',
  tableName: 'kitchen_procurement_documents',
  indexes: [
    { properties: ['procurementEventId'] },
    { properties: ['financialDocumentId'] },
  ],
  properties: {
    id: p.integer().primary().autoincrement(),
    procurementEventId: p.integer().fieldName('procurement_event_id'),
    financialDocumentId: p.integer().fieldName('financial_document_id'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type KitchenProcurementDocument = InferEntity<
  typeof KitchenProcurementDocument
>;
