import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { getSafeRedirectTarget } from '$lib/server/redirects';

export type SidebarActivityStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type SidebarActivityType = 'camp' | 'hike' | 'festival' | 'training' | 'meeting' | 'other';
export type SidebarActivityDepartment = 'finance' | 'kitchen' | 'program' | 'logistics';

export type SidebarActivity = {
	id: number;
	title: string;
	type: SidebarActivityType;
	status: SidebarActivityStatus;
	departments: SidebarActivityDepartment[];
	coordinatorId: number;
	startDate?: string;
	endDate?: string;
	location?: string;
};

const activityBelongsInSidebar = (activity: SidebarActivity, userId: number, todayIso: string) => {
	const isCurrentOrUpcoming =
		activity.status === 'active' ||
		(activity.status === 'planned' && (!activity.endDate || activity.endDate >= todayIso));

	return isCurrentOrUpcoming || activity.coordinatorId === userId;
};

const loadSidebarActivities = async (sessionToken: string, userId: number) => {
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

	return activities.filter((activity) => activityBelongsInSidebar(activity, userId, todayIso));
};

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		const redirectTo = getSafeRedirectTarget(`${url.pathname}${url.search}`);
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const sessionToken = cookies.get(SESSION_COOKIE_NAME);

	return {
		user: locals.user,
		sidebarActivities: sessionToken ? await loadSidebarActivities(sessionToken, locals.user.id) : []
	};
};
