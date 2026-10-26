export type FeePlan = { label: string; totalBani: number; nationalBani: number; baseBani?: number };
export type Period = {
	id: string;
	name: string;
	startsOn: string;
	endsOn: string;
	active: boolean;
	prices: Record<string, FeePlan>;
};
export type Obligation = {
	feePlanSyncState?: string | null;
	collectionEnabled?: boolean;
	id: string;
	periodId: string;
	orgoUserId: number;
	cardId?: string;
	memberName: string;
	plan: string;
	totalBani: number;
	nationalBani: number;
	nationalDirectBani?: number;
	paidBani?: number;
	admissionPaid?: boolean;
	admissionAmountBani?: number;
	admissionEligible?: boolean;
	orgoLastSyncedAt?: string;
	reviewState?: string | null;
	reviewReason?: string | null;
};
export type ObligationReview = {
	obligationId: string;
	periodName: string;
	reviewState: string | null;
	reviewReason: string | null;
	currentPlan: string;
	currentTotalBani: number;
	currentNationalBani: number;
	orgoPlan: string | null;
	proposedTotalBani: number | null;
	proposedNationalBani: number | null;
	paidBani: number;
	remainingBani: number | null;
	resultingState: 'paid' | 'partial' | 'unpaid';
	canResolve: boolean;
	resumesNationalReview: boolean;
	blockers: Array<{ target: 'orgo' | 'payments' | 'receipts' | 'transfers'; message: string }>;
	version: string;
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
	orgoError?: string | null;
	orgoLastAttemptAt?: string | null;
	evidence?: string;
};
export type AdmissionAllocation = {
	id: string;
	receiptId: string;
	orgoUserId: number;
	amountBani: number;
	expectedBani: number;
	reversed: boolean;
	note: string;
};
export type Dashboard = {
	admissionAllocations?: AdmissionAllocation[];
	admissionMembers?: {
		orgoUserId: number;
		name: string;
		expectedBani: number;
		inactive?: boolean;
		paid: boolean;
		receivedBani: number;
	}[];
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
		obligationId?: string | null;
		providerId?: string | null;
		environment?: string;
		createdAt?: string;
		periodId: string;
		identifier: string;
		purpose?: 'membership' | 'admission';
		plan: string;
		state: string;
		amountBani: number;
		provider: 'netopia' | 'stripe';
		reviewRequired: boolean;
	}>;
	cardEnabled: boolean;
	paymentConfiguration: {
		activeProvider: 'netopia' | 'stripe';
		activeEnvironment: 'sandbox' | 'test' | 'live';
		vaultReady: boolean;
		providers: Array<{
			id: 'netopia' | 'stripe';
			targetId: string;
			label: string;
			ready: boolean;
			processingFee: { percentageBasisPoints: number; fixedBani: number };
			environment: string;
			secretHint: string | null;
			updatedAt: string | null;
		}>;
	};
	orgoIntegration: string;
	rosterSync: null | {
		id: string;
		periodId: string;
		mode: 'initialization' | 'manual' | 'automatic';
		status: 'running' | 'succeeded' | 'failed';
		summary: { added?: number; updated?: number; review?: number; unchanged?: number };
		error?: string;
		createdAt: string;
		completedAt?: string;
	};
	rosterInitialized: boolean;
};

export type RosterPreview = {
	period: { id: string; name: string; startsOn: string; endsOn: string };
	members: Array<{
		orgoUserId: number;
		cardId?: string;
		memberName: string;
		plan: string;
		totalBani: number;
		action: 'add' | 'verify';
	}>;
	issues: Array<{ orgoUserId: number; memberName: string; reason?: string }>;
	existingCount: number;
	newCount: number;
};
export type PaymentStatus = {
	purpose?: 'membership' | 'admission';
	environment: string;
	state: string;
	amountBani: number;
	provider: 'netopia' | 'stripe';
	requiresStaffReview: boolean;
	paymentUrl?: string | null;
};
export type GuestMemberLookup = {
	identifier: string;
	displayName: string;
	affiliation: string;
	amountBani: number;
	paid: boolean;
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

export const receiptMethodLabels: Record<string, string> = {
	bank: 'Transfer bancar',
	cash: 'Numerar',
	card: 'Card'
};
