export const financialStatusLabels: Record<string, string> = {
	uploaded: 'Încărcat',
	in_review: 'În verificare',
	ready_to_send: 'Gata de trimis',
	sent: 'Trimis',
	send_failed: 'Trimitere eșuată',
	needs_clarification: 'Necesită clarificări',
	rejected: 'Respins',
	archived: 'Arhivat'
};

export const formatBytes = (value: number) =>
	value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

export const formatDateTime = (value: string) =>
	new Intl.DateTimeFormat('ro-RO', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(value));
