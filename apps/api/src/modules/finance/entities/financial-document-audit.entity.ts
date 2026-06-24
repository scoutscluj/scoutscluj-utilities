import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { FinancialDocumentStatus } from './financial-document-status.enum';

export const FinancialDocumentAudit = defineEntity({
  name: 'FinancialDocumentAudit',
  tableName: 'financial_document_audits',
  properties: {
    id: p.integer().primary().autoincrement(),
    documentId: p.integer().fieldName('document_id'),
    actorId: p.integer().fieldName('actor_id'),
    fromStatus: p
      .enum(() => FinancialDocumentStatus)
      .nullable()
      .nativeEnumName('financial_document_status')
      .fieldName('from_status'),
    toStatus: p
      .enum(() => FinancialDocumentStatus)
      .nativeEnumName('financial_document_status')
      .fieldName('to_status'),
    comment: p.type('text').nullable(),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type FinancialDocumentAudit = InferEntity<typeof FinancialDocumentAudit>;
