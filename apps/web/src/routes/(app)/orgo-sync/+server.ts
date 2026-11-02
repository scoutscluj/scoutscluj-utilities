import type { RequestHandler } from './$types';
import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';

const proxy: RequestHandler = async (event) => {
	const response = await apiFetch('/api/members/orgo/bootstrap', {
		method: event.request.method,
		headers: memberHeaders(event)
	});
	return new Response(await response.text(), {
		status: response.status,
		headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' }
	});
};
export const GET = proxy;
export const POST = proxy;
