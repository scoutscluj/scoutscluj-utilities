import type { EntityManager } from '@mikro-orm/postgresql';
import { ScoutMember } from '../members/entities/member.entity';
import { AdmissionAllocation } from './entities/admission-allocation.entity';
import {
  MembershipObligation,
  MembershipCheckout,
  MembershipReceipt,
  MembershipAllocation,
} from './entities/membership.entity';
import { admissionFeeBani } from './membership.rules';

export async function admissionTariff(
  em: EntityManager,
  orgoUserId: number,
  name: string,
) {
  const member = await em.findOne(ScoutMember, { orgoId: orgoUserId });
  return memberAdmissionTariff(member, name);
}
export function memberAdmissionTariff(
  member:
    | Pick<ScoutMember, 'structureConfirmed' | 'structureId'>
    | null
    | undefined,
  name: string,
) {
  return member?.structureId
    ? member.structureId === 'floresti'
      ? 10500
      : 5500
    : admissionFeeBani(name);
}

// Canonical identity, not school year or current name, owns admission evidence.
export async function admissionEvidence(em: EntityManager, orgoUserId: number) {
  const obligations = await em.find(MembershipObligation, { orgoUserId });
  const attempts = obligations.length
    ? await em.find(MembershipCheckout, {
        obligationId: { $in: obligations.map((o) => o.id) },
        purpose: 'admission',
      })
    : [];
  const allocations = await em.find(AdmissionAllocation, {
    orgoUserId,
    reversed: false,
  });
  const receipts = await em.find(MembershipReceipt, {
    $or: [
      { checkoutId: { $in: attempts.map((a) => a.id) } },
      { id: { $in: allocations.map((a) => a.receiptId) } },
    ],
  });
  return resolveAdmissionEvidence(attempts, allocations, receipts);
}

export function resolveAdmissionEvidence(
  attempts: MembershipCheckout[],
  allocations: AdmissionAllocation[],
  receipts: MembershipReceipt[],
) {
  let receivedBani = 0,
    onlineExpected: number | null = null,
    blocked = false;
  for (const attempt of attempts) {
    const receipt = receipts.find((r) => r.checkoutId === attempt.id);
    if (
      attempt.state === 'succeeded' &&
      !attempt.reviewRequired &&
      receipt &&
      !receipt.reviewRequired &&
      receipt.amountBani - receipt.refundedBani >= attempt.amountBani
    ) {
      receivedBani += attempt.amountBani;
      onlineExpected ??= attempt.admissionExpectedBani ?? attempt.amountBani;
    }
    if (
      ['starting', 'pending', 'unknown'].includes(attempt.state) ||
      attempt.reviewRequired
    )
      blocked = true;
  }
  for (const allocation of allocations) {
    const receipt = receipts.find((r) => r.id === allocation.receiptId);
    if (receipt && !receipt.reviewRequired)
      receivedBani += allocation.amountBani;
    else blocked = true;
  }
  const expectedBani = allocations[0]?.expectedBani ?? onlineExpected;
  const paid = expectedBani !== null && receivedBani >= expectedBani;
  return {
    paid,
    paidAmountBani: paid ? expectedBani : null,
    expectedBani,
    receivedBani,
    blocked,
  };
}

export async function receiptAllocated(em: EntityManager, receiptId: string) {
  const [fees, admissions] = await Promise.all([
    em.find(MembershipAllocation, { receiptId, reversed: false }),
    em.find(AdmissionAllocation, { receiptId, reversed: false }),
  ]);
  return [...fees, ...admissions].reduce((sum, a) => sum + a.amountBani, 0);
}
