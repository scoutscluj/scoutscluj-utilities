import { redirect } from '@sveltejs/kit';
import { memberAction } from '$lib/server/members';
export const load = () => redirect(303, '/units');
export const actions = { default: memberAction };
