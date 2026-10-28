import { resolve } from '$app/paths';
export const activitySettingsSections = [
	{ key: 'general', label: 'General' },
	{ key: 'team', label: 'Echipă' },
	{ key: 'departments', label: 'Departamente' },
	{ key: 'registrations', label: 'Înscrieri' },
	{ key: 'consent', label: 'Acord de participare' },
	{ key: 'payments', label: 'Plată' }
] as const;
export type ActivitySettingsSection = (typeof activitySettingsSections)[number]['key'];
export function activitySettingsHref(id: number, section: ActivitySettingsSection) {
	switch (section) {
		case 'team':
			return resolve(`/activities/${id}/settings/team`);
		case 'departments':
			return resolve(`/activities/${id}/settings/departments`);
		case 'registrations':
			return resolve(`/activities/${id}/settings/registrations`);
		case 'consent':
			return resolve(`/activities/${id}/settings/consent`);
		case 'payments':
			return resolve(`/activities/${id}/settings/payments`);
		default:
			return resolve(`/activities/${id}/settings`);
	}
}
