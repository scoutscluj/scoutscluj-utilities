import { defineEntity, p, type InferEntity } from '@mikro-orm/core';

export const FinancialDocumentHandoffAttempt = defineEntity({
  name: 'FinancialDocumentHandoffAttempt',
  tableName: 'financial_document_handoff_attempts',
  properties: {
    id: p.integer().primary().autoincrement(),
    documentId: p.integer().fieldName('document_id'),
    actorId: p.integer().nullable().fieldName('actor_id'),
    channel: p.string().default('email'),
    provider: p.string().default('gmail'),
    status: p.string(),
    senderEmail: p.string().fieldName('sender_email'),
    recipientEmail: p.string().fieldName('recipient_email'),
    subject: p.string(),
    attachmentFilename: p.string().fieldName('attachment_filename'),
    providerMessageId: p.string().nullable().fieldName('provider_message_id'),
    errorMessage: p.type('text').nullable().fieldName('error_message'),
    createdAt: p
      .datetime()
      .fieldName('created_at')
      .onCreate(() => new Date()),
  },
});

export type FinancialDocumentHandoffAttempt = InferEntity<
  typeof FinancialDocumentHandoffAttempt
>;
