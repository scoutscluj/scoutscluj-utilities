import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { activityBelongsInSidebar, type SidebarActivity } from '$lib/activities/sidebar-activity';

export const loadSidebarActivities = async (sessionToken: string) => {
	const response = await apiFetch('/api/activities', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});

	if (!response.ok) return [];

	const todayIso = new Date().toISOString().slice(0, 10);
	const activities = (await response.json()) as SidebarActivity[];
	return activities.filter((activity) => activityBelongsInSidebar(activity, todayIso));
};
