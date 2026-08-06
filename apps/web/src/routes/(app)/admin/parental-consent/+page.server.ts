import type {
	ParentalConsentAsset,
	ParentalConsentOrganization,
	ParentalConsentTemplate
} from '$lib/parental-consent/types';
import { hasRole } from '$lib/auth/roles';
import { parentalConsentJson, parentalConsentResult } from '$lib/server/parental-consent-api';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const guard = (user: App.Locals['user']) => {
	if (!user || !hasRole(user, 'admin'))
		error(403, 'Nu ai acces la administrarea acordurilor parentale.');
	return user;
};

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const user = guard(locals.user);
	const [organization, assets, templates] = await Promise.all([
		parentalConsentJson<ParentalConsentOrganization>(
			cookies,
			'/api/parental-consent/admin/organization'
		),
		parentalConsentJson<ParentalConsentAsset[]>(cookies, '/api/parental-consent/admin/assets'),
		parentalConsentJson<ParentalConsentTemplate[]>(cookies, '/api/parental-consent/admin/templates')
	]);
	return { organization, assets, templates, isSuperAdmin: hasRole(user, 'super_admin') };
};

export const actions: Actions = {
	createTemplate: async ({ request, cookies, locals }) => {
		guard(locals.user);
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const basedOnVersionId = Number(data.get('basedOnVersionId'));
		if (!name) return fail(400, { action: 'createTemplate', message: 'Numele este obligatoriu.' });
		const result = await parentalConsentResult(cookies, '/api/parental-consent/admin/templates', {
			method: 'POST',
			body: JSON.stringify({ name, basedOnVersionId: basedOnVersionId || undefined })
		});
		if (!result.ok)
			return fail(result.status, { action: 'createTemplate', message: result.message });
		return { success: true, action: 'createTemplate' };
	},
	updateOrganization: async ({ request, cookies, locals }) => {
		const user = guard(locals.user);
		if (!hasRole(user, 'super_admin'))
			return fail(403, {
				action: 'updateOrganization',
				message: 'Doar super_admin poate modifica identitatea.'
			});
		const data = await request.formData();
		const result = await parentalConsentResult(
			cookies,
			'/api/parental-consent/admin/organization',
			{
				method: 'PATCH',
				body: JSON.stringify({
					revision: Number(data.get('revision')),
					name: String(data.get('name') ?? ''),
					legalName: String(data.get('legalName') ?? ''),
					address: String(data.get('address') ?? ''),
					email: String(data.get('email') ?? ''),
					phone: String(data.get('phone') ?? ''),
					website: String(data.get('website') ?? '')
				})
			}
		);
		if (!result.ok)
			return fail(result.status, { action: 'updateOrganization', message: result.message });
		return { success: true, action: 'updateOrganization' };
	},
	uploadAsset: async ({ request, cookies, locals }) => {
		const user = guard(locals.user);
		if (!hasRole(user, 'super_admin'))
			return fail(403, {
				action: 'uploadAsset',
				message: 'Doar super_admin poate încărca asset-uri.'
			});
		const data = await request.formData();
		const file = data.get('file');
		if (!(file instanceof File) || !file.size)
			return fail(400, { action: 'uploadAsset', message: 'Alege o imagine.' });
		const result = await parentalConsentResult(cookies, '/api/parental-consent/admin/assets', {
			method: 'POST',
			body: JSON.stringify({
				name: String(data.get('name') ?? file.name),
				altText: String(data.get('altText') ?? file.name),
				contentType: file.type,
				dataBase64: Buffer.from(await file.arrayBuffer()).toString('base64')
			})
		});
		if (!result.ok) return fail(result.status, { action: 'uploadAsset', message: result.message });
		return { success: true, action: 'uploadAsset' };
	},
	deleteAsset: async ({ request, cookies, locals }) => {
		const user = guard(locals.user);
		if (!hasRole(user, 'super_admin'))
			return fail(403, {
				action: 'deleteAsset',
				message: 'Doar super_admin poate șterge asset-uri.'
			});
		const data = await request.formData();
		const assetId = Number(data.get('assetId'));
		const result = await parentalConsentResult(
			cookies,
			`/api/parental-consent/admin/assets/${assetId}`,
			{
				method: 'DELETE'
			}
		);
		if (!result.ok) return fail(result.status, { action: 'deleteAsset', message: result.message });
		return { success: true, action: 'deleteAsset' };
	}
};
