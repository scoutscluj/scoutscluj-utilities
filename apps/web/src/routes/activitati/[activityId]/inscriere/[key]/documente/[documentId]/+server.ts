import { error, type RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
export const GET: RequestHandler = async ({ params, cookies }) => {
	const activityId = Number(params.activityId),
		key = params.key ?? '',
		token = /^[A-Za-z0-9_-]{43}$/.test(key) ? key : '';
	if (
		!Number.isSafeInteger(activityId) ||
		activityId <= 0 ||
		!/^[0-9a-f-]{36}$/.test(params.documentId ?? '')
	)
		error(404);
	const headers = {
		cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`,
		...(token ? { 'x-registration-token': token } : {})
	};
	let id = key;
	if (token) {
		const detail = await apiFetch(`/api/activity-registrations/${activityId}/personal/${token}`, {
			headers
		});
		if (!detail.ok) error(detail.status, 'Link invalid.');
		id = ((await detail.json()) as { id: string }).id;
	}
	if (!/^[0-9a-f-]{36}$/.test(id)) error(404);
	const response = await apiFetch(
		`/api/activity-registrations/${activityId}/registrations/${id}/documents/${params.documentId}`,
		{ headers }
	);
	if (!response.ok) error(response.status, 'Documentul nu este disponibil.');
	return new Response(response.body, {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': response.headers.get('content-disposition') ?? 'attachment',
			'cache-control': 'private, no-store',
			'referrer-policy': 'no-referrer',
			'x-content-type-options': 'nosniff'
		}
	});
};
