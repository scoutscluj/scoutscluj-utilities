import type { PageServerLoad } from './$types';
import { completeOrgoCallback } from '$lib/server/orgo-callback';

export const load: PageServerLoad = async ({ cookies, url }) => {
	return completeOrgoCallback(
		cookies,
		url.searchParams.get('successToken'),
		url.searchParams.get('redirectTo')
	);
};
