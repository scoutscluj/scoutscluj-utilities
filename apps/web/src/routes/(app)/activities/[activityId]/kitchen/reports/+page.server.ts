import type { PageServerLoad } from './$types';
import {
	apiJson,
	parseActivityId,
	type KitchenOverview,
	type KitchenProcurementEvent
} from '../kitchen-api';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const [overview, procurement] = await Promise.all([
		apiJson<KitchenOverview>(cookies, `/api/activities/${activityId}/kitchen`),
		apiJson<KitchenProcurementEvent[]>(cookies, `/api/activities/${activityId}/kitchen/procurement`)
	]);

	return { activityId, overview, procurement };
};
