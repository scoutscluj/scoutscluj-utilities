import type { RequestHandler } from './$types';
import { apiText, parseActivityId } from '../../kitchen-api';

export const GET: RequestHandler = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const csv = await apiText(cookies, `/api/activities/${activityId}/kitchen/reports/procurement.csv`);

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="kitchen-procurement-${activityId}.csv"`
		}
	});
};
