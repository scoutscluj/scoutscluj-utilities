import { error, fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { Dashboard, RosterPreview } from '$lib/membership/types';
import type { Actions, RequestEvent } from '@sveltejs/kit';

export const loadMembershipAdmin = async ({ cookies, locals, setHeaders }: RequestEvent) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	if (!locals.user?.roles.some((r) => ['admin', 'finance_manager', 'super_admin'].includes(r)))
		error(403, 'Nu ai acces la cotizații.');
	const response = await apiFetch('/api/membership/admin', {
		headers: {
			cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
		}
	});
	if (!response.ok) error(response.status, 'Registrul nu a putut fi încărcat.');
	return { ledger: (await response.json()) as Dashboard };
};

const amount = (value: FormDataEntryValue | null) => {
	const text = String(value ?? '').replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
	return Math.round(Number(text) * 100);
};

export const membershipAdminActions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.user?.roles.some((r) => ['admin', 'finance_manager', 'super_admin'].includes(r)))
			error(403);
		const form = await request.formData();
		const action = form.get('action');
		let path: string;
		const body: Record<string, unknown> = Object.fromEntries(form);
		delete body.action;
		if (action === 'rosterPreview') {
			const response = await apiFetch('/api/membership/roster/preview', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
				},
				body: '{}'
			});
			const result = (await response.json()) as RosterPreview & { message?: string };
			if (!response.ok)
				return fail(response.status, {
					success: false,
					message: result.message ?? 'Previzualizarea ORGO nu a putut fi încărcată.'
				});
			return { success: true, preview: result };
		} else if (action === 'rosterInitialize' || action === 'rosterSync') {
			path = action === 'rosterInitialize' ? 'roster/initialize' : 'roster/sync';
		} else if (action === 'period') {
			path = 'periods';
			body.totals = Object.fromEntries(
				['normal', 'fam1', 'fam2', 'fam3', 'social'].map((key) => [key, amount(form.get(key))])
			);
		} else if (action === 'activate')
			path = `periods/${encodeURIComponent(String(form.get('id')))}/activate`;
		else if (action === 'obligation') path = 'obligations';
		else if (action === 'bank') {
			path = 'bank-receipts';
			body.amountBani = amount(form.get('amount'));
		} else if (action === 'allocate') {
			path = 'allocations';
			body.amountBani = amount(form.get('amount'));
		} else if (action === 'reverse')
			path = `allocations/${encodeURIComponent(String(form.get('id')))}/reverse`;
		else if (action === 'reconcile') {
			path = `receipts/${encodeURIComponent(String(form.get('id')))}/reconcile`;
			body.refundedBani = amount(form.get('refunded'));
		} else if (action === 'payout') {
			path = 'payouts';
			body.receiptIds = form.getAll('receiptIds');
			body.netBani = amount(form.get('net'));
			body.chargesBani = amount(form.get('charges'));
		} else if (action === 'close')
			path = `checkouts/${encodeURIComponent(String(form.get('id')))}/close`;
		else if (action === 'batch') {
			path = 'national-batches';
			body.obligationIds = form.getAll('obligationIds');
		} else if (action === 'retryOrgo') {
			path = `national-items/${encodeURIComponent(String(form.get('id')))}/retry`;
			body.verifiedNotRecorded = form.get('verifiedNotRecorded') === 'on';
		} else if (action === 'confirm')
			path = `national-items/${encodeURIComponent(String(form.get('id')))}/confirm`;
		else return fail(400, { success: false, message: 'Acțiune necunoscută.' });
		const response = await apiFetch(`/api/membership/${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookies.get(SESSION_COOKIE_NAME) ?? '')}`
			},
			body: JSON.stringify(body)
		});
		const result = (await response.json()) as {
			message?: string;
			added?: number;
			updated?: number;
			review?: number;
		};
		if (!response.ok)
			return fail(response.status, {
				success: false,
				message: result.message ?? 'Operațiunea nu a putut fi salvată.'
			});
		if (action === 'rosterInitialize' || action === 'rosterSync')
			return {
				success: true,
				message: `Sincronizare finalizată: ${result.added ?? 0} membri adăugați, ${result.updated ?? 0} actualizați, ${result.review ?? 0} de verificat.`
			};
		if (action === 'batch')
			return {
				success: true,
				message:
					'Transferul a fost înregistrat. Verificarea și marcarea cotizațiilor în ORGO sunt programate automat. Urmărește rezultatul pentru fiecare membru.'
			};
		if (action === 'retryOrgo')
			return {
				success: true,
				message: 'Verificarea ORGO a fost programată. Actualizează pagina pentru rezultat.'
			};
		return { success: true, message: 'Operațiunea a fost înregistrată.' };
	}
};
