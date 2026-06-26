import { error } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!hasRole(locals.user, 'super_admin')) {
		error(403, 'Nu ai acces la administrarea notificărilor.');
	}
};
