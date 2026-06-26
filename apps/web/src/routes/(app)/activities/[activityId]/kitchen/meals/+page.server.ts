import type { Actions, PageServerLoad } from './$types';
import {
	apiJson,
	deleteAction,
	parseActivityId,
	postJsonAction,
	type KitchenIngredient,
	type KitchenOverview,
	type KitchenRecipe
} from '../kitchen-api';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const [overview, recipes, ingredients] = await Promise.all([
		apiJson<KitchenOverview>(cookies, `/api/activities/${activityId}/kitchen`),
		apiJson<KitchenRecipe[]>(cookies, `/api/activities/${activityId}/kitchen/recipes`),
		apiJson<KitchenIngredient[]>(cookies, `/api/activities/${activityId}/kitchen/ingredients`)
	]);

	return { overview, recipes, ingredients };
};

export const actions: Actions = {
	createMeal: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return postJsonAction(cookies, `/api/activities/${activityId}/kitchen/meals`, {
			kitchenDayId: Number(formData.get('kitchenDayId')),
			slot: formData.get('slot')?.toString(),
			context: formData.get('context')?.toString(),
			name: formData.get('name')?.toString()
		});
	},
	assignRecipe: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const mealId = Number(formData.get('mealId'));
		return postJsonAction(cookies, `/api/activities/${activityId}/kitchen/meals/${mealId}/recipes`, {
			recipeId: Number(formData.get('recipeId')),
			servingOverride: formData.get('servingOverride')
				? Number(formData.get('servingOverride'))
				: undefined,
			scalingMode: formData.get('scalingMode')?.toString()
		});
	},
	attendance: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const mealId = Number(formData.get('mealId'));
		const rows = formData
			.get('rows')
			?.toString()
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [subgroupName, attendance] = line.split(':');
				return { subgroupName: subgroupName?.trim(), attendance: Number(attendance) };
			});
		return postJsonAction(cookies, `/api/activities/${activityId}/kitchen/meals/${mealId}/attendance`, {
			rows
		});
	},
	adjustment: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const mealId = Number(formData.get('mealId'));
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/meals/${mealId}/adjustments`,
			{
				ingredientId: Number(formData.get('ingredientId')),
				quantityDelta: Number(formData.get('quantityDelta')),
				unit: formData.get('unit')?.toString(),
				notes: formData.get('notes')?.toString()
			}
		);
	},
	deleteMeal: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return deleteAction(cookies, `/api/activities/${activityId}/kitchen/meals/${formData.get('mealId')}`);
	},
	deleteMealRecipe: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return deleteAction(
			cookies,
			`/api/activities/${activityId}/kitchen/meal-recipes/${formData.get('mealRecipeId')}`
		);
	},
	deleteAdjustment: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return deleteAction(
			cookies,
			`/api/activities/${activityId}/kitchen/adjustments/${formData.get('adjustmentId')}`
		);
	}
};
