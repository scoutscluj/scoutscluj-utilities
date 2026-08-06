import { error } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	const response = await apiFetch(`/api/inventory/items/${params.itemId}/image`, {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});
	if (!response.ok) {
		error(response.status, 'Imaginea nu este disponibilă.');
	}

	return new Response(await response.arrayBuffer(), {
		headers: {
			'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
			'cache-control': response.headers.get('cache-control') ?? 'private, max-age=300'
		}
	});
};
