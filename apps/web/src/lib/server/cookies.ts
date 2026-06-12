import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE_NAME = 'scoutscluj_session';
export const ORGO_SUCCESS_COOKIE_NAME = 'scoutscluj_orgo_success';
export const ORGO_REDIRECT_COOKIE_NAME = 'scoutscluj_redirect';
export const ORGO_WEB_ORIGIN_COOKIE_NAME = 'scoutscluj_web_origin';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const secureCookie = () => process.env.NODE_ENV === 'production';

export const setSessionCookie = (cookies: Cookies, token: string) => {
	cookies.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: secureCookie(),
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_TTL_SECONDS
	});
};

export const setOrgoSuccessCookie = (cookies: Cookies, token: string) => {
	cookies.set(ORGO_SUCCESS_COOKIE_NAME, token, {
		httpOnly: true,
		secure: secureCookie(),
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_TTL_SECONDS
	});
};

export const clearAuthCookies = (cookies: Cookies) => {
	for (const name of [
		SESSION_COOKIE_NAME,
		ORGO_SUCCESS_COOKIE_NAME,
		ORGO_REDIRECT_COOKIE_NAME,
		ORGO_WEB_ORIGIN_COOKIE_NAME
	]) {
		cookies.delete(name, { path: '/' });
	}
};
