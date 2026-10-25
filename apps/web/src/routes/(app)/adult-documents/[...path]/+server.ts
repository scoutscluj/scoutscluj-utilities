import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { documentHeaders } from '$lib/server/adult-documents';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { RequestHandler } from './$types';

const proxy: RequestHandler = async ({ request, params, cookies, locals, url }) => {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token) error(401, 'Autentificarea este necesară.');
	const path = params.path;
	const uuid = '[0-9a-fA-F-]{36}';
	const allowed =
		request.method === 'GET'
			? new RegExp(`^(mine|members/${uuid}|versions/${uuid}/download)$`).test(path)
			: new RegExp(`^(members/${uuid}|versions/${uuid}/review)$`).test(path);
	if (!allowed) error(404, 'Operațiunea nu există.');
	if (request.method === 'POST' && request.headers.get('origin') !== url.origin)
		error(403, 'Originea cererii nu este permisă.');
	const query = new URLSearchParams();
	if (url.searchParams.has('year')) query.set('year', url.searchParams.get('year')!);
	let response: Response;
	try {
		response = await apiFetch(`/api/adult-documents/${path}?${query}`, {
			method: request.method,
			headers: {
				...documentHeaders(token),
				...(request.method === 'POST' ? { 'content-type': 'application/json' } : {})
			},
			body: request.method === 'POST' ? await request.text() : undefined
		});
	} catch {
		error(503, 'Documentele nu sunt disponibile momentan. Încearcă din nou.');
	}
	const headers = new Headers({
		'cache-control': 'private, no-store',
		'x-content-type-options': 'nosniff'
	});
	// fetch decodes compressed upstream bodies; their original byte length no
	// longer describes this stream. Let the web server frame the decoded body.
	for (const name of ['content-type', 'content-disposition']) {
		const value = response.headers.get(name);
		if (value) headers.set(name, value);
	}
	return new Response(response.body, { status: response.status, headers });
};

export const GET = proxy;
export const POST = proxy;
