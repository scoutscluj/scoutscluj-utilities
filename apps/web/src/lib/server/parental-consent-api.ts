import { error, type Cookies } from '@sveltejs/kit';
import { apiFetch } from './api';
import { SESSION_COOKIE_NAME } from './cookies';

const token = (cookies: Cookies) => {
	const value = cookies.get(SESSION_COOKIE_NAME);
	if (!value) error(401, 'Autentificarea este necesară.');
	return value;
};

export const parentalConsentHeaders = (cookies: Cookies, json = false) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token(cookies))}`,
	...(json ? { 'content-type': 'application/json' } : {})
});

export const readParentalConsentError = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		return Array.isArray(body.message)
			? body.message.join(' ')
			: body.message || 'Operațiunea nu a reușit.';
	} catch {
		return 'Operațiunea nu a reușit.';
	}
};

export const parentalConsentJson = async <T>(
	cookies: Cookies,
	path: string,
	init: RequestInit = {}
) => {
	const response = await apiFetch(path, {
		...init,
		headers: { ...parentalConsentHeaders(cookies, Boolean(init.body)), ...(init.headers ?? {}) }
	});
	if (!response.ok) error(response.status, await readParentalConsentError(response));
	return (await response.json()) as T;
};

export const parentalConsentJsonOrNull = async <T>(
	cookies: Cookies,
	path: string,
	init: RequestInit = {}
): Promise<T | null> => {
	const response = await apiFetch(path, {
		...init,
		headers: { ...parentalConsentHeaders(cookies, Boolean(init.body)), ...(init.headers ?? {}) }
	});
	if (!response.ok) error(response.status, await readParentalConsentError(response));
	const body = await response.text();
	return body.trim() ? (JSON.parse(body) as T) : null;
};

export const parentalConsentResponse = (cookies: Cookies, path: string, init: RequestInit = {}) =>
	apiFetch(path, {
		...init,
		headers: { ...parentalConsentHeaders(cookies, Boolean(init.body)), ...(init.headers ?? {}) }
	});

export const parentalConsentResult = async <T>(
	cookies: Cookies,
	path: string,
	init: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> => {
	const response = await parentalConsentResponse(cookies, path, init);
	if (!response.ok) {
		return {
			ok: false,
			status: response.status,
			message: await readParentalConsentError(response)
		};
	}
	return { ok: true, data: (await response.json()) as T };
};
