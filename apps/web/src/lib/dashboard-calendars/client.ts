import { base } from '$app/paths';
import type { CalendarResult, Range } from './calendar';

export async function fetchCalendar(
	source: 'events' | 'headquarters',
	range: Range,
	expire: () => void,
	cursor?: string
): Promise<CalendarResult> {
	try {
		const query = new URLSearchParams({ ...range, ...(cursor ? { cursor } : {}) });
		const response = await fetch(`${base}/calendar-data/${source}?${query}`, { cache: 'no-store' });
		if (response.status === 401) {
			expire();
			return { page: null, error: 'Sesiunea a expirat.' };
		}
		return (await response.json()) as CalendarResult;
	} catch {
		return { page: null, error: 'Conexiunea nu este disponibilă. Încearcă din nou.' };
	}
}
