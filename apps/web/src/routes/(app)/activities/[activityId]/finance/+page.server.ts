import { Buffer } from 'node:buffer';
import { error, fail } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { Cookies } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type FinancialDocumentStatus =
	| 'uploaded'
	| 'in_review'
	| 'ready_to_send'
	| 'sent'
	| 'send_failed'
	| 'needs_clarification'
	| 'rejected'
	| 'archived';

export type FinancialDocument = {
	id: number;
	uploaderId: number;
	uploaderName: string;
	status: FinancialDocumentStatus;
	originalFilename: string;
	contentType: string;
	fileSize: number;
	checksumSha256: string;
	activityId?: number;
	activityTitle?: string;
	notes?: string;
	reviewerNotes?: string;
	keezExternalId?: string;
	keezSubmittedAt?: string;
	lastHandoffError?: string;
	createdAt: string;
	updatedAt: string;
};

export type FinanceHandoffGuidance = {
	keezHandoffMode: 'review_first' | 'direct_to_keez';
};

export type FinanceSettings = {
	keezHandoffMode: 'review_first' | 'direct_to_keez';
	keezConfigured: boolean;
	keezEnvironment: string;
	keezDocumentUploadAvailable: boolean;
	keezEmailHandoffAvailable: boolean;
	keezEmailSender?: string;
	keezEmailRecipient?: string;
};

const getSessionToken = (cookies: Cookies) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	return sessionToken;
};

const authHeaders = (sessionToken: string) => ({
	cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
});

const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) {
			return body.message.join(' ');
		}

		return body.message ?? 'Operațiunea nu a reușit.';
	} catch {
		return 'Operațiunea nu a reușit.';
	}
};

const parseActivityId = (value: string | undefined) => {
	const activityId = Number(value);
	if (!Number.isInteger(activityId) || activityId <= 0) {
		error(400, 'Activitatea nu este validă.');
	}

	return activityId;
};

const inferContentType = (file: File) => {
	if (file.type) {
		return file.type;
	}

	const extension = file.name.split('.').pop()?.toLowerCase();
	switch (extension) {
		case 'pdf':
			return 'application/pdf';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'heic':
			return 'image/heic';
		case 'heif':
			return 'image/heif';
		default:
			return 'application/octet-stream';
	}
};

export const load: PageServerLoad = async ({ cookies, locals, params }) => {
	const sessionToken = getSessionToken(cookies);
	const activityId = parseActivityId(params.activityId);
	const headers = authHeaders(sessionToken);
	const isFinanceManager = hasRole(locals.user, 'finance_manager');
	const [response, handoffGuidanceResponse] = await Promise.all([
		apiFetch(`/api/finance/documents?activityId=${activityId}`, { headers }),
		apiFetch('/api/finance/documents/handoff-guidance', { headers })
	]);

	if (!response.ok) {
		error(response.status, await readApiMessage(response));
	}
	if (!handoffGuidanceResponse.ok) {
		error(handoffGuidanceResponse.status, await readApiMessage(handoffGuidanceResponse));
	}

	let settings: FinanceSettings | null = null;
	if (isFinanceManager) {
		const settingsResponse = await apiFetch('/api/finance/settings', { headers });
		if (!settingsResponse.ok) {
			error(settingsResponse.status, await readApiMessage(settingsResponse));
		}
		settings = (await settingsResponse.json()) as FinanceSettings;
	}

	return {
		documents: (await response.json()) as FinancialDocument[],
		handoffGuidance: (await handoffGuidanceResponse.json()) as FinanceHandoffGuidance,
		isFinanceManager,
		settings
	};
};

export const actions: Actions = {
	upload: async ({ request, cookies, params }) => {
		const activityId = parseActivityId(params.activityId);
		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Alege un document financiar.' });
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			return fail(400, { message: 'Fișierul este prea mare. Limita actuală este 15 MB.' });
		}

		const sessionToken = getSessionToken(cookies);
		const content = Buffer.from(await file.arrayBuffer()).toString('base64');
		const response = await apiFetch('/api/finance/documents', {
			method: 'POST',
			headers: {
				...authHeaders(sessionToken),
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				fileName: file.name,
				contentType: inferContentType(file),
				contentBase64: content,
				activityId,
				notes: formData.get('notes')?.toString()
			})
		});

		if (!response.ok) {
			return fail(response.status, { message: await readApiMessage(response) });
		}

		return { message: 'Documentul a fost încărcat.' };
	},
	updateStatus: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'finance_manager')) {
			return fail(403, { message: 'Nu ai acces la această acțiune.' });
		}

		const formData = await request.formData();
		const documentId = Number(formData.get('documentId'));
		const status = formData.get('status')?.toString();

		if (!Number.isInteger(documentId) || !status) {
			return fail(400, { message: 'Datele documentului nu sunt valide.' });
		}

		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch(`/api/finance/documents/${documentId}/status`, {
			method: 'PATCH',
			headers: {
				...authHeaders(sessionToken),
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				status,
				reviewerNotes: formData.get('reviewerNotes')?.toString()
			})
		});

		if (!response.ok) {
			return fail(response.status, { message: await readApiMessage(response) });
		}

		return { message: 'Starea documentului a fost actualizată.' };
	},
	sendDocument: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'finance_manager')) {
			return fail(403, { message: 'Nu ai acces la această acțiune.' });
		}

		const formData = await request.formData();
		const documentId = Number(formData.get('documentId'));
		const action = formData.get('handoffAction')?.toString();
		const actionPath = action === 'retry' ? 'retry-send' : action === 'resend' ? 'resend' : 'send';

		if (!Number.isInteger(documentId) || documentId <= 0) {
			return fail(400, { message: 'Documentul nu este valid.' });
		}

		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch(`/api/finance/documents/${documentId}/${actionPath}`, {
			method: 'POST',
			headers: authHeaders(sessionToken)
		});

		if (!response.ok) {
			return fail(response.status, { message: await readApiMessage(response) });
		}

		return {
			message: 'Trimiterea către contabilitate a fost procesată.',
			document: (await response.json()) as FinancialDocument
		};
	},
	deleteDocument: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'finance_manager')) {
			return fail(403, { message: 'Nu ai acces la această acțiune.' });
		}

		const formData = await request.formData();
		const documentId = Number(formData.get('documentId'));
		if (!Number.isInteger(documentId) || documentId <= 0) {
			return fail(400, { message: 'Documentul nu este valid.' });
		}

		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch(`/api/finance/documents/${documentId}`, {
			method: 'DELETE',
			headers: authHeaders(sessionToken)
		});

		if (!response.ok) {
			return fail(response.status, { message: await readApiMessage(response) });
		}

		return { message: 'Documentul a fost șters.' };
	},
	updateSettings: async ({ request, cookies, locals }) => {
		if (!hasRole(locals.user, 'finance_manager')) {
			return fail(403, { message: 'Nu ai acces la setările financiare.' });
		}

		const formData = await request.formData();
		const keezHandoffMode = formData.get('keezHandoffMode')?.toString();
		const sessionToken = getSessionToken(cookies);
		const response = await apiFetch('/api/finance/settings', {
			method: 'PATCH',
			headers: {
				...authHeaders(sessionToken),
				'content-type': 'application/json'
			},
			body: JSON.stringify({ keezHandoffMode })
		});

		if (!response.ok) {
			return fail(response.status, { message: await readApiMessage(response) });
		}

		return { message: 'Setările financiare au fost actualizate.' };
	}
};
