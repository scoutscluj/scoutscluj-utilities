import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Overview } from '$lib/activities/registration';
import { canManageActivity } from '../activity-meta';
import { authHeaders } from '../kitchen/kitchen-api';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ parent, cookies }) => {
	const { activity, user } = await parent();
	if (!canManageActivity(activity, user))
		error(403, 'Nu poți modifica setările acestei activități.');
	const headers = authHeaders(cookies.get(SESSION_COOKIE_NAME) ?? '');
	const [overview, team] = await Promise.all([
		apiFetch(`/api/activity-registrations/${activity.id}/overview`, { headers }),
		apiFetch('/api/activities/team-options', { headers })
	]);
	if (!overview.ok || !team.ok) error(503, 'Setările activității nu pot fi încărcate.');
	return {
		registrationOverview: (await overview.json()) as Overview,
		teamOptions: (await team.json()) as { id: number; displayName: string }[]
	};
};
