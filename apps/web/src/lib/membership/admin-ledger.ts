import type { Dashboard, Obligation, Receipt } from './types';

export const feePlans = [
	['normal', 'Normală', 300],
	['fam1', 'Fam 1', 300],
	['fam2', 'Fam 2', 150],
	['fam3', 'Fam 3', 75],
	['social', 'Socială', 100]
] as const;

export const allocatedAmount = (ledger: Dashboard, obligationId: string) =>
	ledger.allocations
		.filter((a) => a.obligationId === obligationId && !a.reversed)
		.reduce((sum, a) => sum + a.amountBani, 0);

export const unallocatedAmount = (ledger: Dashboard, receipt: Receipt) =>
	receipt.amountBani -
	receipt.refundedBani -
	ledger.allocations
		.filter((a) => a.receiptId === receipt.id && !a.reversed)
		.reduce((sum, a) => sum + a.amountBani, 0);

export const needsPaymentReview = (ledger: Dashboard, obligation: Obligation) =>
	Boolean(obligation.reviewState) ||
	ledger.checkouts.some(
		(checkout) =>
			checkout.periodId === obligation.periodId &&
			(checkout.identifier === String(obligation.orgoUserId) ||
				checkout.identifier === obligation.cardId) &&
			(checkout.state === 'unknown' || checkout.reviewRequired)
	);

export type MembershipAdminForm = {
	message?: string;
	success?: boolean;
	preview?: import('./types').RosterPreview;
};

export function membershipProgress(ledger: Dashboard, periodId?: string) {
	const obligations = ledger.obligations.filter((o) => o.periodId === periodId);
	const totalBani = obligations.reduce((sum, o) => sum + o.totalBani, 0);
	const collectedBani = obligations.reduce(
		(sum, o) => sum + Math.min(o.totalBani, Math.max(0, allocatedAmount(ledger, o.id))),
		0
	);
	const paidMembers = obligations.filter(
		(o) => !needsPaymentReview(ledger, o) && allocatedAmount(ledger, o.id) >= o.totalBani
	).length;
	return {
		members: obligations.length,
		paidMembers,
		totalBani,
		collectedBani,
		remainingBani: Math.max(0, totalBani - collectedBani),
		percent: totalBani > 0 ? Math.round((collectedBani / totalBani) * 100) : 0
	};
}
