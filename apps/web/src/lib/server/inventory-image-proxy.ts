import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Cookies } from '@sveltejs/kit';

const FORWARDED_RESPONSE_HEADERS = [
	'cache-control',
	'content-disposition',
	'content-length',
	'content-type',
	'etag'
];

export const proxyInventoryImage = async ({
	cookies,
	request,
	apiPath
}: {
	cookies: Cookies;
	request: Request;
	apiPath: string;
}) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	const headers = new Headers({
		cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
	});
	const ifNoneMatch = request.headers.get('if-none-match');
	if (ifNoneMatch) {
		headers.set('if-none-match', ifNoneMatch);
	}

	const response = await apiFetch(apiPath, { headers });
	if (!response.ok && response.status !== 304) {
		error(response.status, 'Imaginea nu este disponibilă.');
	}

	const responseHeaders = new Headers();
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value = response.headers.get(name);
		if (value) responseHeaders.set(name, value);
	}

	return new Response(response.status === 304 ? null : response.body, {
		status: response.status,
		headers: responseHeaders
	});
};
