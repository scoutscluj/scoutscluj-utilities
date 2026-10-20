import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

export const AdmissionAllocation = defineEntity({
  name: 'AdmissionAllocation',
  tableName: 'membership_admission_allocations',
  properties: {
    id: p
      .uuid()
      .primary()
      .onCreate(() => randomUUID()),
    receiptId: p.uuid(),
    orgoUserId: p.integer(),
    amountBani: p.integer(),
    expectedBani: p.integer(),
    reversed: p.boolean().default(false),
    actorId: p.integer(),
    note: p.text(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});
export type AdmissionAllocation = InferEntity<typeof AdmissionAllocation>;
