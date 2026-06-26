import type { Actions, PageServerLoad } from './$types';
import {
	apiJson,
	parseActivityId,
	patchJsonAction,
	postJsonAction,
	type KitchenIngredient,
	type KitchenOverview
} from '../kitchen-api';

const ingredientPayload = (formData: FormData) => ({
	name: formData.get('name')?.toString(),
	category: formData.get('category')?.toString(),
	defaultUnit: formData.get('defaultUnit')?.toString(),
	defaultPricePerUnit: Number(formData.get('defaultPricePerUnit'))
});

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const [overview, ingredients] = await Promise.all([
		apiJson<KitchenOverview>(cookies, `/api/activities/${activityId}/kitchen`),
		apiJson<KitchenIngredient[]>(cookies, `/api/activities/${activityId}/kitchen/ingredients`)
	]);

	return { overview, ingredients };
};

export const actions: Actions = {
	create: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/ingredients`,
			ingredientPayload(await request.formData())
		);
	},
	update: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const ingredientId = Number(formData.get('ingredientId'));
		return patchJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/ingredients/${ingredientId}`,
			ingredientPayload(formData)
		);
	}
};
