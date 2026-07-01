import { fail } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { Actions } from './$types';

type ActivityDepartment = 'finance' | 'kitchen' | 'program' | 'logistics';

const validDepartments = new Set<ActivityDepartment>([
	'finance',
	'kitchen',
	'program',
	'logistics'
]);

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

export const actions: Actions = {
	departments: async ({ request, cookies, params }) => {
		const sessionToken = cookies.get(SESSION_COOKIE_NAME);
		if (!sessionToken) {
			return fail(401, { departmentMessage: 'Autentificarea este necesară.' });
		}

		const formData = await request.formData();
		const departments = formData
			.getAll('departments')
			.map((value) => value.toString())
			.filter((department): department is ActivityDepartment =>
				validDepartments.has(department as ActivityDepartment)
			);

		const response = await apiFetch(`/api/activities/${params.activityId}/departments`, {
			method: 'PATCH',
			headers: {
				...authHeaders(sessionToken),
				'content-type': 'application/json'
			},
			body: JSON.stringify({ departments })
		});

		if (!response.ok) {
			return fail(response.status, { departmentMessage: await readApiMessage(response) });
		}

		return { departmentMessage: 'Departamentele au fost salvate.' };
	}
};
