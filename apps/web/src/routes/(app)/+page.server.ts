import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { loadCalendar } from '$lib/server/dashboard-calendars';
import { daysRange, initialRange, localDay, visibleDays } from '$lib/dashboard-calendars/calendar';

export const load: PageServerLoad = async ({ locals, cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token) redirect(303, '/login');
	const now = new Date();
	const today = localDay(now);
	const eventsRange = initialRange(now);
	const headquartersRange = daysRange(visibleDays(today, 'week'));
	const [events, headquarters] = await Promise.all([
		loadCalendar('events', eventsRange, token),
		loadCalendar('headquarters', headquartersRange, token)
	]);
	if (events.status === 401 || headquarters.status === 401) redirect(303, '/login');
	return {
		events: events.result,
		headquarters: headquarters.result,
		eventsRange,
		headquartersRange,
		today,
		now: now.toISOString()
	};
};
