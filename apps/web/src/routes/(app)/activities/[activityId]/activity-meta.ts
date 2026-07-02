import type { CurrentUser } from '$lib/auth/types';
import type { Activity, ActivityDepartment, ActivityStatus, ActivityType } from './+layout.server';

export const activityTypeOptions: Array<{ value: ActivityType; label: string }> = [
	{ value: 'camp', label: 'Camp' },
	{ value: 'hike', label: 'Drumeție' },
	{ value: 'festival', label: 'Festival' },
	{ value: 'training', label: 'Formare' },
	{ value: 'meeting', label: 'Întâlnire' },
	{ value: 'other', label: 'Alt tip' }
];

export const activityStatusOptions: Array<{ value: ActivityStatus; label: string }> = [
	{ value: 'planned', label: 'Planificată' },
	{ value: 'active', label: 'În desfășurare' },
	{ value: 'completed', label: 'Încheiată' },
	{ value: 'cancelled', label: 'Anulată' }
];

export const departmentOptions: Array<{
	id: ActivityDepartment;
	label: string;
	description: string;
}> = [
	{
		id: 'finance',
		label: 'Financiar',
		description: 'Documente, chitanțe, facturi și registrul activității.'
	},
	{
		id: 'kitchen',
		label: 'Bucătărie',
		description: 'Mese, rețete, ingrediente, aprovizionare și rapoarte.'
	},
	{
		id: 'program',
		label: 'Program',
		description: 'Planificarea programului activității.'
	},
	{
		id: 'logistics',
		label: 'Logistică',
		description: 'Transport, materiale, cazare și alte nevoi logistice.'
	}
];

export const canManageActivity = (activity: Activity, user: CurrentUser) =>
	activity.coordinatorId === user.id || user.roles.includes('super_admin');

export const formatDate = (value?: string) =>
	value
		? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value))
		: 'Fără dată';

export const dateInputValue = (value?: string) => value?.slice(0, 10) ?? '';

export const activityTypeLabel = (type: ActivityType) =>
	activityTypeOptions.find((option) => option.value === type)?.label ?? type;

export const activityStatusLabel = (status: ActivityStatus) =>
	activityStatusOptions.find((option) => option.value === status)?.label ?? status;
