import { resolve } from '$app/paths';
import { hasRole } from '$lib/auth/roles';
import type { AppHref, CurrentUser, MenuItem } from '$lib/auth/types';
import type { SidebarActivity, SidebarActivityDepartment } from '$lib/activities/sidebar-activity';

export const activitiesGroupKey = 'activities';

export const departmentLabels: Record<SidebarActivityDepartment, string> = {
	finance: 'Financiar',
	kitchen: 'Bucătărie',
	program: 'Program',
	logistics: 'Logistică'
};

const activityStatusLabels: Record<SidebarActivity['status'], string> = {
	planned: 'Planificată',
	active: 'În desfășurare',
	completed: 'Încheiată',
	cancelled: 'Anulată'
};

const activityTypeLabels: Record<SidebarActivity['type'], string> = {
	camp: 'Camp',
	hike: 'Drumeție',
	festival: 'Festival',
	training: 'Formare',
	meeting: 'Întâlnire',
	other: 'Alt tip'
};

export const canSee = (item: MenuItem, user: CurrentUser) =>
	!item.minRole || hasRole(user, item.minRole);

export const visibleChildren = (item: MenuItem, user: CurrentUser) =>
	item.children?.filter((child) => canSee(child, user)) ?? [];

export const menuHref = (href: AppHref) => {
	switch (href) {
		case '/':
			return resolve('/');
		case '/profile':
			return resolve('/profile');
		case '/admin':
			return resolve('/admin');
		case '/admin/users':
			return resolve('/admin/users');
		case '/admin/notifications':
			return resolve('/admin/notifications');
		case '/audit':
			return resolve('/audit');
		case '/activities':
			return resolve('/activities');
		case '/finance':
			return resolve('/finance');
		case '/finance/documents':
			return resolve('/finance/documents');
		case '/info/statut':
			return resolve('/info/statut');
		case '/programe/regulamente':
			return resolve('/programe/regulamente');
		case '/sediu/regulament':
			return resolve('/sediu/regulament');
	}
};

export const activityHref = (activityId: number) => resolve(`/activities/${activityId}`);
export const financeHref = (activityId: number) => resolve(`/activities/${activityId}/finance`);
export const kitchenHref = (activityId: number) => resolve(`/activities/${activityId}/kitchen`);
export const auditHref = (activityId: number) => resolve(`/activities/${activityId}/audit`);
export const settingsHref = (activityId: number) => resolve(`/activities/${activityId}/settings`);

export const isPathActive = (href: string, pathname: string) =>
	href === '/' ? pathname === '/' : pathname.startsWith(href);

export const groupHasActiveChild = (item: MenuItem, user: CurrentUser, pathname: string) =>
	visibleChildren(item, user).some(
		(child) => child.href && isPathActive(menuHref(child.href), pathname)
	);

export const parseCurrentActivityId = (pathname: string) => {
	const [, section, activityId] = pathname.split('/');
	if (section !== 'activities') {
		return undefined;
	}

	const numericId = Number(activityId);
	return Number.isInteger(numericId) && numericId > 0 ? numericId : undefined;
};

export const hasDepartment = (activity: SidebarActivity, department: SidebarActivityDepartment) =>
	activity.departments.includes(department);

export const canViewActivityAudit = (activity: SidebarActivity, user: CurrentUser) =>
	activity.coordinatorId === user.id ||
	hasRole(user, 'finance_manager') ||
	hasRole(user, 'super_admin');

export const canManageActivity = (activity: SidebarActivity, user: CurrentUser) =>
	activity.coordinatorId === user.id || hasRole(user, 'super_admin');

const formatDate = (value?: string) =>
	value
		? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value))
		: undefined;

const kitchenSectionLabel = (pathname: string) => {
	if (pathname.includes('/kitchen/meals')) return 'Mese';
	if (pathname.includes('/kitchen/ingredients')) return 'Ingrediente';
	if (pathname.includes('/kitchen/recipes')) return 'Rețete';
	if (pathname.includes('/kitchen/procurement')) return 'Aprovizionare';
	if (pathname.includes('/kitchen/reports')) return 'Rapoarte';
	return 'Bucătărie';
};

export const activitySubtitle = (activity: SidebarActivity, pathname: string) => {
	const section = pathname.includes('/finance')
		? 'Financiar'
		: pathname.includes('/kitchen')
			? kitchenSectionLabel(pathname)
			: pathname.includes('/audit')
				? 'Audit'
				: pathname.includes('/settings')
					? 'Setări'
					: 'Prezentare';
	const details = [
		section,
		activityTypeLabels[activity.type],
		activityStatusLabels[activity.status],
		formatDate(activity.startDate),
		activity.location
	].filter(Boolean);

	return details.join(' · ');
};

export const routeTitle = (pathname: string) => {
	if (pathname === '/') return 'Dashboard';
	if (pathname === '/activities') return 'Activități';
	if (pathname.startsWith('/finance/documents')) return 'Documente financiare';
	if (pathname === '/finance') return 'Panou financiar';
	if (pathname.startsWith('/audit')) return 'Audit';
	if (pathname.startsWith('/admin/notifications')) return 'Notificări';
	if (pathname.startsWith('/admin/users')) return 'Utilizatori';
	if (pathname.startsWith('/admin')) return 'Administrare';
	if (pathname.startsWith('/profile')) return 'Profil';
	if (pathname.startsWith('/info/statut')) return 'Statut ONCR';
	if (pathname.startsWith('/programe/regulamente')) return 'Regulament ONCR';
	if (pathname.startsWith('/sediu/regulament')) return 'Regulament sediu';
	return 'Resurse';
};
