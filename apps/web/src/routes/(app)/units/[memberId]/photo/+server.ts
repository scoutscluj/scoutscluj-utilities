import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async (event) => {
	const response = await apiFetch(
		`/api/members/${encodeURIComponent(event.params.memberId)}/photo`,
		{ headers: memberHeaders(event) }
	);
	return new Response(response.body, {
		status: response.status,
		headers: {
			'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
			'cache-control': 'private, no-store',
			'x-content-type-options': 'nosniff'
		}
	});
};
