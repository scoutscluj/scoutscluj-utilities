import { error, fail } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user || !hasRole(locals.user, 'admin'))
		error(403, 'Nu ai acces la administrarea acordurilor parentale.');
	return {};
};
const paused = () =>
	fail(423, {
		message:
			'Editorul de șabloane este suspendat temporar. Completează acordul în setările înscrierii activității.'
	});
export const actions: Actions = {
	createTemplate: paused,
	updateOrganization: paused,
	uploadAsset: paused,
	deleteAsset: paused
};
