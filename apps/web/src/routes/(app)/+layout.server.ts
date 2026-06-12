import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getSafeRedirectTarget } from '$lib/server/redirects';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		const redirectTo = getSafeRedirectTarget(`${url.pathname}${url.search}`);
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return {
		user: locals.user
	};
};
