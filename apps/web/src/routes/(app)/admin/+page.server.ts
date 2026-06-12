import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { hasRole } from '$lib/auth/roles';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user || !hasRole(locals.user, 'moderator')) {
		error(403, 'Nu ai acces la aceasta pagina.');
	}
};
