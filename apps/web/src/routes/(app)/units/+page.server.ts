import { apiFetch } from '$lib/server/api';
import { memberHeaders } from '$lib/server/members';
import type { PageServerLoad, Actions } from './$types';
import type { Registry } from '$lib/members/types';
import { memberRead, memberAction } from '$lib/server/members';
export const load: PageServerLoad = async (event) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const [registry, countResponse] = await Promise.all([
		memberRead<Registry>(event, ''),
		apiFetch('/api/member-applications/pending-count', { headers: memberHeaders(event) })
	]);
	const pendingApplications = countResponse.ok ? Number((await countResponse.json()).count) : 0;
	return { registry, pendingApplications };
};
export const actions: Actions = { default: memberAction };
