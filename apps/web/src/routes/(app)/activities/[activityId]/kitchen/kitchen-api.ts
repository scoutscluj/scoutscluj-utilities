import { Buffer } from 'node:buffer';
import { error, fail, type Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';

export type KitchenMealSlot = 'breakfast' | 'snack_1' | 'lunch' | 'snack_2' | 'dinner';
export type KitchenAttendanceMode = 'plan_default' | 'custom';
export type KitchenScalingMode = 'proportional' | 'whole_batch';
export type ProcurementMethod =
	| 'delivery'
	| 'local_center'
	| 'person'
	| 'self_purchase'
	| 'shopping_run'
	| 'supplier_order';
export type ProcurementStatus = 'planned' | 'in_progress' | 'completed';

export type KitchenOverview = {
	plan: {
		id: number;
		activityId: number;
		defaultParticipantCount: number;
		hasCompleteActivityDates: boolean;
	};
	days: Array<{ id: number; date: string; dateStatus: 'current' | 'outside_activity_dates' }>;
	meals: Array<{
		id: number;
		kitchenDayId: number;
		slot: KitchenMealSlot;
		context?: string;
		name?: string;
		sortOrder: number;
		attendanceMode: KitchenAttendanceMode;
		attendanceTotal: number;
		recipes: Array<{
			id: number;
			mealId: number;
			recipeId: number;
			recipeName: string;
			servings: number;
			condiments: string[];
			isSnapshot: boolean;
			isStale: boolean;
			snapshotCreatedAt?: string;
			servingOverride?: number;
			scalingMode: KitchenScalingMode;
		}>;
		attendance: Array<{ id: number; subgroupName: string; attendance: number }>;
		adjustments: Array<{
			id: number;
			mealId: number;
			ingredientId: number;
			ingredientName: string;
			quantityDelta: number;
			unit: string;
			notes?: string;
		}>;
	}>;
	ingredientNeeds: Array<{
		ingredientId: number;
		ingredientName: string;
		category: string;
		unit: string;
		neededQuantity: number;
		procuredQuantity: number;
		remainingQuantity: number;
		coveragePercent: number;
		estimatedCost: number;
		breakdown: Array<{ date: string; mealId: number; mealLabel: string; quantity: number }>;
	}>;
	mealCoverage: Array<{
		mealId: number;
		kitchenDayId: number;
		date: string;
		slot: KitchenMealSlot;
		mealLabel: string;
		items: Array<{
			ingredientId: number;
			ingredientName: string;
			neededQuantity: number;
			coveredQuantity: number;
			remainingQuantity: number;
			overCoveredQuantity: number;
			unit: string;
			state: 'uncovered' | 'partial' | 'covered';
		}>;
		condiments: string[];
	}>;
	condimentReminders: string[];
};

export type KitchenIngredient = {
	id: number;
	name: string;
	category: string;
	unitFamily: 'mass' | 'volume' | 'count';
	defaultUnit: string;
	defaultPricePerUnit: number;
};

export type KitchenRecipe = {
	id: number;
	name: string;
	description?: string;
	condiments: string[];
	servings: number;
	ingredients: Array<{
		id: number;
		ingredientId: number;
		ingredientName: string;
		quantity: number;
		unit: string;
	}>;
};

export type KitchenProcurementEvent = {
	id: number;
	kitchenPlanId: number;
	name: string;
	supplier?: string;
	ownerName?: string;
	date?: string;
	method: ProcurementMethod;
	status: ProcurementStatus;
	notes?: string;
	items: Array<{
		id: number;
		ingredientId: number;
		ingredientName: string;
		quantity: number;
		unit: string;
		estimatedUnitPrice?: number;
		estimatedTotalCost?: number;
		realUnitPrice?: number;
		realTotalCost?: number;
		notes?: string;
	}>;
	documents: Array<{ id: number; procurementEventId: number; financialDocumentId: number }>;
};

export type FinancialDocument = {
	id: number;
	activityId?: number;
	originalFilename: string;
	status: string;
	createdAt: string;
};

export type AuditEntry = {
	id: number;
	actorId?: number;
	actorName?: string;
	action: string;
	entityType: string;
	entityId: string;
	activityId?: number;
	metadata: Record<string, unknown>;
	createdAt: string;
};

export const getSessionToken = (cookies: Cookies) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	return sessionToken;
};

export const authHeaders = (sessionToken: string) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
});

export const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) {
			return body.message.join(' ');
		}

		return body.message ?? 'Operațiunea nu a reușit.';
	} catch {
		return 'Operațiunea nu a reușit.';
	}
};

export const parseActivityId = (value: string | undefined) => {
	const activityId = Number(value);
	if (!Number.isInteger(activityId) || activityId <= 0) {
		error(400, 'Activitatea nu este validă.');
	}

	return activityId;
};

export const parsePositiveId = (value: string | undefined, message = 'Identificator invalid.') => {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) {
		error(400, message);
	}

	return id;
};

export const apiJson = async <T>(
	cookies: Cookies,
	path: string,
	init: RequestInit = {}
): Promise<T> => {
	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch(path, {
		...init,
		headers: {
			...authHeaders(sessionToken),
			...(init.headers ?? {})
		}
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	return (await response.json()) as T;
};

export const postJsonAction = async (
	cookies: Cookies,
	path: string,
	body: Record<string, unknown>
) => {
	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch(path, {
		method: 'POST',
		headers: {
			...authHeaders(sessionToken),
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		return fail(response.status, { message: await readApiMessage(response) });
	}

	return { message: 'Operațiunea a fost salvată.' };
};

export const apiText = async (
	cookies: Cookies,
	path: string,
	init: RequestInit = {}
): Promise<string> => {
	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch(path, {
		...init,
		headers: {
			...authHeaders(sessionToken),
			...(init.headers ?? {})
		}
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	return response.text();
};

export const patchJsonAction = async (
	cookies: Cookies,
	path: string,
	body: Record<string, unknown>
) => {
	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch(path, {
		method: 'PATCH',
		headers: {
			...authHeaders(sessionToken),
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		return fail(response.status, { message: await readApiMessage(response) });
	}

	return { message: 'Operațiunea a fost salvată.' };
};

export const deleteAction = async (cookies: Cookies, path: string) => {
	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch(path, {
		method: 'DELETE',
		headers: authHeaders(sessionToken)
	});

	if (!response.ok) {
		return fail(response.status, { message: await readApiMessage(response) });
	}

	return { message: 'Operațiunea a fost ștearsă.' };
};

export const fileToBase64 = async (file: File) =>
	Buffer.from(await file.arrayBuffer()).toString('base64');

export const inferContentType = (file: File) => {
	if (file.type) {
		return file.type;
	}

	const extension = file.name.split('.').pop()?.toLowerCase();
	switch (extension) {
		case 'pdf':
			return 'application/pdf';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'heic':
			return 'image/heic';
		case 'heif':
			return 'image/heif';
		default:
			return 'application/octet-stream';
	}
};
