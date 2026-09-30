import { error, fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Dashboard } from '$lib/membership/types';
import type { Actions, PageServerLoad } from './$types';

const canManagePayments = (roles: string[]) =>
	roles.some((role) => ['admin', 'finance_manager', 'super_admin'].includes(role));

export const load: PageServerLoad = async ({ cookies, locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	if (!locals.user || !canManagePayments(locals.user.roles)) {
		error(403, 'Nu ai acces la configurarea procesatorilor de plăți.');
	}

	const response = await apiFetch('/api/membership/admin', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
		}
	});
	if (!response.ok) {
		error(response.status, 'Configurația procesatorilor nu a putut fi încărcată.');
	}

	const dashboard = (await response.json()) as Dashboard;
	return { paymentConfiguration: dashboard.paymentConfiguration };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.user || !canManagePayments(locals.user.roles)) {
			error(403);
		}

		const form = await request.formData();
		const action = form.get('action');
		const path =
			action === 'provider'
				? 'payment-provider'
				: action === 'provider-configuration'
					? 'payment-provider/configuration'
					: null;
		if (!path) {
			return fail(400, { message: 'Acțiune necunoscută.' });
		}

		const body: Record<string, unknown> = Object.fromEntries(form);
		delete body.action;
		if (action === 'provider') {
			const [provider, environment] = String(body.target ?? '').split(':');
			body.provider = provider;
			body.environment = environment;
			delete body.target;
		}
		const response = await apiFetch(`/api/membership/${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
			},
			body: JSON.stringify(body)
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			return fail(response.status, {
				message: result.message ?? 'Configurația nu a putut fi salvată.'
			});
		}

		return {
			message:
				action === 'provider'
					? 'Procesatorul activ a fost actualizat.'
					: 'Configurația securizată a fost salvată.'
		};
	}
};
