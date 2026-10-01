import { error } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!hasRole(locals.user, 'admin') && !hasRole(locals.user, 'finance_manager')) {
		error(403, 'Nu ai acces la administrarea financiară.');
	}
};
