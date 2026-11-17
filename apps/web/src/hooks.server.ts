import { redirect, type Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { fetchCurrentUser } from '$lib/server/api';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	event.locals.user = sessionToken ? await fetchCurrentUser(sessionToken) : null;
	// Layout loads can be reused during client navigation. Check the current
	// session before resolving any protected page, including its data request.
	const isPageNavigation =
		event.isDataRequest || event.request.headers.get('accept')?.includes('text/html');
	if (!building && isPageNavigation && event.route.id?.startsWith('/(app)') && !event.locals.user) {
		const target = encodeURIComponent(`${event.url.pathname}${event.url.search}`);
		redirect(303, `/login?redirectTo=${target}`);
	}

	const response = await resolve(event);
	if (event.route.id?.startsWith('/(app)')) {
		response.headers.set('cache-control', 'private, no-store');
	}
	return response;
};
