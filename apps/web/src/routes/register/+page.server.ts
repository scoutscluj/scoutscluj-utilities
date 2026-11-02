import type { PageServerLoad, Actions } from './$types';
import { randomUUID } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import { submitApplication } from '$lib/server/admissions';
import type { AdmissionUnit } from '$lib/members/admissions';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const response = await apiFetch('/api/member-applications/options');
	if (!response.ok) error(503, 'Înscrierile nu sunt disponibile momentan. Reîncearcă mai târziu.');
	const options = (await response.json()) as { units: AdmissionUnit[] };
	return { units: options.units, requestKey: randomUUID() };
};
export const actions: Actions = { default: (event) => submitApplication(event) };
