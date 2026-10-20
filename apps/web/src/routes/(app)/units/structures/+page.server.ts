import { memberRead, memberAction } from '$lib/server/members';
import type { StructurePreview, Registry } from '$lib/members/types';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async (event) => ({
	preview: await memberRead<StructurePreview>(event, '/structures/preview'),
	registry: await memberRead<Registry>(event, '')
});
export const actions: Actions = { default: memberAction };
