import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Registry } from '$lib/members/types';
import { memberRead, memberAction } from '$lib/server/members';

export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const registry = await memberRead<Registry>(event, '');
	if (!registry.admin && !registry.canManage && !registry.chiefUnitIds.length)
		error(403, 'Nu ai acces la administrarea membrilor și unităților.');
	return { registry };
};
export const actions: Actions = { default: memberAction };
