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
});
