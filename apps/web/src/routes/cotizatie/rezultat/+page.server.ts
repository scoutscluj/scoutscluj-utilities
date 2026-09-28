import { apiFetch } from '$lib/server/api';
import type { PaymentStatus } from '$lib/membership/types';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	const token = cookies.get('membership_attempt');
	if (!token) return { status: null };
	const response = await apiFetch(`/api/membership/status/${encodeURIComponent(token)}`);
	return { status: response.ok ? ((await response.json()) as PaymentStatus) : null };
};
