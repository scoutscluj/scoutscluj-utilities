import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { Prices } from '../membership.rules';

const id = () =>
  p
    .uuid()
    .primary()
    .onCreate(() => randomUUID());
const created = () => p.datetime().onCreate(() => new Date());

export const MembershipPeriod = defineEntity({
  name: 'MembershipPeriod',
  tableName: 'membership_periods',
  properties: {
    id: id(),
    name: p.string(),
    startsOn: p.string(),
    endsOn: p.string(),
    prices: p.json<Prices>(),
    active: p.boolean().default(false),
    createdAt: created(),
  },
});
export type MembershipPeriod = InferEntity<typeof MembershipPeriod>;

export const MembershipPaymentSettings = defineEntity({
  name: 'MembershipPaymentSettings',
  tableName: 'membership_payment_settings',
  properties: {
    id: p.string().primary(),
    activeProvider: p.string().default('netopia'),
    activeEnvironment: p.string().default('sandbox'),
    updatedBy: p.integer().nullable(),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});
export type MembershipPaymentSettings = InferEntity<
  typeof MembershipPaymentSettings
>;

export const MembershipPaymentProviderConfig = defineEntity({
  name: 'MembershipPaymentProviderConfig',
  tableName: 'membership_payment_provider_configs',
  properties: {
    id: id(),
    provider: p.string(),
    active: p.boolean().default(true),
    environment: p.string(),
    encryptedConfiguration: p.text(),
    secretHint: p.string(),
    updatedBy: p.integer(),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});
export type MembershipPaymentProviderConfig = InferEntity<
  typeof MembershipPaymentProviderConfig
>;

export const MembershipObligation = defineEntity({
  name: 'MembershipObligation',
  tableName: 'membership_obligations',
  uniques: [{ properties: ['periodId', 'orgoUserId'] }],
  properties: {
    id: id(),
    periodId: p.uuid(),
    orgoUserId: p.integer(),
    cardId: p.string().nullable(),
    memberName: p.string(),
    plan: p.string(),
    totalBani: p.integer(),
    nationalBani: p.integer(),
    verificationNote: p.text(),
    createdAt: created(),
  },
});
export type MembershipObligation = InferEntity<typeof MembershipObligation>;

export const MembershipCheckout = defineEntity({
  name: 'MembershipCheckout',
  tableName: 'membership_checkouts',
  properties: {
    id: id(),
    tokenHash: p.string().unique(),
    periodId: p.uuid(),
    obligationId: p.uuid().nullable(),
    identifier: p.string(),
    identifierKind: p.string(),
    plan: p.string(),
    amountBani: p.integer(),
    provider: p.string(),
    providerConfigId: p.uuid().nullable(),
    environment: p.string(),
    state: p.string(),
    paymentUrl: p.text().nullable(),
    providerId: p.string().nullable().unique(),
    reviewRequired: p.boolean().default(false),
    termsVersion: p.string(),
    termsAcceptedAt: p.datetime(),
    createdAt: created(),
  },
});
export type MembershipCheckout = InferEntity<typeof MembershipCheckout>;

export const MembershipReceipt = defineEntity({
  name: 'MembershipReceipt',
  tableName: 'membership_receipts',
  properties: {
    id: id(),
    periodId: p.uuid(),
    checkoutId: p.uuid().nullable().unique(),
    amountBani: p.integer(),
    refundedBani: p.integer().default(0),
    payoutId: p.uuid().nullable(),
    method: p.string(),
    receivedOn: p.string(),
    note: p.text(),
    reference: p.string(),
    actorId: p.integer().nullable(),
    reviewRequired: p.boolean().default(false),
    createdAt: created(),
  },
});
export type MembershipReceipt = InferEntity<typeof MembershipReceipt>;

export const MembershipPayout = defineEntity({
  name: 'MembershipPayout',
  tableName: 'membership_payouts',
  properties: {
    id: id(),
    reference: p.string().unique(),
    receivedOn: p.string(),
    grossBani: p.integer(),
    refundedBani: p.integer(),
    chargesBani: p.integer(),
    netBani: p.integer(),
    note: p.text(),
    actorId: p.integer(),
    createdAt: created(),
  },
});
export type MembershipPayout = InferEntity<typeof MembershipPayout>;

export const MembershipAllocation = defineEntity({
  name: 'MembershipAllocation',
  tableName: 'membership_allocations',
  properties: {
    id: id(),
    receiptId: p.uuid(),
    obligationId: p.uuid(),
    amountBani: p.integer(),
    actorId: p.integer().nullable(),
    reversed: p.boolean().default(false),
    note: p.text(),
    createdAt: created(),
  },
});
export type MembershipAllocation = InferEntity<typeof MembershipAllocation>;

export const MembershipNationalBatch = defineEntity({
  name: 'MembershipNationalBatch',
  tableName: 'membership_national_batches',
  properties: {
    id: id(),
    transferredOn: p.string(),
    reference: p.string(),
    note: p.text(),
    totalBani: p.integer(),
    actorId: p.integer(),
    createdAt: created(),
  },
});
export type MembershipNationalBatch = InferEntity<
  typeof MembershipNationalBatch
>;

export const MembershipNationalItem = defineEntity({
  name: 'MembershipNationalItem',
  tableName: 'membership_national_items',
  properties: {
    id: id(),
    batchId: p.uuid(),
    obligationId: p.uuid().unique(),
    amountBani: p.integer(),
    orgoState: p.string().default('awaiting_access'),
    evidence: p.text().nullable(),
  },
});
export type MembershipNationalItem = InferEntity<typeof MembershipNationalItem>;

export const MembershipProviderEvent = defineEntity({
  name: 'MembershipProviderEvent',
  tableName: 'membership_provider_events',
  properties: {
    id: id(),
    hash: p.string().unique(),
    checkoutId: p.uuid(),
    provider: p.string(),
    providerStatus: p.string(),
    amountBani: p.integer(),
    createdAt: created(),
  },
});

export const MEMBERSHIP_ENTITIES = [
  MembershipPayout,
  MembershipPaymentSettings,
  MembershipPaymentProviderConfig,
  MembershipPeriod,
  MembershipObligation,
  MembershipCheckout,
  MembershipReceipt,
  MembershipAllocation,
  MembershipNationalBatch,
  MembershipNationalItem,
  MembershipProviderEvent,
];
