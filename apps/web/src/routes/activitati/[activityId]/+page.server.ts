import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { PublicActivity, Registration } from '$lib/activities/registration';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, locals, cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'same-origin' });
	const id = Number(params.activityId);
	if (!Number.isSafeInteger(id) || id <= 0) error(404);
	const response = await apiFetch(`/api/activity-registrations/${id}`, {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
		}
	});
	if (!response.ok) error(response.status, 'Activitatea nu este disponibilă.');
	let mine: Registration[] = [];
	if (locals.user) {
		const own = await apiFetch(`/api/activity-registrations/${id}/mine`, {
			headers: {
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
			}
		});
		if (own.ok) mine = await own.json();
	}
	return { page: (await response.json()) as PublicActivity, user: locals.user, mine };
};
