import { env } from '$env/dynamic/public';
import type { CurrentUser } from '$lib/auth/types';
import { SESSION_COOKIE_NAME } from './cookies';

const getApiBaseUrl = () => env.PUBLIC_API_BASE_URL || 'http://localhost:3000';

export type OrgoRequestTokenResponse = {
	request_token?: string;
	redirect_url?: string;
	message?: string;
};

export type OrgoSignInResponse = {
	session_token?: string;
	user?: CurrentUser;
	orgo_profile?: Record<string, unknown>;
	was_created?: boolean;
	message?: string;
};

export const apiFetch = (path: string, init?: RequestInit) => {
	return fetch(`${getApiBaseUrl()}${path}`, init);
};

export const fetchCurrentUser = async (sessionToken: string) => {
	const response = await apiFetch('/api/auth/me', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});

	if (!response.ok) {
		return null;
	}

	return (await response.json()) as CurrentUser;
};
