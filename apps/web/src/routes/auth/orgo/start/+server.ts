import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { apiFetch, type OrgoRequestTokenResponse } from '$lib/server/api';
import {
	ORGO_REDIRECT_COOKIE_NAME,
	ORGO_WEB_ORIGIN_COOKIE_NAME,
	secureCookie
} from '$lib/server/cookies';
import { getSafeRedirectTarget } from '$lib/server/redirects';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const redirectTo = getSafeRedirectTarget(url.searchParams.get('redirectTo'));
	const response = await apiFetch('/api/auth/orgo/request-token', {
		method: 'POST'
	});
	const payload = (await response.json().catch(() => null)) as OrgoRequestTokenResponse | null;

	if (!response.ok || !payload?.redirect_url) {
		error(502, payload?.message ?? 'Nu am putut porni autentificarea Orgo.');
	}

	cookies.set(ORGO_REDIRECT_COOKIE_NAME, redirectTo, {
		httpOnly: true,
		secure: secureCookie(),
		sameSite: 'lax',
		path: '/',
		maxAge: 600
	});
	cookies.set(ORGO_WEB_ORIGIN_COOKIE_NAME, url.origin, {
		httpOnly: true,
		secure: secureCookie(),
		sameSite: 'lax',
		path: '/',
		maxAge: 600
	});

	redirect(303, payload.redirect_url);
};
