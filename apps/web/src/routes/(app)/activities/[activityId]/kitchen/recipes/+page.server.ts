import type { Actions, PageServerLoad } from './$types';
import {
	apiJson,
	parseActivityId,
	patchJsonAction,
	postJsonAction,
	type KitchenIngredient,
	type KitchenRecipe
} from '../kitchen-api';

const recipeIngredients = (formData: FormData) => {
	const ingredientIds = formData.getAll('ingredientId');
	const quantities = formData.getAll('quantity');
	const units = formData.getAll('unit');

	return ingredientIds.flatMap((ingredientIdValue, index) => {
		const ingredientId = Number(ingredientIdValue);
		const quantity = Number(quantities[index]);
		const unit = units[index]?.toString().trim();
		if (!ingredientId || !quantity || !unit) {
			return [];
		}

		return [{ ingredientId, quantity, unit }];
	});
};

const recipePayload = (formData: FormData) => ({
	name: formData.get('name')?.toString(),
	description: formData.get('description')?.toString(),
	servings: Number(formData.get('servings')),
	ingredients: recipeIngredients(formData)
});

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const [recipes, ingredients] = await Promise.all([
		apiJson<KitchenRecipe[]>(cookies, `/api/activities/${activityId}/kitchen/recipes`),
		apiJson<KitchenIngredient[]>(cookies, `/api/activities/${activityId}/kitchen/ingredients`)
	]);

	return { recipes, ingredients };
};

export const actions: Actions = {
	create: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/recipes`,
			recipePayload(await request.formData())
		);
	},
	update: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const recipeId = Number(formData.get('recipeId'));
		return patchJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/recipes/${recipeId}`,
			recipePayload(formData)
		);
	}
};
