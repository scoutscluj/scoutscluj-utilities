import { error, fail, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Overview, RegistrationSettings } from '$lib/activities/registration';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ cookies }) => {
	const headers = {
		cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
	};
	const [team, setup] = await Promise.all([
		apiFetch('/api/activities/team-options', { headers }),
		apiFetch('/api/activity-registrations/setup-options', { headers })
	]);
	if (!team.ok || !setup.ok) error(503, 'Configurarea activității nu este disponibilă momentan.');
	return {
		teamOptions: (await team.json()) as { id: number; displayName: string }[],
		setup: (await setup.json()) as {
			settings: RegistrationSettings;
			lists: Overview['lists'];
			fee: { percentageBasisPoints: number; fixedBani: number };
		}
	};
};
export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const data = await request.formData();
		let values: Record<string, unknown>;
		try {
			values = JSON.parse(String(data.get('payload'))) as Record<string, unknown>;
			if (!values || typeof values !== 'object' || Array.isArray(values))
				throw new Error('Invalid activity');
		} catch {
			return fail(400, { message: 'Datele formularului nu sunt valide.' });
		}
		const response = await apiFetch('/api/activities', {
			method: 'POST',
			headers: {
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify(values)
		});
		if (!response.ok) {
			const result = (await response.json()) as { message?: string | string[] };
			return fail(response.status, {
				message: Array.isArray(result.message)
					? result.message.join(' ')
					: (result.message ?? 'Activitatea nu a putut fi salvată.'),
				values
			});
		}
		const activity = (await response.json()) as {
			id: number;
			coordinatorId: number;
			administratorIds?: number[];
		};
		const canManage =
			!!locals.user &&
			(activity.coordinatorId === locals.user.id ||
				activity.administratorIds?.includes(locals.user.id) ||
				locals.user.roles.includes('super_admin'));
		redirect(
			303,
			canManage
				? `/activities/${activity.id}/settings?created=1`
				: `/activities/${activity.id}?created=1`
		);
	}
};
