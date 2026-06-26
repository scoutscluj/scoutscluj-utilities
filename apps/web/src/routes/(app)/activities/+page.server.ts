import { error, fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export type ActivityType = 'camp' | 'hike' | 'festival' | 'training' | 'meeting' | 'other';

export type ActivityStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export type Activity = {
	id: number;
	title: string;
	type: ActivityType;
	status: ActivityStatus;
	coordinatorId: number;
	coordinatorName: string;
	startDate?: string;
	endDate?: string;
	location?: string;
	description?: string;
	orgoEventId?: string;
	orgoEventIri?: string;
	financeSummary: {
		totalDocuments: number;
		openDocuments: number;
		sentDocuments: number;
		needsClarification: number;
	};
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

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionToken = getSessionToken(cookies);
	const response = await apiFetch('/api/activities', {
		headers: authHeaders(sessionToken)
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	return {
		activities: (await response.json()) as Activity[]
	};
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const formData = await request.formData();
		const title = formData.get('title')?.toString();
		const type = formData.get('type')?.toString();
		const sessionToken = getSessionToken(cookies);

		const response = await apiFetch('/api/activities', {
			method: 'POST',
			headers: {
				...authHeaders(sessionToken),
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				title,
				type,
				startDate: formData.get('startDate')?.toString(),
				endDate: formData.get('endDate')?.toString(),
				location: formData.get('location')?.toString(),
				description: formData.get('description')?.toString()
			})
		});

		if (!response.ok) {
			return fail(response.status, { message: await readApiMessage(response) });
		}

		const activity = (await response.json()) as Activity;
		redirect(303, `/activities/${activity.id}`);
	}
};
