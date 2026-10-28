import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { activityBelongsInSidebar, type SidebarActivity } from '$lib/activities/sidebar-activity';
import type { CurrentUser } from '$lib/auth/types';

export const loadSidebarActivities = async (sessionToken: string, user?: CurrentUser) => {
	const response = await apiFetch('/api/activities', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});

	if (!response.ok) return [];

	const todayIso = new Date().toISOString().slice(0, 10);
	const activities = (await response.json()) as SidebarActivity[];
	if (!user) return activities.filter((activity) => activityBelongsInSidebar(activity, todayIso));
	const eligibleResponse = await apiFetch('/api/activity-registrations/eligible', {
		headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}` }
	});
	const eligible = eligibleResponse.ok
		? ((await eligibleResponse.json()) as SidebarActivity[])
		: [];
	const manager = user.roles.some((role) =>
		['admin', 'super_admin', 'finance_manager'].includes(role)
	);
	const managed = activities.filter((activity) => manager || activity.coordinatorId === user.id);
	const merged = [
		...managed,
		...eligible
			.filter((activity) => !managed.some((row) => row.id === activity.id))
			.map((activity) => ({ ...activity, publicRegistration: true }))
	];
	return merged.filter((activity) => activityBelongsInSidebar(activity, todayIso));
};
