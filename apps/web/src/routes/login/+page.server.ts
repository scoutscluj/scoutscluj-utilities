import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSafeRedirectTarget } from '$lib/server/redirects';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) {
		redirect(303, getSafeRedirectTarget(url.searchParams.get('redirectTo')));
	}
};
