import { error, type Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import { hasRole } from '$lib/auth/roles';
import type { PageServerLoad } from './$types';

export type AuditEntry = {
	id: number;
	actorName?: string;
	action: string;
	entityType: string;
	entityId: string;
	activityId?: number;
	metadata: Record<string, unknown>;
	createdAt: string;
};

const getSessionToken = (cookies: Cookies) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	return sessionToken;
};

const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		return Array.isArray(body.message) ? body.message.join(' ') : (body.message ?? 'Operațiunea nu a reușit.');
	} catch {
		return 'Operațiunea nu a reușit.';
	}
};

export const load: PageServerLoad = async ({ cookies, locals }) => {
	if (!hasRole(locals.user, 'super_admin')) {
		error(403, 'Nu ai acces la jurnalul global de audit.');
	}

	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch('/api/audit', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
		}
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	return {
		entries: (await response.json()) as AuditEntry[]
	};
};
