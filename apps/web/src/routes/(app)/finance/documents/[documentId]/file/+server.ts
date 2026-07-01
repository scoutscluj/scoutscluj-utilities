import { error } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { RequestHandler } from './$types';

const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) {
			return body.message.join(' ');
		}

		return body.message ?? 'Documentul nu a putut fi descărcat.';
	} catch {
		return 'Documentul nu a putut fi descărcat.';
	}
};

const inlineDisposition = (disposition: string | null) =>
	disposition ? disposition.replace(/^attachment/i, 'inline') : 'inline';

export const GET: RequestHandler = async ({ cookies, params, url }) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	const response = await apiFetch(`/api/finance/documents/${params.documentId}/file`, {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	const headers = new Headers();
	for (const header of ['content-type', 'content-length', 'cache-control']) {
		const value = response.headers.get(header);
		if (value) {
			headers.set(header, value);
		}
	}
	headers.set(
		'content-disposition',
		url.searchParams.get('preview') === '1'
			? inlineDisposition(response.headers.get('content-disposition'))
			: (response.headers.get('content-disposition') ?? 'attachment')
	);

	return new Response(response.body, { headers });
};
