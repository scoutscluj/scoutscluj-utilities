import { redirect, type RequestHandler } from '@sveltejs/kit';
import { getApiBaseUrl } from '$lib/server/api';
import { ORGO_REDIRECT_COOKIE_NAME, secureCookie } from '$lib/server/cookies';
import { getSafeRedirectTarget } from '$lib/server/redirects';

export const GET: RequestHandler = ({ cookies, url }) => {
	const redirectTo = getSafeRedirectTarget(url.searchParams.get('redirectTo'));
	const startUrl = new URL('/api/auth/orgo/start', getApiBaseUrl());
	startUrl.searchParams.set('redirectTo', redirectTo);
	startUrl.searchParams.set('webOrigin', url.origin);

	cookies.set(ORGO_REDIRECT_COOKIE_NAME, redirectTo, {
		httpOnly: true,
		secure: secureCookie(),
		sameSite: 'lax',
		path: '/',
		maxAge: 600
	});

	redirect(303, startUrl.toString());
};
