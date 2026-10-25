import { fail, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { PersonalObjective } from '$lib/profile/types';
import type { Obligation } from '$lib/membership/types';
import type { Actions, PageServerLoad } from './$types';
import { loadOwnDocuments } from '$lib/server/adult-documents';

const loadFeePaymentDue = async (token: string, orgoUserId?: number): Promise<boolean | null> => {
	if (!orgoUserId) return null;
	try {
		const [catalogResponse, obligationsResponse] = await Promise.all([
			apiFetch('/api/membership/catalog'),
			apiFetch('/api/membership/mine', {
				headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
			})
		]);
		if (!catalogResponse.ok || !obligationsResponse.ok) return null;
		const catalog = (await catalogResponse.json()) as { period?: { id: string } };
		const obligations = (await obligationsResponse.json()) as Obligation[];
		const own = obligations.find(
			(item) => item.periodId === catalog.period?.id && item.orgoUserId === orgoUserId
		);
		return own ? own.totalBani > (own.paidBani ?? 0) : null;
	} catch {
		return null;
	}
};

export const load: PageServerLoad = async ({ cookies, locals, depends }) => {
	depends('app:personal-objectives');
	depends('app:adult-documents');
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token) redirect(303, '/login?redirectTo=%2Fprofile');
	const feePaymentDue = loadFeePaymentDue(token, locals.user.orgoConnection?.orgoUserId);
	const adultDocuments = loadOwnDocuments(token);
	try {
		const response = await apiFetch('/api/personal-objectives', {
			headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
		});
		if (!response.ok) throw new Error('Objective list unavailable');
		return {
			objectives: (await response.json()) as PersonalObjective[],
			objectivesError: '',
			feePaymentDue: await feePaymentDue,
			adultDocuments: await adultDocuments
		};
	} catch {
		return {
			objectives: [] as PersonalObjective[],
			objectivesError: 'Obiectivele nu au putut fi încărcate. Încearcă din nou.',
			feePaymentDue: await feePaymentDue,
			adultDocuments: await adultDocuments
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
