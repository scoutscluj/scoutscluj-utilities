import { describe, expect, it } from 'vitest';
import { membershipProgress } from './admin-ledger';
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
