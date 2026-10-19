import type { PageServerLoad, Actions } from './$types';
import type { Registry, Detail } from '$lib/members/types';
import { memberRead, memberAction } from '$lib/server/members';
export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const [registry, detail] = await Promise.all([
		memberRead<Registry>(event, ''),
		memberRead<Detail>(event, `/${encodeURIComponent(event.params.memberId)}`)
	]);
	return { registry, detail };
};
export const actions: Actions = { default: memberAction };
