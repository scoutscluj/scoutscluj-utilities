import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Overview } from '$lib/activities/registration';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, cookies }) => {
	const response = await apiFetch(
		`/api/activity-registrations/${Number(params.activityId)}/overview`,
		{
			headers: {
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
			}
		}
	);
	if (!response.ok) error(response.status, 'Nu ai acces la înscrierile acestei activități.');
	const overview = (await response.json()) as Overview;
	if (!overview.capabilities.consent && !overview.capabilities.finance)
		error(403, 'Nu ai acces la primirea participanților.');
	return { overview };
};
