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
	if (action === 'classify') {
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
		if (action === 'profile') {
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
	};
	if (!response.ok)
		return fail(response.status, {
			section: action,
			message: result.message ?? 'Modificarea nu a putut fi salvată.'
		});
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
