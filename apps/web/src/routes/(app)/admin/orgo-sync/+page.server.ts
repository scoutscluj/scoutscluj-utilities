import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';
type Row = {
	id: string;
	kind: string;
	state: string;
	message: string;
	name?: string;
	subjectId?: string;
	createdAt: string;
};
type Preview = {
	changes: { label: string; local: string; remote: string }[];
	roleCreateStarted: boolean;
	id: string;
	name: string;
	kind: string;
	version: string;
	message: string;
	remoteStatus: string;
	remoteRoles: { name: string; unitName: string | null }[];
};
export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const r = await apiFetch('/api/members/orgo/outbox', { headers: memberHeaders(event) });
	if (!r.ok) error(r.status, 'Nu ai acces la administrarea sincronizării Orgo.');
	return { outbox: (await r.json()) as { members: Row[]; objects: Row[] } };
};
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData(),
			id = String(form.get('id')),
			action = String(form.get('action'));
		const base = '/api/members/orgo/';
		const path =
			action === 'preview'
				? `retry/${encodeURIComponent(id)}/preview`
				: action === 'retry'
					? `retry/${encodeURIComponent(id)}`
					: `objects/${encodeURIComponent(id)}/retry`;
		const r = await apiFetch(base + path, {
			method: 'POST',
			headers: { ...memberHeaders(event), 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...Object.fromEntries(form),
				absenceVerified: form.get('absenceVerified') === 'on'
			})
		});
		const result = await r.json().catch(() => ({}));
		if (!r.ok)
			return fail(r.status, {
				message: result.message ?? 'Operațiunea nu a putut fi reluată.',
				preview: null
			});
		return {
			message:
				action === 'preview'
					? 'Verifică starea curentă din Orgo înainte de confirmare.'
					: 'Reverificarea a fost programată.',
			preview: action === 'preview' ? (result as Preview) : null
		};
	}
};
