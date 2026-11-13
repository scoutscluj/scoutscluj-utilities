import type { RequestHandler } from './$types';
import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';

export const POST: RequestHandler = async (event) => {
	const response = await apiFetch('/api/membership/national-status/batch', {
		method: 'POST',
		headers: { ...memberHeaders(event), 'content-type': 'application/json' },
		body: await event.request.text()
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }
	});
};

export const GET: RequestHandler = async (event) => {
	const id = event.url.searchParams.get('id') ?? '';
	const response = await apiFetch(`/api/members/${encodeURIComponent(id)}/fees`, {
		headers: memberHeaders(event)
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }
	});
};
