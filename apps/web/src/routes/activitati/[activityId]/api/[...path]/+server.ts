import { error, type RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';

const proxy: RequestHandler = async ({ params, request, cookies }) => {
	const activityId = Number(params.activityId);
	if (!Number.isSafeInteger(activityId) || activityId <= 0) error(400, 'Activitate invalidă.');
	const path = params.path ?? '';
	const uuid = '[0-9a-f-]{36}';
	const allowed =
		/^consent-preview\/(lupisori|temerari|exploratori)$/.test(path) ||
		/^(register|lookup|checkout|prefill|settings|publication|family|renew-consent|overview|mine)$/.test(
			path
		) ||
		new RegExp(`^registrations/${uuid}(?:/(?:generate|upload|answers|documents/${uuid}))?$`).test(
			path
		);
	const close = new RegExp(`^checkouts/${uuid}/close$`).test(path);
	if (!allowed && !close) error(404);
	const session = cookies.get(SESSION_COOKIE_NAME);
	const token = request.headers.get('x-registration-token');
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (session) headers.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(session)}`;
	if (token) headers['x-registration-token'] = token;
	const response = await apiFetch(
		path === 'prefill'
			? '/api/activity-registrations/prefill'
			: `/api/activity-registrations/${activityId}/${path}`,
		{
			method: request.method,
			headers,
			...(request.method === 'GET' ? {} : { body: await request.text() })
		}
	);
	return new Response(response.body, {
		status: response.status,
		headers: {
			'content-type': response.headers.get('content-type') ?? 'application/json',
			'cache-control': 'private, no-store',
			'referrer-policy': 'same-origin',
			...(response.headers.has('content-disposition')
				? { 'content-disposition': response.headers.get('content-disposition')! }
				: {})
		}
	});
};
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
