import type { PageServerLoad, Actions } from './$types';
import type { Registry } from '$lib/members/types';
import { memberRead, memberAction } from '$lib/server/members';
export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	return { registry: await memberRead<Registry>(event, '') };
};
export const actions: Actions = { default: memberAction };
