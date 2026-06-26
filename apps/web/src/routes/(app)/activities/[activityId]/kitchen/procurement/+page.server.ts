import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	apiJson,
	deleteAction,
	fileToBase64,
	inferContentType,
	parseActivityId,
	patchJsonAction,
	postJsonAction,
	type FinancialDocument,
	type KitchenIngredient,
	type KitchenProcurementEvent
} from '../kitchen-api';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const optionalNumber = (value: FormDataEntryValue | null) => {
	const text = value?.toString();
	return text ? Number(text) : undefined;
};

const eventPayload = (formData: FormData) => ({
	name: formData.get('name')?.toString(),
	supplier: formData.get('supplier')?.toString(),
	date: formData.get('date')?.toString(),
	method: formData.get('method')?.toString(),
	status: formData.get('status')?.toString(),
	notes: formData.get('notes')?.toString()
});

const itemPayload = (formData: FormData) => ({
	ingredientId: Number(formData.get('ingredientId')),
	quantity: Number(formData.get('quantity')),
	unit: formData.get('unit')?.toString(),
	estimatedUnitPrice: optionalNumber(formData.get('estimatedUnitPrice')),
	estimatedTotalCost: optionalNumber(formData.get('estimatedTotalCost')),
	realUnitPrice: optionalNumber(formData.get('realUnitPrice')),
	realTotalCost: optionalNumber(formData.get('realTotalCost')),
	notes: formData.get('notes')?.toString()
});

export const load: PageServerLoad = async ({ cookies, params }) => {
	const activityId = parseActivityId(params.activityId);
	const [events, ingredients, documents] = await Promise.all([
		apiJson<KitchenProcurementEvent[]>(cookies, `/api/activities/${activityId}/kitchen/procurement`),
		apiJson<KitchenIngredient[]>(cookies, `/api/activities/${activityId}/kitchen/ingredients`),
		apiJson<FinancialDocument[]>(cookies, '/api/finance/documents')
	]);

	return {
		activityId,
		events,
		ingredients,
		documents: documents.filter((document) => document.activityId === activityId)
	};
};

export const actions: Actions = {
	createEvent: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement`,
			eventPayload(await request.formData())
		);
	},
	updateEvent: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return patchJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement/${formData.get('eventId')}`,
			eventPayload(formData)
		);
	},
	deleteEvent: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return deleteAction(cookies, `/api/activities/${activityId}/kitchen/procurement/${formData.get('eventId')}`);
	},
	addItem: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement/${formData.get('eventId')}/items`,
			itemPayload(formData)
		);
	},
	updateItem: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return patchJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement-items/${formData.get('itemId')}`,
			itemPayload(formData)
		);
	},
	deleteItem: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return deleteAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement-items/${formData.get('itemId')}`
		);
	},
	addRemaining: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement/${formData.get('eventId')}/from-meal-plan`,
			{}
		);
	},
	linkDocument: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement/${formData.get('eventId')}/documents`,
			{ financialDocumentId: Number(formData.get('financialDocumentId')) }
		);
	},
	uploadDocument: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Alege un document.' });
		}
		if (file.size > MAX_UPLOAD_BYTES) {
			return fail(400, { message: 'Fișierul depășește limita de 15 MB.' });
		}

		return postJsonAction(
			cookies,
			`/api/activities/${activityId}/kitchen/procurement/${formData.get('eventId')}/documents/upload`,
			{
				fileName: file.name,
				contentType: inferContentType(file),
				contentBase64: await fileToBase64(file),
				notes: formData.get('notes')?.toString()
			}
		);
	}
};
