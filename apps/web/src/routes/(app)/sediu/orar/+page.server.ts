import type { PageServerLoad } from './$types';
import { loadCalendarPage } from '$lib/server/dashboard-calendars';

export const load: PageServerLoad = (event) => loadCalendarPage(event, 'headquarters');
