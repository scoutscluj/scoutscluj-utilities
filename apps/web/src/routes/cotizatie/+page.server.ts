import { randomBytes } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { GuestMemberLookup, Obligation, PaymentStatus, Period } from '$lib/membership/types';
import type { Actions, PageServerLoad } from './$types';

const ATTEMPT_COOKIE = 'membership_attempt';
export const load: PageServerLoad = async ({ cookies, locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	let token = cookies.get(ATTEMPT_COOKIE);
	if (!token) {
		token = randomBytes(32).toString('base64url');
		cookies.set(ATTEMPT_COOKIE, token, {
			path: '/cotizatie',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 86400 * 7
		});
	}
	const catalogResponse = await apiFetch('/api/membership/catalog');
	const catalog = catalogResponse.ok
		? ((await catalogResponse.json()) as {
				period: Period | null;
				cardEnabled: boolean;
				environment: string;
				activeProvider: 'netopia' | 'stripe';
			})
		: {
				period: null,
				cardEnabled: false,
				environment: 'sandbox',
				activeProvider: 'netopia' as const
			};
	const statusResponse = await apiFetch(`/api/membership/status/${encodeURIComponent(token)}`);
	const status = statusResponse.ok ? ((await statusResponse.json()) as PaymentStatus) : null;
	let obligations: Obligation[] = [];
	if (locals.user) {
		const response = await apiFetch('/api/membership/mine', {
			headers: {
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
			}
		});
		if (response.ok) obligations = (await response.json()) as Obligation[];
	}
	return { ...catalog, obligations, status, user: locals.user };
};

export const actions: Actions = {
	lookup: async ({ request }) => {
		const fields = await request.formData();
		const identifier = String(fields.get('identifier') ?? '')
			.trim()
			.toUpperCase();
		const response = await apiFetch('/api/membership/guest-lookup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ identifier })
		});
		const result = (await response.json()) as GuestMemberLookup & { message?: string };
		if (!response.ok) {
			return fail(response.status, {
				intent: 'lookup',
				identifier,
				message: result.message ?? 'ID-ul nu a putut fi verificat.'
			});
		}
		return { intent: 'lookup', lookup: result };
	},
	pay: async ({ request, cookies, locals }) => {
		const fields = await request.formData();
		const own = fields.get('mode') === 'own';
		if (own && !locals.user) return fail(401, { message: 'Autentificarea este necesară.' });
		const billing = Object.fromEntries(
			['firstName', 'lastName', 'email', 'phone', 'city', 'state', 'postalCode'].map((key) => [
				key,
				fields.get(key)
			])
		);
		const guestIdentifier = String(fields.get('identifier') ?? '')
			.trim()
			.toUpperCase();
		const response = await apiFetch(
			own ? '/api/membership/checkout' : '/api/membership/guest-checkout',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(own
						? {
								cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
							}
						: {})
				},
				body: JSON.stringify({
					periodId: fields.get('periodId'),
					obligationId: fields.get('obligationId'),
					identifier: guestIdentifier,
					acceptTerms: fields.get('acceptTerms') === 'on',
					attemptToken: cookies.get(ATTEMPT_COOKIE),
					billing
				})
			}
		);
		const result = (await response.json()) as {
			message?: string;
			paymentUrl?: string;
			state?: string;
		};
		if (!response.ok) {
			let lookup: GuestMemberLookup | undefined;
			if (!own && guestIdentifier) {
				const lookupResponse = await apiFetch('/api/membership/guest-lookup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ identifier: guestIdentifier })
				});
				if (lookupResponse.ok) lookup = (await lookupResponse.json()) as GuestMemberLookup;
			}
			return fail(response.status, {
				intent: 'pay',
				lookup,
				message: result.message ?? 'Plata nu a putut fi inițiată.'
			});
		}
		if (result.paymentUrl && result.state === 'pending') redirect(303, result.paymentUrl);
		redirect(303, '/cotizatie/rezultat');
	},
	another: async ({ cookies }) => {
		const token = cookies.get(ATTEMPT_COOKIE);
		if (token) {
			const response = await apiFetch(`/api/membership/status/${encodeURIComponent(token)}`);
			if (!response.ok) return fail(409, { message: 'Verifică mai întâi starea plății.' });
			const status = (await response.json()) as PaymentStatus;
			if (!['succeeded', 'failed'].includes(status.state))
				return fail(409, {
					message: 'Plata existentă trebuie verificată înainte de o nouă încercare.'
				});
		}
		cookies.delete(ATTEMPT_COOKIE, { path: '/cotizatie' });
		redirect(303, '/cotizatie');
	}
};
