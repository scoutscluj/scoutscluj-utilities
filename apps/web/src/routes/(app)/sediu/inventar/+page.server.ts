import { Buffer } from 'node:buffer';
import { error, fail } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif'
]);

export type InventoryOption = {
	value: string;
	label: string;
};

export type InventoryCategoryOption = InventoryOption & {
	subcategories: InventoryOption[];
};

export type InventoryOptions = {
	categories: InventoryCategoryOption[];
	owners: InventoryOption[];
	locations: InventoryOption[];
	conditions: InventoryOption[];
};

export type InventoryImage = {
	id: number;
	originalFilename: string;
	contentType: string;
	fileSize: number;
	checksumSha256: string;
	uploadedByUserId?: number;
	uploadedByDisplayName?: string;
	url: string;
	createdAt: string;
	updatedAt: string;
};

export type InventoryItem = {
	id: number;
	name: string;
	quantity: number;
	category?: string;
	subcategory?: string;
	owner?: string;
	locationDescription?: string;
	condition?: string;
	isConsumable: boolean;
	notes?: string;
	createdByUserId?: number;
	createdByDisplayName?: string;
	updatedByUserId?: number;
	updatedByDisplayName?: string;
	image?: InventoryImage;
	createdAt: string;
	updatedAt: string;
};

export type InventoryItemList = {
	items: InventoryItem[];
	total: number;
	page: number;
	pageSize: number;
};

export type InventoryFilters = {
	search: string;
	category: string;
	subcategory: string;
	owner: string;
	locationDescription: string;
	condition: string;
	consumable: 'all' | 'yes' | 'no';
	sort: string;
	direction: 'asc' | 'desc';
	page: number;
	pageSize: number;
};

const getSessionToken = (cookies: Cookies) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	return sessionToken;
};

const authHeaders = (sessionToken: string) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
});

const readApiMessage = async (response: Response) => {
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

const getString = (formData: FormData, key: string) => formData.get(key)?.toString() ?? '';

const getPositiveInteger = (value: string | null, fallback: number) => {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const buildQuery = (filters: InventoryFilters) => {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (key === 'page' || key === 'pageSize') {
			query.set(key, String(value));
			continue;
		}
		if (value && value !== 'all') {
			query.set(key, String(value));
		}
	}

	return query.toString();
};

const inferContentType = (file: File) => {
	if (file.type) {
		return file.type;
	}

	const extension = file.name.split('.').pop()?.toLowerCase();
	switch (extension) {
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

const itemPayloadFromForm = (formData: FormData) => ({
	name: getString(formData, 'name'),
	quantity: Number(getString(formData, 'quantity') || 0),
	category: getString(formData, 'category'),
	subcategory: getString(formData, 'subcategory'),
	owner: getString(formData, 'owner'),
	locationDescription: getString(formData, 'locationDescription'),
	condition: getString(formData, 'condition'),
	isConsumable: formData.get('isConsumable') === 'on',
	notes: getString(formData, 'notes')
});

const formValuesFromPayload = (formData: FormData) => ({
	id: getString(formData, 'itemId'),
	...itemPayloadFromForm(formData),
	isConsumable: formData.get('isConsumable') === 'on'
});

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const sessionToken = getSessionToken(cookies);
	const filters: InventoryFilters = {
		search: url.searchParams.get('search') ?? '',
		category: url.searchParams.get('category') ?? '',
		subcategory: url.searchParams.get('subcategory') ?? '',
		owner: url.searchParams.get('owner') ?? '',
		locationDescription: url.searchParams.get('locationDescription') ?? '',
		condition: url.searchParams.get('condition') ?? '',
		consumable: (url.searchParams.get('consumable') as InventoryFilters['consumable']) ?? 'all',
		sort: url.searchParams.get('sort') ?? 'name',
		direction: url.searchParams.get('direction') === 'desc' ? 'desc' : 'asc',
		page: getPositiveInteger(url.searchParams.get('page'), 1),
		pageSize: getPositiveInteger(url.searchParams.get('pageSize'), 100)
	};
	const headers = authHeaders(sessionToken);
	const [itemsResponse, optionsResponse] = await Promise.all([
		apiFetch(`/api/inventory/items?${buildQuery(filters)}`, { headers }),
		apiFetch('/api/inventory/options', { headers })
	]);

	if (!itemsResponse.ok) {
		error(itemsResponse.status, await readApiMessage(itemsResponse));
	}
	if (!optionsResponse.ok) {
		error(optionsResponse.status, await readApiMessage(optionsResponse));
	}

	return {
		inventory: (await itemsResponse.json()) as InventoryItemList,
		options: (await optionsResponse.json()) as InventoryOptions,
		filters,
		canEdit: hasRole(locals.user, 'moderator')
	};
};

export const actions: Actions = {
	save: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'moderator')) {
			return fail(403, { intent: 'save', message: 'Nu ai acces la această acțiune.' });
		}

		const formData = await request.formData();
		const itemId = getString(formData, 'itemId');
		const payload = itemPayloadFromForm(formData);
		const values = formValuesFromPayload(formData);
		if (!payload.name.trim()) {
			return fail(400, {
				intent: 'save',
				message: 'Numele obiectului este obligatoriu.',
				values
			});
		}

		const file = formData.get('image');
		if (file instanceof File && file.size > 0) {
			if (file.size > MAX_IMAGE_BYTES) {
				return fail(400, {
					intent: 'save',
					message: 'Imaginea este prea mare. Limita actuală este 8 MB.',
					values
				});
			}
			if (!ALLOWED_IMAGE_CONTENT_TYPES.has(inferContentType(file))) {
				return fail(400, {
					intent: 'save',
					message: 'Tipul imaginii nu este acceptat. Încarcă JPG, PNG, WEBP sau HEIC.',
					values
				});
			}
		}

		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch(
			itemId ? `/api/inventory/items/${itemId}` : '/api/inventory/items',
			{
				method: itemId ? 'PATCH' : 'POST',
				headers: {
					...authHeaders(sessionToken),
					'content-type': 'application/json'
				},
				body: JSON.stringify(payload)
			}
		);

		if (!response.ok) {
			return fail(response.status, {
				intent: 'save',
				message: await readApiMessage(response),
				values
			});
		}

		const item = (await response.json()) as InventoryItem;
		if (formData.get('removeImage') === 'on' && !(file instanceof File && file.size > 0)) {
			const removeResponse = await apiFetch(`/api/inventory/items/${item.id}/image`, {
				method: 'DELETE',
				headers: authHeaders(sessionToken)
			});
			if (!removeResponse.ok) {
				return fail(removeResponse.status, {
					intent: 'save',
					message: await readApiMessage(removeResponse),
					values
				});
			}
		}

		if (file instanceof File && file.size > 0) {
			const imageResponse = await apiFetch(`/api/inventory/items/${item.id}/image`, {
				method: 'POST',
				headers: {
					...authHeaders(sessionToken),
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					fileName: file.name,
					contentType: inferContentType(file),
					contentBase64: Buffer.from(await file.arrayBuffer()).toString('base64')
				})
			});

			if (!imageResponse.ok) {
				return fail(imageResponse.status, {
					intent: 'save',
					message: await readApiMessage(imageResponse),
					values: { ...values, id: String(item.id) }
				});
			}
		}

		return {
			intent: 'save',
			message: itemId ? 'Obiectul a fost actualizat.' : 'Obiectul a fost adăugat.'
		};
	},
	delete: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'moderator')) {
			return fail(403, { intent: 'delete', message: 'Nu ai acces la această acțiune.' });
		}

		const formData = await request.formData();
		const itemId = Number(formData.get('itemId'));
		if (!Number.isInteger(itemId) || itemId <= 0) {
			return fail(400, { intent: 'delete', message: 'Obiectul selectat nu este valid.' });
		}

		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch(`/api/inventory/items/${itemId}`, {
			method: 'DELETE',
			headers: authHeaders(sessionToken)
		});
		if (!response.ok) {
			return fail(response.status, { intent: 'delete', message: await readApiMessage(response) });
		}

		return { intent: 'delete', message: 'Obiectul a fost șters.' };
	}
};
