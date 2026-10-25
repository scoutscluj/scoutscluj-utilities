import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { getSafeRedirectTarget } from '$lib/server/redirects';
import { loadSidebarActivities } from '$lib/server/sidebar-activities';
import { canManageAdultDocuments } from '$lib/server/adult-documents';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		const redirectTo = getSafeRedirectTarget(`${url.pathname}${url.search}`);
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const sessionToken = cookies.get(SESSION_COOKIE_NAME);

	const [sidebarActivities, documentsAdmin] = await Promise.all([
		sessionToken ? loadSidebarActivities(sessionToken) : Promise.resolve([]),
		sessionToken ? canManageAdultDocuments(sessionToken) : Promise.resolve(false)
	]);
	return {
		user: { ...locals.user, canManageAdultDocuments: documentsAdmin },
		sidebarActivities
	};
};
