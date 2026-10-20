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
	ledger.checkouts.some((c) => c.id === receipt.checkoutId && c.purpose === 'admission')
		? 0
		: receipt.amountBani -
			receipt.refundedBani -
			[...ledger.allocations, ...(ledger.admissionAllocations ?? [])]
				.filter((a) => a.receiptId === receipt.id && !a.reversed)
				.reduce((sum, a) => sum + a.amountBani, 0);

export const needsPaymentReview = (ledger: Dashboard, obligation: Obligation) =>
	Boolean(obligation.reviewState) ||
	ledger.checkouts.some(
		(checkout) =>
			checkout.purpose !== 'admission' &&
			checkout.periodId === obligation.periodId &&
			(checkout.obligationId === obligation.id ||
				checkout.identifier === String(obligation.orgoUserId) ||
				checkout.identifier === obligation.cardId) &&
			(checkout.state === 'unknown' || checkout.reviewRequired)
	) ||
	ledger.allocations.some(
		(allocation) =>
			allocation.obligationId === obligation.id &&
			!allocation.reversed &&
			ledger.receipts.some(
				(receipt) => receipt.id === allocation.receiptId && receipt.reviewRequired
			)
	);

export type MembershipAdminForm = {
	message?: string;
	success?: boolean;
	preview?: import('./types').RosterPreview;
};

export function membershipProgress(ledger: Dashboard, periodId?: string) {
	const obligations = ledger.obligations.filter(
		(o) => o.periodId === periodId && o.collectionEnabled !== false
	);
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

// The badge belongs to the period of the admission payment, not every later year.
export function admissionPaidInPeriod(ledger: Dashboard, obligation: Obligation) {
	const canonical = ledger.admissionMembers?.find((m) => m.orgoUserId === obligation.orgoUserId);
	if (canonical && !canonical.paid) return false;
	const rows = (ledger.admissionAllocations ?? []).filter(
		(a) => a.orgoUserId === obligation.orgoUserId && !a.reversed
	);
	const manualPaid =
		ledger.admissionMembers?.find((m) => m.orgoUserId === obligation.orgoUserId)?.paid ??
		(rows.length > 0 && rows.reduce((s, a) => s + a.amountBani, 0) >= rows[0].expectedBani);
	if (
		manualPaid &&
		rows.some((a) =>
			ledger.receipts.some(
				(r) => r.id === a.receiptId && r.periodId === obligation.periodId && !r.reviewRequired
			)
		)
	)
		return true;
	return ledger.checkouts.some(
		(checkout) =>
			checkout.purpose === 'admission' &&
			checkout.obligationId === obligation.id &&
			checkout.periodId === obligation.periodId &&
			checkout.state === 'succeeded' &&
			!checkout.reviewRequired &&
			ledger.receipts.some(
				(receipt) =>
					receipt.checkoutId === checkout.id &&
					!receipt.reviewRequired &&
					receipt.amountBani - receipt.refundedBani >= checkout.amountBani
			)
	);
}
