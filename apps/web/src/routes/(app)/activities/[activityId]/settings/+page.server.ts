import { error, fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { canManageActivity, filterActivityDepartments } from '../activity-meta';
import { authHeaders, parseActivityId, readApiMessage } from '../kitchen/kitchen-api';

const cleanValue = (value: FormDataEntryValue | null) => {
	const cleaned = value?.toString().trim();
	return cleaned || undefined;
};

const patchActivity = async (
	cookies: Cookies,
	activityId: number,
	body: Record<string, unknown>,
	messageKey: 'detailsMessage' | 'departmentMessage',
	successMessage: string,
	pathSuffix = ''
) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		return fail(401, { [messageKey]: 'Autentificarea este necesară.' });
	}

	const response = await apiFetch(`/api/activities/${activityId}${pathSuffix}`, {
		method: 'PATCH',
		headers: {
			...authHeaders(sessionToken),
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		return fail(response.status, { [messageKey]: await readApiMessage(response) });
	}

	return { [messageKey]: successMessage };
};

export const load: PageServerLoad = async ({ parent }) => {
	const { activity, user } = await parent();
	if (!canManageActivity(activity, user)) {
		error(403, 'Nu poți modifica setările acestei activități.');
	}

	return {};
};

export const actions: Actions = {
	details: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();

		return patchActivity(
			cookies,
			activityId,
			{
				title: formData.get('title')?.toString() ?? '',
				type: cleanValue(formData.get('type')),
				status: cleanValue(formData.get('status')),
				startDate: cleanValue(formData.get('startDate')),
				endDate: cleanValue(formData.get('endDate')),
				location: cleanValue(formData.get('location')),
				description: cleanValue(formData.get('description'))
			},
			'detailsMessage',
			'Detaliile au fost salvate.'
		);
	},
	departments: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const departments = filterActivityDepartments(formData.getAll('departments'));

		return patchActivity(
			cookies,
			activityId,
			{ departments },
			'departmentMessage',
			'Departamentele au fost salvate.',
			'/departments'
		);
	}
};
