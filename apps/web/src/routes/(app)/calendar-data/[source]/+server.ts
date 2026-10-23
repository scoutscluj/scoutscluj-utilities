import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { loadCalendar } from '$lib/server/dashboard-calendars';

export const GET: RequestHandler = async ({ locals, cookies, params, url }) => {
	const headers = { 'cache-control': 'private, no-store' };
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token)
		return json({ error: 'Autentificare necesară.', page: null }, { status: 401, headers });
	if (
		!['events', 'headquarters'].includes(params.source) ||
		[...url.searchParams.keys()].some(
			(key) => !['from', 'to', 'cursor'].includes(key) || url.searchParams.getAll(key).length > 1
		)
	)
		return json({ error: 'Cerere invalidă.', page: null }, { status: 400, headers });
	const { result, status } = await loadCalendar(
		params.source as 'events' | 'headquarters',
		{ from: url.searchParams.get('from') ?? '', to: url.searchParams.get('to') ?? '' },
		token,
		url.searchParams.get('cursor') ?? undefined
	);
	return json(result, { status, headers });
};
