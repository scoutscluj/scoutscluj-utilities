import { fail, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { PersonalObjective } from '$lib/profile/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals, depends }) => {
	depends('app:personal-objectives');
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token) redirect(303, '/login?redirectTo=%2Fprofile');
	try {
		const response = await apiFetch('/api/personal-objectives', {
			headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
		});
		if (!response.ok) throw new Error('Objective list unavailable');
		return { objectives: (await response.json()) as PersonalObjective[], objectivesError: '' };
	} catch {
		return {
			objectives: [] as PersonalObjective[],
			objectivesError: 'Obiectivele nu au putut fi încărcate. Încearcă din nou.'
		};
	}
};

export const actions: Actions = {
	createObjective: async ({ request, cookies, locals }) => {
		const token = cookies.get(SESSION_COOKIE_NAME);
		if (!locals.user || !token) return fail(401, { message: 'Autentificarea este necesară.' });
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const deadline = String(form.get('deadline') ?? '');
		if (!title || title.length > 200 || !description || description.length > 5000 || !deadline) {
			return fail(400, { message: 'Completează titlul, descrierea și termenul limită.' });
		}
		try {
			const response = await apiFetch('/api/personal-objectives', {
				method: 'POST',
				headers: {
					cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({ title, description, deadline })
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as { message?: unknown };
				return fail(response.status, {
					message:
						typeof body.message === 'string' ? body.message : 'Obiectivul nu a putut fi salvat.'
				});
			}
			return { success: true };
		} catch {
			return fail(503, { message: 'Obiectivul nu a putut fi salvat. Încearcă din nou.' });
		}
	}
};
