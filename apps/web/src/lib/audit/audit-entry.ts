export type AuditEntry = {
	id: number;
	actorId?: number;
	actorName?: string;
	action: string;
	entityType: string;
	entityId: string | number;
	activityId?: number;
	metadata?: Record<string, unknown>;
	createdAt: string;
};

export type AuditMetadataRow = {
	label: string;
	value: string;
};

export type AuditEntryDisplay = {
	title: string;
	summary: string;
	entityLabel: string;
	metadataRows: AuditMetadataRow[];
	rawDetails: string;
};

export const formatAuditDateTime = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat('ro-RO', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(date);
};
