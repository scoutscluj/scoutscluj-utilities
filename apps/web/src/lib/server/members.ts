import { error, fail, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { apiFetch } from './api';
import { SESSION_COOKIE_NAME } from './cookies';
export const memberHeaders = (event: RequestEvent) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(event.cookies.get(SESSION_COOKIE_NAME) ?? '')}`
});
export async function memberRead<T>(event: RequestEvent, path: string): Promise<T> {
	const response = await apiFetch(`/api/members${path}`, { headers: memberHeaders(event) });
	if (!response.ok) error(response.status, 'Registrul de membri nu a putut fi încărcat.');
	return (await response.json()) as T;
}
export async function memberAction(event: RequestEvent) {
	const form = await event.request.formData();
	const action = String(form.get('action'));
	const id = event.params.memberId;
	const body: Record<string, unknown> = Object.fromEntries(form);
	delete body.action;
	if (form.has('keepLocal')) body.keepLocal = form.get('keepLocal') === 'on';
	let path: string;
	if (action === 'fee-menu') {
		const target = String(form.get('id'));
		const detail = await memberRead<import('$lib/members/types').Detail>(
			event,
			'/' + encodeURIComponent(target)
		);
		return {
			section: action,
			message: '',
			feeMenu: { id: target, name: detail.member.name, fees: detail.fees }
		};
	}
	if (action === 'bulk') {
		path = '/bulk';
		try {
			body.members = JSON.parse(String(form.get('members')));
			body.changes = JSON.parse(String(form.get('changes')));
		} catch {
			return fail(400, { message: 'Selecție invalidă.' });
		}
		body.confirm = form.get('confirm') === 'on';
	} else if (action === 'refresh') path = '/orgo/refresh';
	else if (action === 'direct-national') {
		const response = await apiFetch('/api/membership/national-direct', {
			method: 'POST',
			headers: { ...memberHeaders(event), 'Content-Type': 'application/json' },
			body: JSON.stringify({
				obligationId: form.get('obligationId'),
				reference: form.get('reference'),
				receivedOn: form.get('receivedOn'),
				...(form.get('receiptId') ? { receiptId: form.get('receiptId') } : {}),
				...(form.get('amount') ? { amountBani: Math.round(Number(form.get('amount')) * 100) } : {})
			})
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok)
			return fail(response.status, {
				section: action,
				message: result.message ?? 'Plata nu a putut fi confirmată.'
			});
		return {
			section: action,
			message: 'Plata națională a fost verificată; partea locală este înregistrată.'
		};
	} else if (action === 'classify') {
		path = '/structures/confirm';
		try {
			body.members = JSON.parse(String(form.get('members')));
			body.units = JSON.parse(String(form.get('units')));
		} catch {
			return fail(400, { message: 'Reîncarcă previzualizarea.' });
		}
		body.confirm = form.get('confirm') === 'on';
	} else if (action === 'unit') path = '/units';
	else if (action === 'archive')
		path = `/units/${encodeURIComponent(String(form.get('id')))}/archive`;
	else if (action === 'create') path = '';
	else if (action === 'progression') {
		path = '/progression';
		body.enabled = form.get('enabled') === 'on';
	} else if (action === 'import') {
		path = '/orgo/import';
		if (form.get('units')) {
			try {
				body.units = JSON.parse(String(form.get('units')));
			} catch {
				return fail(400, { message: 'Unități invalide.' });
			}
		}
		body.confirm = form.get('confirm') === 'on';
	} else if (action === 'retry') path = `/orgo/retry/${encodeURIComponent(String(form.get('id')))}`;
	else if (id) {
		path = `/${encodeURIComponent(id)}`;
		if (action === 'orgo-profile') {
			path += '/orgo-profile';
			body.values = {};
			for (const [key, value] of form)
				if (key.startsWith('orgo.'))
					(body.values as Record<string, string>)[key.slice(5)] = String(value);
			for (const key of Object.keys(body)) if (key.startsWith('orgo.')) delete body[key];
		} else if (action === 'conflict') path += '/conflicts';
		else if (action === 'photo') {
			path += '/photo';
			const file = form.get('file');
			if (
				!(file instanceof File) ||
				file.size > 2097152 ||
				!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
			)
				return fail(400, { message: 'Alege o fotografie JPG, PNG sau WebP de maximum 2 MB.' });
			body.data =
				'data:' + file.type + ';base64,' + Buffer.from(await file.arrayBuffer()).toString('base64');
			delete body.file;
		} else if (action === 'profile') {
			const profile: Record<string, string> = {};
			for (const [key, value] of form)
				if (key.startsWith('profile.')) profile[key.slice(8)] = String(value);
			for (const key of Object.keys(body)) if (key.startsWith('profile.')) delete body[key];
			body.profile = profile;
		} else if (action === 'note') path += '/notes';
		else if (action === 'transfer') path += '/transfer';
		else if (action === 'withdraw' || action === 'reactivate') {
			path += '/lifecycle';
			body.action = action;
		} else if (action === 'assignment') {
			path += '/assignments';
			for (const key of ['canEdit', 'canSeeFees', 'canSeeSensitive'])
				body[key] = form.get(key) === 'on';
		} else if (action === 'link') path += '/orgo-link';
		else if (action === 'end')
			path += `/assignments/${encodeURIComponent(String(form.get('assignmentId')))}/end`;
		else return fail(400, { message: 'Acțiune necunoscută.' });
	} else return fail(400, { message: 'Acțiune necunoscută.' });
	const response = await apiFetch(`/api/members${path}`, {
		method: 'POST',
		headers: { ...memberHeaders(event), 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const result = (await response.json()) as {
		message?: string;
		id?: string;
		added?: number;
		unitsAdded?: number;
		conflicts?: number;
		applied?: boolean;
		version?: string;
		members?: { id: string; name: string; revision: number; from: string; unitId: string | null }[];
		changes?: Record<string, unknown>;
	};
	if (!response.ok)
		return fail(response.status, {
			section: action,
			message: result.message ?? 'Modificarea nu a putut fi salvată.'
		});
	if (action === 'bulk' && !result.applied)
		return {
			section: action,
			message: 'Verifică persoanele și modificarea înainte de confirmare.',
			bulkPreview: { version: result.version!, members: result.members!, changes: result.changes! }
		};
	if (action === 'create' && result.id) redirect(303, `/units/${result.id}`);
	return {
		section: action,
		message:
			action === 'import'
				? `Import finalizat: ${result.added ?? 0} membri și ${result.unitsAdded ?? 0} unități adăugate, ${result.conflicts ?? 0} cazuri de verificat.`
				: ((
						{
							classify: 'Apartenențele au fost confirmate. Schimbarea numelui nu le va modifica.',
							profile: 'Datele membrului au fost salvate.',
							note: 'Notița a fost adăugată.',
							unit: 'Unitatea sau grupa a fost adăugată.',
							archive: 'Unitatea sau grupa a fost arhivată. Istoricul este păstrat.',
							transfer: 'Repartizarea membrului a fost actualizată.',
							withdraw: 'Membrul a fost marcat ca retras din toate activitățile centrului.',
							reactivate: 'Membrul a fost reactivat. Responsabilitățile se acordă separat.',
							assignment: 'Responsabilitatea și drepturile de acces au fost salvate.',
							end: 'Responsabilitatea a fost încheiată.',
							progression: 'Setarea actualizării anuale a fost salvată.',
							retry: 'Verificarea cu Orgo a fost programată.',
							link: 'Identitatea Orgo a fost asociată membrului.'
						} as Record<string, string>
					)[action] ?? 'Modificarea a fost salvată.')
	};
}
