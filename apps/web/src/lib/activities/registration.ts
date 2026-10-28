import type { FormField, OrganizerDraft } from '@scouts-cluj/parental-consent-schema';
export type Answer = string | number | boolean | string[];
export type RegistrationIssue = { field: string; label: string; message: string };
export function registrationIssues(value: unknown): RegistrationIssue[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(item: unknown): item is RegistrationIssue =>
			typeof item === 'object' &&
			item !== null &&
			'field' in item &&
			typeof item.field === 'string' &&
			'label' in item &&
			typeof item.label === 'string' &&
			'message' in item &&
			typeof item.message === 'string'
	);
}
export class RegistrationError extends Error {
	constructor(
		message: string,
		public status: number,
		public issues: RegistrationIssue[] = []
	) {
		super(message);
		this.name = 'RegistrationError';
	}
}
export type Publication = {
	revision: number;
	published: boolean;
	public: boolean;
	state: 'draft' | 'published' | 'ended' | 'cancelled';
};
export type Question = {
	code: string;
	label: string;
	type: 'text' | 'choice' | 'multiple' | 'number' | 'date';
	required: boolean;
	options: string[];
	branches: string[];
	inPdf: boolean;
};
export type RegistrationSettings = {
	coverImageUrl?: string;
	unitActivities?: Record<string, string>;
	consent?: import('@scouts-cluj/parental-consent-schema').FixedConsentDetails | null;
	published: boolean;
	opensAt: string;
	closesAt: string;
	approvalRequired: boolean;
	paymentConfirmsPlace: boolean;
	paymentDue: string;
	beneficiaryCapacity: number | null;
	staffCapacity: number | null;
	totalCapacity: number | null;
	branchCapacities: Record<string, number>;
	structureIds: string[];
	unitIds: string[];
	groupIds: string[];
	feeBani: number;
	branchFees: Record<string, number>;
	familyFees: number[];
	installments: { amountBani: number; due: string; key?: string; method?: 'platform' | 'cash' }[];
	questions: Question[];
	medicalUserIds: number[];
	administrativeUserIds: number[];
	terms: string;
};
export type PublicActivity = {
	canManage: boolean;
	activity: {
		id: number;
		title: string;
		description?: string;
		location?: string;
		startDate?: string;
		endDate?: string;
	};
	settings: Omit<RegistrationSettings, 'medicalUserIds' | 'administrativeUserIds'>;
	eligibleBranches?: string[];
	fields: FormField[];
	information: OrganizerDraft | null;
	counts: { beneficiaries: number; staff: number };
};
export type Entry = {
	id: string;
	method: string;
	amountBani: number;
	receivedOn: string;
	note: string;
	reversedEntryId?: string;
};
export type Registration = {
	id: string;
	orgoId: number;
	memberName: string;
	branch: string;
	role: string;
	state: string;
	minor?: boolean;
	handoffPaperReady?: boolean;
	consentState: string;
	totalBani?: number;
	unitId?: string;
	cardRemainingBani?: number;
	cashRemainingBani?: number;
	cashInstallments?: { key: string; amountBani: number; due: string; remainingBani: number }[];
	remainingBani?: number;
	excessBani?: number;
	cashBani?: number;
	supportBani?: number;
	coveredBani?: number;
	paymentState?: string;
	installment?: { amountBani: number; due: string };
	paymentDue?: string;
	revision: number;
	answers?: Record<string, Answer>;
	email?: string;
	familyKey?: string;
	familyPlan?: string;
	mailState?: string;
	answerRevision?: number;
	consentPublicationId?: number;
	questions?: Question[];
	canEdit?: boolean;
	refundDueBani?: number | null;
	refundedBani?: number;
	refundRemainingBani?: number;
	entries?: Entry[];
	documents?: {
		id: string;
		kind: string;
		filename: string;
		publicationId: number;
		answerRevision: number;
		createdAt: string;
	}[];
	payments?: { id: string; state: string; amountBani: number; reviewRequired: boolean }[];
};
export type Overview = {
	mailConfigured?: boolean;
	revision: number;
	settings: RegistrationSettings | null;
	capabilities: { manage: boolean; finance: boolean; sensitive: boolean; consent: boolean };
	rows: Registration[];
	priceAdvice: {
		recommendedBani: number;
		estimatedFeeBani: number;
		estimatedNetBani: number;
		fee: { percentageBasisPoints: number; fixedBani: number };
	} | null;
	lists?: {
		structures: { id: string; name: string }[];
		units: { id: string; name: string; structureId: string; branch?: string }[];
		groups: { id: string; name: string; parentId: string }[];
	};
};
export const money = (bani: number | undefined) =>
	new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format((bani ?? 0) / 100);
export const states: Record<string, string> = {
	pending: 'Așteaptă aprobarea',
	waitlisted: 'Pe lista de așteptare',
	reserved: 'Loc rezervat — așteaptă plata',
	accepted: 'Participare confirmată',
	withdrawn: 'Retras',
	rejected: 'Respins',
	awaiting: 'Acord de predat',
	update_required: 'Necesită acord actualizat',
	uploaded: 'PDF încărcat — de verificat',
	paper_received: 'Acord fizic primit',
	signed_accepted: 'Acord digital acceptat',
	not_required: 'Fără acord parental',
	paid: 'Taxă acoperită',
	partial: 'Acoperită parțial',
	unpaid: 'Neachitată',
	unknown: 'Plată în verificare',
	succeeded: 'Plată confirmată',
	failed: 'Plată nereușită',
	created: 'Plată în curs'
};
export async function registrationRequest<T>(
	activityId: number,
	path: string,
	body?: unknown,
	token?: string,
	method = 'POST'
): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`/activitati/${activityId}/api/${path}`, {
			method,
			headers: {
				'Content-Type': 'application/json',
				...(token ? { 'x-registration-token': token } : {})
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) })
		});
	} catch {
		throw new RegistrationError(
			'Conexiunea a fost întreruptă. Datele introduse sunt păstrate. Verifică internetul și încearcă din nou.',
			0
		);
	}
	const value = await response
		.json()
		.catch(() => ({ message: 'Răspunsul aplicației nu a putut fi citit. Reîncearcă.' }));
	if (!response.ok)
		throw new RegistrationError(
			response.status >= 500
				? 'Operațiunea nu a putut fi finalizată momentan. Informațiile introduse au fost păstrate. Încearcă din nou.'
				: Array.isArray(value.message)
					? value.message.join('\n')
					: (value.message ?? 'Operațiunea nu a reușit.'),
			response.status,
			registrationIssues(value.issues)
		);
	return value as T;
}
