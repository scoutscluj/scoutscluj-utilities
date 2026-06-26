import { error } from '@sveltejs/kit';
import { hasRole } from '$lib/auth/roles';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';
import { apiFetch } from '$lib/server/api';
import type { PageServerLoad } from './$types';

type FinanceSummary = {
	totalDocuments: number;
	generalDocuments: number;
	activityDocuments: number;
	openDocuments: number;
	needsClarification: number;
	sentDocuments: number;
};

type FinanceSettings = {
	keezHandoffMode: 'review_first' | 'direct_to_keez';
	keezConfigured: boolean;
	keezEnvironment: string;
	keezDocumentUploadAvailable: boolean;
};

const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) {
			return body.message.join(' ');
		}

		return body.message ?? 'Statisticile financiare nu au putut fi încărcate.';
	} catch {
		return 'Statisticile financiare nu au putut fi încărcate.';
	}
};

export const load: PageServerLoad = async ({ cookies, locals }) => {
	if (!hasRole(locals.user, 'finance_manager')) {
		error(403, 'Nu ai acces la panoul financiar.');
	}

	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	if (!sessionToken) {
		error(401, 'Autentificarea este necesară.');
	}

	const headers = {
		cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
	};
	const [summaryResponse, settingsResponse] = await Promise.all([
		apiFetch('/api/finance/summary', { headers }),
		apiFetch('/api/finance/settings', { headers })
	]);

	if (!summaryResponse.ok) {
		error(summaryResponse.status, await readApiMessage(summaryResponse));
	}

	if (!settingsResponse.ok) {
		error(settingsResponse.status, await readApiMessage(settingsResponse));
	}

	return {
		summary: (await summaryResponse.json()) as FinanceSummary,
		settings: (await settingsResponse.json()) as FinanceSettings
	};
};
