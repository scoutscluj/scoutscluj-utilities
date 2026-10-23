import { redirect, type RequestEvent } from '@sveltejs/kit';
import { apiFetch } from './api';
import { SESSION_COOKIE_NAME } from './cookies';
import {
	daysRange,
	initialRange,
	localDay,
	visibleDays,
	type CalendarResult,
	type Range
} from '$lib/dashboard-calendars/calendar';

export async function loadCalendar(
	source: 'events' | 'headquarters',
	range: Range,
	token: string,
	cursor?: string
): Promise<{ status: number; result: CalendarResult }> {
	try {
		const query = new URLSearchParams({ ...range, ...(cursor ? { cursor } : {}) });
		const response = await apiFetch(`/api/calendars/${source}?${query}`, {
			headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` },
			signal: AbortSignal.timeout(15000)
		});
		if (!response.ok)
			return {
				status: response.status,
				result: {
					page: null,
					error:
						response.status === 400
							? 'Intervalul sau continuarea calendarului nu este validă. Reîncarcă pagina.'
							: response.status === 429
								? 'Prea multe cereri. Încearcă din nou într-un minut.'
								: 'Calendar indisponibil. Încearcă din nou; dacă problema persistă, contactează un administrator.'
				}
			};
		return { status: 200, result: { page: await response.json(), error: null } };
	} catch {
		return {
			status: 503,
			result: { page: null, error: 'Calendarul este temporar indisponibil. Încearcă din nou.' }
		};
	}
}

/** Load only the source used by a standalone calendar page. */
export async function loadCalendarPage(
	{ locals, cookies, setHeaders }: Pick<RequestEvent, 'locals' | 'cookies' | 'setHeaders'>,
	source: 'events' | 'headquarters'
) {
	setHeaders({ 'cache-control': 'private, no-store' });
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token) redirect(303, '/login');
	const now = new Date();
	const range =
		source === 'events' ? initialRange(now) : daysRange(visibleDays(localDay(now), 'week'));
	const calendar = await loadCalendar(source, range, token);
	if (calendar.status === 401) redirect(303, '/login');
	return { calendar: calendar.result, range, now: now.toISOString() };
}
