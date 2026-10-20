import { describe, expect, it } from 'vitest';
import { membershipProgress, unallocatedAmount, admissionPaidInPeriod } from './admin-ledger';
import type { Dashboard } from './types';

const ledger: Dashboard = {
	periods: [],
	receipts: [],
	payouts: [],
	batches: [],
	nationalItems: [],
	checkouts: [],
	cardEnabled: false,
	orgoIntegration: '',
	rosterSync: null,
	rosterInitialized: true,
	paymentConfiguration: {
		activeProvider: 'netopia',
		activeEnvironment: 'live',
		vaultReady: true,
		providers: []
	},
	obligations: [
		{
			id: 'paid',
			periodId: 'current',
			orgoUserId: 1,
			memberName: 'Ana',
			plan: 'normal',
			totalBani: 30000,
			nationalBani: 15000
		},
		{
			id: 'partial',
			periodId: 'current',
			orgoUserId: 2,
			memberName: 'Dan',
			plan: 'normal',
			totalBani: 30000,
			nationalBani: 15000
		},
		{
			id: 'old',
			periodId: 'previous',
			orgoUserId: 3,
			memberName: 'Ioana',
			plan: 'normal',
			totalBani: 30000,
			nationalBani: 15000
		}
	],
	allocations: [
		{
			id: '1',
			receiptId: 'r1',
			obligationId: 'paid',
			amountBani: 30000,
			reversed: false,
			note: ''
		},
		{
			id: '2',
			receiptId: 'r2',
			obligationId: 'partial',
			amountBani: 10000,
			reversed: false,
			note: ''
		},
		{
			id: '3',
			receiptId: 'r3',
			obligationId: 'partial',
			amountBani: 20000,
			reversed: true,
			note: ''
		},
		{ id: '4', receiptId: 'r4', obligationId: 'old', amountBani: 30000, reversed: false, note: '' }
	]
};

describe('membership collection progress', () => {
	it('excludes withdrawn member balances from arrears totals without deleting payment history', () => {
		const copy = structuredClone(ledger);
		copy.obligations = copy.obligations.map((o) => ({ ...o, collectionEnabled: false }));
		expect(membershipProgress(copy, 'current')).toMatchObject({
			members: 0,
			totalBani: 0,
			remainingBani: 0
		});
		expect(copy.allocations).toEqual(ledger.allocations);
	});
	it('counts selected-period allocations, includes partial payments, and excludes reversed history', () => {
		expect(membershipProgress(ledger, 'current')).toEqual({
			members: 2,
			paidMembers: 1,
			totalBani: 60000,
			collectedBani: 40000,
			remainingBani: 20000,
			percent: 67
		});
		expect(membershipProgress(ledger, 'previous').percent).toBe(100);
	});
	it('shows zero progress for an empty period', () => {
		expect(membershipProgress(ledger, 'missing')).toMatchObject({
			members: 0,
			paidMembers: 0,
			percent: 0,
			totalBani: 0
		});
	});
	it('does not count a member awaiting review as fully settled', () => {
		const reviewed = structuredClone(ledger);
		reviewed.obligations[0].reviewState = 'orgo_review';
		expect(membershipProgress(reviewed, 'current').paidMembers).toBe(0);
	});
	it('retains payment reviews by canonical obligation even after the card identifier changes', () => {
		const reviewed = structuredClone(ledger);
		reviewed.checkouts.push({
			id: 'attempt',
			obligationId: 'paid',
			periodId: 'current',
			identifier: 'OLD-CARD',
			plan: 'normal',
			state: 'succeeded',
			amountBani: 30000,
			provider: 'stripe',
			reviewRequired: true
		});
		expect(membershipProgress(reviewed, 'current').paidMembers).toBe(0);
	});
	it('keeps a flagged allocated receipt under review until reconciliation', () => {
		const reviewed = structuredClone(ledger);
		reviewed.receipts.push({
			id: 'r1',
			periodId: 'current',
			amountBani: 30000,
			refundedBani: 0,
			method: 'bank',
			receivedOn: '2026-10-19',
			note: '',
			reference: 'BT-review',
			reviewRequired: true
		});
		expect(membershipProgress(reviewed, 'current').paidMembers).toBe(0);
		reviewed.receipts[0].reviewRequired = false;
		expect(membershipProgress(reviewed, 'current').paidMembers).toBe(1);
	});
});

describe('admission marker', () => {
	it.each([5500, 10500])(
		'marks only a fully confirmed %i bani admission in its period',
		async (amountBani) => {
			const { admissionPaidInPeriod, unallocatedAmount } = await import('./admin-ledger');
			const admission = structuredClone(ledger);
			const member = admission.obligations[0];
			admission.checkouts.push({
				id: 'admission',
				obligationId: member.id,
				periodId: member.periodId,
				identifier: '1',
				plan: 'normal',
				purpose: 'admission',
				state: 'pending',
				amountBani,
				provider: 'netopia',
				reviewRequired: false
			});
			admission.receipts.push({
				id: 'admission-receipt',
				checkoutId: 'admission',
				periodId: member.periodId,
				amountBani,
				refundedBani: 0,
				method: 'card',
				receivedOn: '2026-10-19',
				note: 'Adeziune',
				reference: 'admission',
				reviewRequired: false
			});
			expect(admissionPaidInPeriod(admission, member)).toBe(false);
			admission.checkouts[0].state = 'unknown';
			expect(membershipProgress(admission, 'current')).toEqual(
				membershipProgress(ledger, 'current')
			);
			admission.checkouts[0].state = 'succeeded';
			expect(admissionPaidInPeriod(admission, member)).toBe(true);
			expect(admissionPaidInPeriod(admission, { ...member, id: 'later', periodId: 'later' })).toBe(
				false
			);
			expect(membershipProgress(admission, 'current')).toEqual(
				membershipProgress(ledger, 'current')
			);
			expect(unallocatedAmount(admission, admission.receipts[0])).toBe(0);
			admission.receipts[0].refundedBani = 1;
			expect(admissionPaidInPeriod(admission, member)).toBe(false);
			admission.receipts[0].refundedBani = 0;
			admission.receipts[0].reviewRequired = true;
			expect(admissionPaidInPeriod(admission, member)).toBe(false);
		}
	);
});

describe('manual admission display and receipt availability', () => {
	it('subtracts both destinations and refunds without changing membership collection totals', () => {
		const copy = structuredClone(ledger);
		const receipt = {
			id: 'mixed',
			periodId: 'current',
			amountBani: 20500,
			refundedBani: 500,
			method: 'bank',
			receivedOn: '2026-10-20',
			reference: 'BT',
			note: 'Extras',
			reviewRequired: false
		};
		copy.receipts.push(receipt);
		copy.allocations.push({
			id: 'fee',
			receiptId: 'mixed',
			obligationId: 'partial',
			amountBani: 5000,
			reversed: false,
			note: 'Cotizație'
		});
		copy.admissionAllocations = [
			{
				id: 'admission',
				receiptId: 'mixed',
				orgoUserId: 2,
				amountBani: 10500,
				expectedBani: 10500,
				reversed: false,
				note: 'Adeziune'
			}
		];
		expect(unallocatedAmount(copy, receipt)).toBe(4500);
		expect(membershipProgress(copy, 'current').collectedBani).toBe(45000);
		copy.admissionAllocations[0].reversed = true;
		expect(unallocatedAmount(copy, receipt)).toBe(15000);
	});
	it('uses canonical paid evidence while keeping the badge in the receipt year', () => {
		const copy = structuredClone(ledger),
			obligation = copy.obligations[0];
		copy.receipts.push({
			id: 'historic',
			periodId: 'previous',
			amountBani: 5500,
			refundedBani: 0,
			method: 'bank',
			receivedOn: '2025-10-20',
			reference: 'BT',
			note: 'Extras',
			reviewRequired: false
		});
		copy.admissionAllocations = [
			{
				id: 'admission',
				receiptId: 'historic',
				orgoUserId: 1,
				amountBani: 5500,
				expectedBani: 5500,
				reversed: false,
				note: 'Adeziune istorică'
			}
		];
		copy.admissionMembers = [
			{ orgoUserId: 1, name: 'Ana', expectedBani: 5500, paid: true, receivedBani: 5500 }
		];
		expect(admissionPaidInPeriod(copy, obligation)).toBe(false);
		expect(
			admissionPaidInPeriod(copy, { ...obligation, id: 'another-year', periodId: 'previous' })
		).toBe(true);
		copy.admissionMembers[0].paid = false;
		expect(admissionPaidInPeriod(copy, { ...obligation, periodId: 'previous' })).toBe(false);
	});
});
