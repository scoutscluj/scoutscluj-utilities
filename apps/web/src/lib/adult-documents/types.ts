export const documentKinds = ['behavioural_integrity'] as const;
export type DocumentKind = (typeof documentKinds)[number];
export type DocumentStatus = 'missing' | 'pending' | 'validated' | 'rejected';
export const documentLabels: Record<DocumentKind, string> = {
	behavioural_integrity: 'Certificat de integritate comportamentală'
};
export const statusLabels: Record<DocumentStatus, string> = {
	missing: 'Lipsește',
	pending: 'În verificare',
	validated: 'Validat',
	rejected: 'Respins'
};
export type DocumentVersion = {
	id: string;
	kind: DocumentKind;
	version: number;
	status: Exclude<DocumentStatus, 'missing'>;
	filename: string;
	contentType: string;
	size: number;
	uploadedAt: string;
	uploaderName: string;
	reviewedAt: string | null;
	reviewerName: string | null;
	rejectionReason: string | null;
};
export type Dossier = {
	memberId: string;
	name: string;
	birthDate: string | null;
	eligible: boolean | null;
	year: number;
	currentYear: number;
	years: number[];
	complete: boolean;
	canReview: boolean;
	documents: DocumentVersion[];
};
export type MineDocuments = {
	eligible: boolean | null;
	reason: string | null;
	dossier: Dossier | null;
};
export type DocumentWorkspace = {
	year: number;
	currentYear: number;
	years: number[];
	rows: {
		memberId: string;
		name: string;
		structureId: string;
		statuses: DocumentStatus[];
		complete: boolean;
	}[];
	total: number;
	loadedTotal: number;
	unknownBirthDates: number;
	page: number;
	pageSize: number;
};
export const yearLabel = (year: number) => `${year}–${year + 1}`;
export const documentDate = (date: string) =>
	new Intl.DateTimeFormat('ro-RO', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Europe/Bucharest'
	}).format(new Date(date));
export const currentDocument = (documents: DocumentVersion[], kind: DocumentKind) =>
	documents.filter((d) => d.kind === kind).sort((a, b) => b.version - a.version)[0];
