import type { RequestEvent } from '@sveltejs/kit';
import type { Registry, StructurePreview } from '$lib/members/types';
import { memberRead } from '$lib/server/members';
import { memberHeaders } from '$lib/server/members';
import { apiFetch } from '$lib/server/api';
import { error } from '@sveltejs/kit';
export const loadMemberOrgo = async (event: RequestEvent) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	const response = await apiFetch('/api/members/orgo', { headers: memberHeaders(event) });
	if (response.status === 403) error(403, 'Acces rezervat administratorilor.');
	const result = (await response.json()) as {
		message?: string;
		version?: string;
		serverToken?: boolean;
		writesEnabled?: boolean;
		importedUnitIds?: number[];
		members?: {
			id: number;
			name: string;
			status: string;
			type?: string;
			roles?: { id: number; name: string; unitName: string | null }[];
		}[];
		inactiveMembers?: { id: number; name: string }[];
		units?: { id: number; name: string; parent: number | null; type: string | null }[];
	};
	return {
		preview: response.ok ? result : null,
		message: response.ok ? '' : (result.message ?? 'Orgo nu este disponibil.')
	};
};

export const loadMemberStructures = async (event: RequestEvent) => {
	event.setHeaders({ 'cache-control': 'private, no-store' });
	return {
		preview: await memberRead<StructurePreview>(event, '/structures/preview'),
		registry: await memberRead<Registry>(event, '')
	};
};
