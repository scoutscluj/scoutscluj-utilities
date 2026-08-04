import type {
	BranchCode,
	LayoutSettings,
	OrganizerDraft,
	OrganizationSettings,
	TemplateDocument,
	TemplateStatus,
	ValidationIssue
} from '@scouts-cluj/parental-consent-schema';

export type ParentalConsentAsset = {
	id: number;
	name: string;
	altText: string;
	contentType: string;
	fileSize: number;
	width: number;
	height: number;
	checksumSha256: string;
	createdAt: string;
};

export type ParentalConsentOrganization = OrganizationSettings & {
	revision: number;
	updatedAt: string;
};

export type ParentalConsentTemplate = {
	id: number;
	version: number;
	name: string;
	status: TemplateStatus;
	schemaVersion: number;
	document: TemplateDocument;
	layout: LayoutSettings;
	basedOnVersionId?: number;
	createdById?: number;
	activatedById?: number;
	activatedAt?: string;
	createdAt: string;
	updatedAt: string;
};

export type ParentalConsentDraft = {
	id: number;
	activityId: number;
	schemaVersion: number;
	revision: number;
	data: OrganizerDraft;
	issues: ValidationIssue[];
	changedPaths: string[];
	hasPublishedVersion: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ParentalConsentDocument = {
	id: number;
	branch: BranchCode;
	filename: string;
	contentType: string;
	fileSize: number;
	checksumSha256: string;
};

export type ParentalConsentPublication = {
	id: number;
	reference: string;
	activityId: number;
	status: 'active' | 'archived';
	templateVersionId: number;
	templateVersion: number;
	draftRevision: number;
	publishedById: number;
	createdAt: string;
	archivedAt?: string;
	documents: ParentalConsentDocument[];
};
