import type { RequestHandler } from './$types';
import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';

export const GET: RequestHandler = async (event) => {
	const response = await apiFetch('/api/members/orgo/refresh-status', {
		headers: memberHeaders(event)
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }
	});
};

export const POST: RequestHandler = async (event) => {
	const response = await apiFetch('/api/members/orgo/refresh', {
		method: 'POST',
		headers: memberHeaders(event)
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }
	});
};
