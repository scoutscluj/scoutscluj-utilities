import { error, redirect, type Cookies } from '@sveltejs/kit';
import { apiFetch, type OrgoSignInResponse } from './api';
import {
	ORGO_REDIRECT_COOKIE_NAME,
	clearAuthCookies,
	setOrgoSuccessCookie,
	setSessionCookie
} from './cookies';
import { getSafeRedirectTarget } from './redirects';

export const completeOrgoCallback = async (
	cookies: Cookies,
	successToken: string | null,
	redirectTo?: string | null
) => {
	if (!successToken) {
		clearAuthCookies(cookies);
		error(400, 'Lipseste tokenul de autentificare Orgo.');
	}

	const response = await apiFetch('/api/auth/orgo/signin', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ successToken })
	});
	const payload = (await response.json().catch(() => null)) as OrgoSignInResponse | null;

	if (!response.ok || !payload?.session_token) {
		clearAuthCookies(cookies);
		error(401, payload?.message ?? 'Autentificarea prin Orgo a esuat.');
	}

	const redirectTarget = getSafeRedirectTarget(
		redirectTo ?? cookies.get(ORGO_REDIRECT_COOKIE_NAME)
	);

	setSessionCookie(cookies, payload.session_token);
	setOrgoSuccessCookie(cookies, successToken);
	cookies.delete(ORGO_REDIRECT_COOKIE_NAME, { path: '/' });

	redirect(303, redirectTarget);
};
