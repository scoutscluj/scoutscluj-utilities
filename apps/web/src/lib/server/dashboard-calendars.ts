import { apiFetch } from './api';
import { SESSION_COOKIE_NAME } from './cookies';
import type { CalendarResult, Range } from '$lib/dashboard-calendars/calendar';

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
