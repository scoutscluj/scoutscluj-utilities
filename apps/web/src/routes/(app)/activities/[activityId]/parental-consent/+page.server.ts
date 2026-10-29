import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ params }) =>
	redirect(303, resolve(`/activities/${params.activityId}/registrations`));
