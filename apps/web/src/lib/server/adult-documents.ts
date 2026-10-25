import { apiFetch } from './api';
import { SESSION_COOKIE_NAME } from './cookies';
import type { MineDocuments } from '$lib/adult-documents/types';

export const documentHeaders = (token: string) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`
});

export async function canManageAdultDocuments(token: string) {
	try {
		const response = await apiFetch('/api/adult-documents/access', {
			headers: documentHeaders(token)
		});
		return response.ok && (await response.json()).admin === true;
	} catch {
		return false;
	}
}

export async function loadOwnDocuments(token: string): Promise<MineDocuments | null> {
	try {
		const response = await apiFetch('/api/adult-documents/mine', {
			headers: documentHeaders(token)
		});
		return response.ok ? ((await response.json()) as MineDocuments) : null;
	} catch {
		return null;
	}
}
