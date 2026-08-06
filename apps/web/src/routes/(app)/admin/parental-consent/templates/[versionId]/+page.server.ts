import type { ParentalConsentAsset, ParentalConsentTemplate } from '$lib/parental-consent/types';
import { hasRole } from '$lib/auth/roles';
import { parentalConsentJson, parentalConsentResult } from '$lib/server/parental-consent-api';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const guard = (user: App.Locals['user']) => {
	if (!user || !hasRole(user, 'admin'))
		error(403, 'Nu ai acces la editorul de acorduri parentale.');
	return user;
};

const id = (value: string | undefined) => {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) error(400, 'Versiunea template nu este validă.');
	return parsed;
};

export const load: PageServerLoad = async ({ cookies, locals, params }) => {
	const user = guard(locals.user);
	const versionId = id(params.versionId);
	const [template, assets] = await Promise.all([
		parentalConsentJson<ParentalConsentTemplate>(
			cookies,
			`/api/parental-consent/admin/templates/${versionId}`
		),
		parentalConsentJson<ParentalConsentAsset[]>(cookies, '/api/parental-consent/admin/assets')
	]);
	return { template, assets, isSuperAdmin: hasRole(user, 'super_admin') };
};

export const actions: Actions = {
	save: async ({ cookies, locals, params, request }) => {
		guard(locals.user);
		const data = await request.formData();
		try {
			const result = await parentalConsentResult<ParentalConsentTemplate>(
				cookies,
				`/api/parental-consent/admin/templates/${id(params.versionId)}`,
				{
					method: 'PATCH',
					body: JSON.stringify({
						expectedUpdatedAt: String(data.get('expectedUpdatedAt')),
						name: String(data.get('name')),
						document: JSON.parse(String(data.get('document'))),
						layout: JSON.parse(String(data.get('layout')))
					})
				}
			);
			if (!result.ok)
				return fail(result.status, {
					action: 'save',
					message: result.message,
					conflict: result.status === 409
				});
			const template = result.data;
			return { success: true, action: 'save', updatedAt: template.updatedAt };
		} catch (cause) {
			if (cause instanceof SyntaxError)
				return fail(400, { action: 'save', message: 'Structura editorului nu este validă.' });
			throw cause;
		}
	},
	activate: async ({ cookies, locals, params }) => {
		const user = guard(locals.user);
		if (!hasRole(user, 'super_admin'))
			return fail(403, {
				action: 'activate',
				message: 'Doar super_admin poate activa o versiune.'
			});
		const result = await parentalConsentResult(
			cookies,
			`/api/parental-consent/admin/templates/${id(params.versionId)}/activate`,
			{ method: 'POST' }
		);
		if (!result.ok) return fail(result.status, { action: 'activate', message: result.message });
		return { success: true, action: 'activate' };
	}
};
