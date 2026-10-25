import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { documentHeaders } from '$lib/server/adult-documents';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import type { DocumentWorkspace } from '$lib/adult-documents/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals, url, depends }) => {
	depends('app:adult-documents');
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!locals.user || !token) error(401, 'Autentificarea este necesară.');
	const params = new URLSearchParams({ pageSize: '0' });
	if (url.searchParams.has('year')) params.set('year', url.searchParams.get('year')!);
	let response: Response;
	try {
		response = await apiFetch(`/api/adult-documents?${params}`, {
			headers: documentHeaders(token)
		});
	} catch {
		error(503, 'Documentele nu sunt disponibile momentan.');
	}
	if (!response.ok) {
		if (response.status === 403)
			error(403, 'Doar administratorii centrali au acces la documentele adulților.');
		const body = await response.json().catch(() => ({}));
		error(
			response.status,
			typeof body.message === 'string' ? body.message : 'Documentele nu au putut fi încărcate.'
		);
	}
	return { workspace: (await response.json()) as DocumentWorkspace };
};
