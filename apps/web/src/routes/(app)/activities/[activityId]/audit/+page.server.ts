import type { PageServerLoad } from './$types';
import { apiJson, parseActivityId, type AuditEntry } from '../kitchen/kitchen-api';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const entries = await apiJson<AuditEntry[]>(cookies, `/api/audit/activities/${activityId}`);

	return { entries };
};
