import { proxyInventoryImage } from '$lib/server/inventory-image-proxy';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies, params, request }) =>
	proxyInventoryImage({
		cookies,
		request,
		apiPath: `/api/inventory/items/${params.itemId}/image/thumbnail`
	});
