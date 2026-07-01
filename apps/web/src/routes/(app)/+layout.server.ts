import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { getSafeRedirectTarget } from '$lib/server/redirects';
import { activityBelongsInSidebar, type SidebarActivity } from '$lib/activities/sidebar-activity';

const loadSidebarActivities = async (sessionToken: string) => {
	const response = await apiFetch('/api/activities', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});

	if (!response.ok) {
		return [];
	}

	const todayIso = new Date().toISOString().slice(0, 10);
	const activities = (await response.json()) as SidebarActivity[];

	return activities.filter((activity) => activityBelongsInSidebar(activity, todayIso));
};

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		const redirectTo = getSafeRedirectTarget(`${url.pathname}${url.search}`);
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const sessionToken = cookies.get(SESSION_COOKIE_NAME);

	return {
		user: locals.user,
		sidebarActivities: sessionToken ? await loadSidebarActivities(sessionToken) : []
	};
};
