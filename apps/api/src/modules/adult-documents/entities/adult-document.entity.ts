import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { DocumentKind, DocumentStatus } from '../adult-documents.rules';
import { ScoutMember } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';

export const AdultDocument = defineEntity({
  name: 'AdultDocument',
  tableName: 'adult_documents',
  uniques: [{ properties: ['memberId', 'year', 'kind', 'version'] }],
  indexes: [{ properties: ['year', 'memberId'] }],
  checks: [
    {
      name: 'adult_documents_year_check',
      expression: 'year >= 2000 and year <= 9999',
    },
    { name: 'adult_documents_version_check', expression: '"version" > 0' },
    {
      name: 'adult_documents_status_check',
      expression: "\"status\" in ('pending', 'validated', 'rejected')",
    },
    {
      name: 'adult_documents_size_check',
      expression: '"size" > 0 and "size" <= 10485760',
    },
    {
      name: 'adult_documents_rejection_check',
      expression:
        "(((status)::text <> 'rejected'::text) OR ((rejection_reason IS NOT NULL) AND ((char_length(btrim(rejection_reason)) >= 1) AND (char_length(btrim(rejection_reason)) <= 2000))))",
    },
    {
      name: 'adult_documents_review_check',
      expression:
        '("status" = \'pending\' and "reviewer_id" is null and "reviewed_at" is null) or ("status" <> \'pending\' and "reviewer_id" is not null and "reviewed_at" is not null)',
    },
  ],
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    memberId: () =>
      p
        .manyToOne(ScoutMember)
        .mapToPk()
        .fieldName('member_id')
        .deleteRule('restrict')
        .updateRule('no action')
        .foreignKeyName('adult_documents_member_id_fkey'),
    year: p.integer(),
    kind: p
      .enum(() => ({ BehaviouralIntegrity: 'behavioural_integrity' as const }))
      .$type<DocumentKind>(),
    version: p.integer(),
    status: p.string().$type<DocumentStatus>().default('pending'),
    filename: p.string(),
    contentType: p.string(),
    size: p.integer(),
    uploaderId: () =>
      p
        .manyToOne(User)
        .mapToPk()
        .fieldName('uploader_id')
        .deleteRule('restrict')
        .updateRule('no action')
        .foreignKeyName('adult_documents_uploader_id_fkey'),
    uploadedAt: p.datetime().onCreate(() => new Date()),
    reviewerId: () =>
      p
        .manyToOne(User)
        .mapToPk()
        .fieldName('reviewer_id')
        .nullable()
        .deleteRule('restrict')
        .updateRule('no action')
        .foreignKeyName('adult_documents_reviewer_id_fkey'),
    reviewedAt: p.datetime().nullable(),
    rejectionReason: p.text().nullable(),
  },
});
export type AdultDocument = InferEntity<typeof AdultDocument>;

// Separate storage prevents dossier/list queries from loading or serializing bytes.
export const AdultDocumentFile = defineEntity({
  name: 'AdultDocumentFile',
  tableName: 'adult_document_files',
  properties: {
    id: () =>
      p
        .oneToOne(AdultDocument)
        .owner()
        .mapToPk()
        .primary()
        .fieldName('id')
        .deleteRule('cascade')
        .updateRule('no action')
        .foreignKeyName('adult_document_files_id_fkey'),
    data: p.type('bytea'),
  },
});
export type AdultDocumentFile = InferEntity<typeof AdultDocumentFile>;
