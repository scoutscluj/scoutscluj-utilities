import type { ParentalConsentDraft, ParentalConsentPublication } from '$lib/parental-consent/types';
import { parentalConsentJson, parentalConsentResult } from '$lib/server/parental-consent-api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { activity, user } = await parent();
	const canManage = activity.coordinatorId === user.id || user.roles.includes('super_admin');
	const publicationPromise = parentalConsentJson<ParentalConsentPublication | null>(
		cookies,
		`/api/activities/${activity.id}/parental-consent/publication`
	);
	const [publication, draft, history] = await Promise.all([
		publicationPromise,
		canManage
			? parentalConsentJson<ParentalConsentDraft>(
					cookies,
					`/api/activities/${activity.id}/parental-consent/draft`
				)
			: undefined,
		canManage
			? parentalConsentJson<ParentalConsentPublication[]>(
					cookies,
					`/api/activities/${activity.id}/parental-consent/history`
				)
			: []
	]);
	return { publication, draft, history, canManage };
};

export const actions: Actions = {
	save: async ({ cookies, params, request }) => {
		const data = await request.formData();
		try {
			const result = await parentalConsentResult<ParentalConsentDraft>(
				cookies,
				`/api/activities/${Number(params.activityId)}/parental-consent/draft`,
				{
					method: 'PATCH',
					body: JSON.stringify({
						revision: Number(data.get('revision')),
						data: JSON.parse(String(data.get('draft')))
					})
				}
			);
			if (!result.ok)
				return fail(result.status, {
					action: 'save',
					message: result.message,
					stale: result.status === 409
				});
			const draft = result.data;
			return { success: true, action: 'save', revision: draft.revision, issues: draft.issues };
		} catch (cause) {
			if (cause instanceof SyntaxError)
				return fail(400, { action: 'save', message: 'Configurația nu este validă.' });
			throw cause;
		}
	},
	publish: async ({ cookies, params }) => {
		const result = await parentalConsentResult<ParentalConsentPublication>(
			cookies,
			`/api/activities/${Number(params.activityId)}/parental-consent/publish`,
			{ method: 'POST' }
		);
		if (!result.ok) return fail(result.status, { action: 'publish', message: result.message });
		const publication = result.data;
		return { success: true, action: 'publish', publicationId: publication.id };
	}
};
