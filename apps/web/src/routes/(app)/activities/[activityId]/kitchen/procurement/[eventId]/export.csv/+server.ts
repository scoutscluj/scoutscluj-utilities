import type { RequestHandler } from './$types';
import { apiText, parseActivityId, parsePositiveId } from '../../../kitchen-api';

export const GET: RequestHandler = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const eventId = parsePositiveId(params.eventId, 'Aprovizionarea nu este validă.');
	const csv = await apiText(
		cookies,
		`/api/activities/${activityId}/kitchen/procurement/${eventId}/export.csv`
	);

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="kitchen-procurement-${eventId}.csv"`
		}
	});
};
