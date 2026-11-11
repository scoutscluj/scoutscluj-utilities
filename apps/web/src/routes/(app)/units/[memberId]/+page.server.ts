import type { PageServerLoad, Actions } from './$types';
import type { Registry, Detail } from '$lib/members/types';
import { memberRead, memberAction, refreshMemberNational } from '$lib/server/members';
export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const nationalMessage = await refreshMemberNational(event, event.params.memberId);
	const [registry, detail] = await Promise.all([
		memberRead<Registry>(event, ''),
		memberRead<Detail>(event, `/${encodeURIComponent(event.params.memberId)}`)
	]);
	return { registry, detail, nationalMessage };
};
export const actions: Actions = { default: memberAction };
