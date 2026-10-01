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
