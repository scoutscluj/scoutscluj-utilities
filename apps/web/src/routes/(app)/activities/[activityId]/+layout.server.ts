import { error } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { Cookies } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

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

const parseActivityId = (value: string | undefined) => {
	const activityId = Number(value);
	if (!Number.isInteger(activityId) || activityId <= 0) {
		error(400, 'Activitatea nu este validă.');
	}

	return activityId;
};

export const load: LayoutServerLoad = async ({ cookies, params }) => {
	const sessionToken = getSessionToken(cookies);
	const activityId = parseActivityId(params.activityId);
	const response = await apiFetch(`/api/activities/${activityId}`, {
		headers: authHeaders(sessionToken)
	});

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}

	return {
		activity: (await response.json()) as Activity
	};
};
