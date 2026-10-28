import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = ({ url }) => {
	if (url.pathname.includes('/templates/')) redirect(303, '/admin/parental-consent');
};
