import { error, type RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	if (!locals.user) error(401, 'Autentifică-te pentru previzualizare.');
	const response = await apiFetch('/api/activity-registrations/consent-preview', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
		},
		body: await request.text()
	});
	return new Response(response.body, {
		status: response.status,
		headers: {
			'content-type': response.headers.get('content-type') ?? 'application/json',
			'cache-control': 'private, no-store'
		}
	});
};
