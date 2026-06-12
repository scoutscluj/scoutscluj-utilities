import { redirect, type RequestHandler } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import {
	ORGO_SUCCESS_COOKIE_NAME,
	SESSION_COOKIE_NAME,
	clearAuthCookies
} from '$lib/server/cookies';

export const POST: RequestHandler = async ({ cookies }) => {
	const successToken = cookies.get(ORGO_SUCCESS_COOKIE_NAME);
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);

	await apiFetch('/api/auth/logout', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(sessionToken
				? { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}` }
				: {})
		},
		body: JSON.stringify({ successToken })
	}).catch(() => null);

	clearAuthCookies(cookies);
	redirect(303, '/login');
};
