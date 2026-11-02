import type { Actions, PageServerLoad } from './$types';
import { randomUUID } from 'node:crypto';
import { error, fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';
import { submitApplication, applicationBody } from '$lib/server/admissions';
import type { AdmissionList } from '$lib/members/admissions';
export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const response = await apiFetch('/api/member-applications', { headers: memberHeaders(event) });
	if (!response.ok) error(response.status, 'Cererile de înscriere nu au putut fi încărcate.');
	return { applications: (await response.json()) as AdmissionList, requestKey: randomUUID() };
};
export const actions: Actions = {
	create: (event) => submitApplication(event, true),
	edit: async (event) => {
		const form = await event.request.formData(),
			id = String(form.get('id'));
		const response = await apiFetch(
			'/api/member-applications/' + encodeURIComponent(id) + '/review',
			{
				method: 'POST',
				headers: { ...memberHeaders(event), 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'edit',
					revision: form.get('revision'),
					unitId: form.get('unitId'),
					data: applicationBody(form)
				})
			}
		);
		if (!response.ok) {
			const problem = await response.json().catch(() => ({}));
			return fail(response.status, { message: problem.message ?? 'Corectarea nu a reușit.' });
		}
		return { message: 'Cererea a fost corectată și necesită confirmare.' };
	},
	review: async (event) => {
		const form = await event.request.formData(),
			id = String(form.get('id'));
		const response = await apiFetch(
			'/api/member-applications/' + encodeURIComponent(id) + '/review',
			{
				method: 'POST',
				headers: { ...memberHeaders(event), 'Content-Type': 'application/json' },
				body: JSON.stringify(Object.fromEntries(form))
			}
		);
		if (!response.ok) {
			const problem = await response.json().catch(() => ({}));
			return fail(response.status, {
				message: problem.message ?? 'Cererea nu a putut fi actualizată.'
			});
		}
		return { message: 'Decizia a fost salvată. Starea Orgo apare separat în cerere.' };
	}
};
