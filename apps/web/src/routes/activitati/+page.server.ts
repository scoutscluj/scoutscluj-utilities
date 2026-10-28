import { apiFetch } from '$lib/server/api';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const response = await apiFetch('/api/activity-registrations');
	if (!response.ok) error(response.status, 'Activitățile nu sunt disponibile.');
	return {
		activities: (await response.json()) as {
			id: number;
			coverImageUrl?: string;
			title: string;
			description?: string;
			location?: string;
			startDate?: string;
		}[]
	};
};
