import { managesActivity } from '$lib/auth/activity-access';
import type { ParentalConsentPublication } from '$lib/parental-consent/types';
import { parentalConsentJsonOrNull } from '$lib/server/parental-consent-api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { activity, user } = await parent();
	return {
		publication: await parentalConsentJsonOrNull<ParentalConsentPublication>(
			cookies,
			`/api/activities/${activity.id}/parental-consent/publication`
		),
		canManage: managesActivity(activity, user) || user.roles.includes('super_admin')
	};
};
const paused = () =>
	fail(423, { message: 'Folosește formatul fix din Setări înscrieri → Acord parental.' });
export const actions: Actions = { save: paused, publish: paused };
