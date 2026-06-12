import type { RequestHandler } from './$types';
import { completeOrgoCallback } from '$lib/server/orgo-callback';

export const GET: RequestHandler = ({ cookies, url }) => {
	return completeOrgoCallback(cookies, url.searchParams.get('successToken'));
};
