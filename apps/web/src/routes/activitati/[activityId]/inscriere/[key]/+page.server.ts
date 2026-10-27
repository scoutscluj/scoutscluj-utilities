import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Registration } from '$lib/activities/registration';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, locals, cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'same-origin' });
	const id = Number(params.activityId),
		key = params.key;
	const token = /^[A-Za-z0-9_-]{43}$/.test(key) ? key : '';
	if (!Number.isSafeInteger(id) || id <= 0 || (!token && !/^[0-9a-f-]{36}$/.test(key))) error(404);
	const response = await apiFetch(
		`/api/activity-registrations/${id}/${token ? `personal/${token}` : `registrations/${key}`}`,
		{
			headers: {
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
			}
		}
	);
	if (!response.ok)
		error(
			response.status,
			'Folosește linkul personal sau contul autorizat pentru această înscriere.'
		);
	return {
		registration: (await response.json()) as Registration,
		token,
		key,
		activityId: id,
		user: locals.user
	};
};
