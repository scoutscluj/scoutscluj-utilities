import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';

export const POST: RequestHandler = async (event) => {
	if (
		!event.locals.user?.roles.some((role) =>
			['admin', 'super_admin', 'finance_manager'].includes(role)
		)
	)
		error(403);
	const body = await event.request.json();
	if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id))
		error(400, 'Cotizație invalidă.');
	const response = await apiFetch(
		`/api/membership/obligations/${encodeURIComponent(body.id)}/${body.preview === true ? 'fee-plan-preview' : 'fee-plan'}`,
		{
			method: 'POST',
			headers: { ...memberHeaders(event), 'content-type': 'application/json' },
			body: JSON.stringify({ plan: body.plan, note: body.note, version: body.version })
		}
	);
	return json(await response.json(), {
		status: response.status,
		headers: { 'cache-control': 'private, no-store' }
	});
};
