import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { fetchCurrentUser } from '$lib/server/api';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	event.locals.user = sessionToken ? await fetchCurrentUser(sessionToken) : null;

	const response = await resolve(event);
	if (event.route.id?.startsWith('/(app)')) {
		response.headers.set('cache-control', 'private, no-store');
	}
	return response;
};
