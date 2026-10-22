import type { PageServerLoad, Actions } from './$types';
import { loadMemberStructures } from '$lib/server/member-administration';
import { memberAction } from '$lib/server/members';
export const load: PageServerLoad = loadMemberStructures;
export const actions: Actions = { default: memberAction };
