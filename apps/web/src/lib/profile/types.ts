export type PersonalObjective = {
	id: number;
	title: string;
	description: string;
	deadline: string;
	createdAt: string;
};

export const localDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const formatDeadline = (deadline: string) =>
	new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeZone: 'UTC' }).format(
		new Date(`${deadline}T00:00:00Z`)
	);

export const formatProfileDate = (value?: string) => {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Indisponibil';
	const date = new Date(`${value}T00:00:00Z`);
	if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		return 'Indisponibil';
	}
	return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
};

export const formatProfileTimestamp = (value?: string) => {
	const date = value ? new Date(value) : undefined;
	return date && Number.isFinite(date.getTime())
		? new Intl.DateTimeFormat('ro-RO', {
				dateStyle: 'medium',
				timeStyle: 'short',
				timeZone: 'Europe/Bucharest'
			}).format(date)
		: 'Indisponibil';
};
