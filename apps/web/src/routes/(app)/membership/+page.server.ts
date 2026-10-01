import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	redirect(308, `/admin/finance/membership${url.search}`);
};

export const actions: Actions = {
	default: ({ url }) => redirect(307, `/admin/finance/membership${url.search}`)
};
