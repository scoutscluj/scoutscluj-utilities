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
