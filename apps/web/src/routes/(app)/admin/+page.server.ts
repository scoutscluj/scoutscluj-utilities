import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { hasRole } from '$lib/auth/roles';

export const load: PageServerLoad = ({ locals }) => {
	if (
		!locals.user ||
		(!hasRole(locals.user, 'moderator') && !hasRole(locals.user, 'finance_manager'))
	) {
		error(403, 'Nu ai acces la aceasta pagina.');
	}

	return { user: locals.user };
};
