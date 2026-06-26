import { error, fail } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import type { UserRole } from '$lib/auth/types';
import { apiFetch, fetchCurrentUser } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const roleOrder: UserRole[] = ['moderator', 'admin', 'finance_manager', 'super_admin'];

export type AdminUser = {
	id: number;
	email?: string;
	displayName: string;
	firstName?: string;
	lastName?: string;
	avatarUrl?: string;
	roles: UserRole[];
	orgoConnection?: {
		orgoUserId?: number;
		cardId?: string;
		email?: string;
		connectedAt?: string;
		lastLoginAt?: string;
	};
	lastLoginAt?: string;
	createdAt: string;
	updatedAt: string;
};

const getSessionToken = (cookies: Cookies) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	return sessionToken;
};

const authHeaders = (sessionToken: string) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
});

const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) {
			return body.message.join(' ');
		}

		return body.message ?? 'Operațiunea nu a reușit.';
	} catch {
		return 'Operațiunea nu a reușit.';
	}
};

const parseRoles = (formData: FormData) => {
	const roles = formData.getAll('roles').map((role) => role.toString());
	const uniqueRoles = new Set(roles);

	for (const role of uniqueRoles) {
		if (!roleOrder.includes(role as UserRole)) {
			return null;
		}
	}

	return roleOrder.filter((role) => uniqueRoles.has(role));
};

export const load: PageServerLoad = async ({ cookies, locals }) => {
	if (!hasRole(locals.user, 'super_admin')) {
		error(403, 'Nu ai acces la administrarea utilizatorilor.');
	}

	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch('/api/users', {
		headers: authHeaders(sessionToken)
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	return {
		users: (await response.json()) as AdminUser[],
		roleOrder
	};
};

export const actions: Actions = {
	updateRoles: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'super_admin')) {
			return fail(403, { message: 'Nu ai acces la această acțiune.', success: false });
		}

		const formData = await request.formData();
		const userId = Number(formData.get('userId'));
		const roles = parseRoles(formData);

		if (!Number.isInteger(userId) || userId <= 0 || !roles) {
			return fail(400, { message: 'Datele rolurilor nu sunt valide.', success: false });
		}

		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch(`/api/users/${userId}/roles`, {
			method: 'PATCH',
			headers: {
				...authHeaders(sessionToken),
				'content-type': 'application/json'
			},
			body: JSON.stringify({ roles })
		});

		if (!response.ok) {
			return fail(response.status, {
				message: await readApiMessage(response),
				success: false,
				userId
			});
		}

		if (locals.user?.id === userId) {
			locals.user = await fetchCurrentUser(sessionToken);
		}

		return { message: 'Rolurile au fost actualizate.', success: true, userId };
	}
};
