import type { LayoutServerLoad } from './$types';
import { usesAuthenticatedShell } from '$lib/auth/authenticated-shell';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { loadSidebarActivities } from '$lib/server/sidebar-activities';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	const sidebarActivities =
		locals.user && sessionToken && usesAuthenticatedShell(url.pathname, true)
			? await loadSidebarActivities(sessionToken)
			: [];

	return {
		user: locals.user,
		sidebarActivities
	};
};
