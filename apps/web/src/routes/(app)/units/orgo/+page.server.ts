import type { PageServerLoad, Actions } from './$types';
import { loadMemberOrgo } from '$lib/server/member-administration';
import { memberAction } from '$lib/server/members';
export const load: PageServerLoad = loadMemberOrgo;
export const actions: Actions = { default: memberAction };
