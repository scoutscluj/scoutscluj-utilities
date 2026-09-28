export type FeePlan = { label: string; totalBani: number; nationalBani: number };
export type Period = {
	id: string;
	name: string;
	startsOn: string;
	endsOn: string;
	active: boolean;
	prices: Record<string, FeePlan>;
};
export type Obligation = {
	id: string;
	periodId: string;
	orgoUserId: number;
	cardId?: string;
	memberName: string;
	plan: string;
	totalBani: number;
	nationalBani: number;
	paidBani?: number;
};
export type Receipt = {
	id: string;
	periodId: string;
	checkoutId?: string;
	amountBani: number;
	refundedBani: number;
	payoutId?: string;
	method: string;
	receivedOn: string;
	note: string;
	reference: string;
	reviewRequired: boolean;
};
export type Allocation = {
	id: string;
	receiptId: string;
	obligationId: string;
	amountBani: number;
	reversed: boolean;
	note: string;
};
export type NationalItem = {
	id: string;
	batchId: string;
	obligationId: string;
	amountBani: number;
	orgoState: string;
	evidence?: string;
};
export type Dashboard = {
	payouts: Array<{
		id: string;
		reference: string;
		receivedOn: string;
		grossBani: number;
		refundedBani: number;
		chargesBani: number;
		netBani: number;
	}>;
	periods: Period[];
	obligations: Obligation[];
	receipts: Receipt[];
	allocations: Allocation[];
	batches: Array<{ id: string; totalBani: number; transferredOn: string; reference: string }>;
	nationalItems: NationalItem[];
	checkouts: Array<{
		id: string;
		identifier: string;
		plan: string;
		state: string;
		amountBani: number;
		provider: 'netopia' | 'stripe';
		reviewRequired: boolean;
	}>;
	cardEnabled: boolean;
	paymentConfiguration: {
		activeProvider: 'netopia' | 'stripe';
		providers: Array<{
			id: 'netopia' | 'stripe';
			label: string;
			ready: boolean;
			environment: string;
		}>;
	};
	orgoIntegration: string;
};
export type PaymentStatus = {
	state: string;
	amountBani: number;
	provider: 'netopia' | 'stripe';
	requiresStaffReview: boolean;
	paymentUrl?: string | null;
};
export const money = (bani: number) =>
	new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(bani / 100);
export const paymentLabels: Record<string, string> = {
	starting: 'Inițiere în curs',
	pending: 'În așteptarea confirmării',
	unknown: 'Necesită verificare financiară',
	succeeded: 'Plată primită',
	failed: 'Plată nereușită'
};
