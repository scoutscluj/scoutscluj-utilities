import type { CurrentUser } from '$lib/auth/types';
import type { AuditEntry } from '$lib/audit/audit-entry';
import type { Cookies } from '@sveltejs/kit';
import type { Activity } from './+layout.server';
import type { PageServerLoad } from './$types';
import { apiJson, type KitchenOverview } from './kitchen/kitchen-api';

const canViewKitchenOverview = (activity: Activity, user: CurrentUser) =>
	activity.coordinatorId === user.id ||
	user.roles.includes('finance_manager') ||
	user.roles.includes('super_admin');

const canViewActivityAudit = (activity: Activity, user: CurrentUser) =>
	activity.coordinatorId === user.id ||
	user.roles.includes('finance_manager') ||
	user.roles.includes('super_admin');

const optionalApiJson = async <T>(cookies: Cookies, path: string) => {
	try {
		return await apiJson<T>(cookies, path);
	} catch {
		return undefined;
	}
};

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { activity, user } = await parent();
	const shouldLoadKitchen =
		activity.departments.includes('kitchen') && canViewKitchenOverview(activity, user);
	const shouldLoadAudit = canViewActivityAudit(activity, user);
	const [kitchenOverview, auditEntries] = await Promise.all([
		shouldLoadKitchen
			? optionalApiJson<KitchenOverview>(cookies, `/api/activities/${activity.id}/kitchen`)
			: undefined,
		shouldLoadAudit
			? optionalApiJson<AuditEntry[]>(cookies, `/api/audit/activities/${activity.id}`)
			: []
	]);

	return {
		kitchenOverview,
		auditEntries: auditEntries?.slice(0, 5) ?? []
	};
};
