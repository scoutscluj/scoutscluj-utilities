import type { Actions, PageServerLoad } from './$types';
import { apiJson, parseActivityId, postJsonAction, type KitchenOverview } from './kitchen-api';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	return {
		overview: await apiJson<KitchenOverview>(cookies, `/api/activities/${activityId}/kitchen`)
	};
};

export const actions: Actions = {
	setup: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return postJsonAction(cookies, `/api/activities/${activityId}/kitchen`, {
			defaultParticipantCount: Number(formData.get('defaultParticipantCount'))
		});
	},
	syncDays: async ({ cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		return postJsonAction(cookies, `/api/activities/${activityId}/kitchen/sync-days`, {});
	}
};
