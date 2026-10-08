import { resolve } from '$app/paths';
import { hasRole } from '$lib/auth/roles';
import type { AppHref, CurrentUser, MenuItem } from '$lib/auth/types';
import type { SidebarActivity, SidebarActivityDepartment } from '$lib/activities/sidebar-activity';

export const activitiesGroupKey = 'activities';

export const departmentLabels: Record<SidebarActivityDepartment, string> = {
	finance: 'Financiar',
	kitchen: 'Bucătărie',
	program: 'Program',
	logistics: 'Logistică',
	administrative: 'Administrativ'
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
	(!item.minRole || hasRole(user, item.minRole)) &&
	(!item.anyRole || item.anyRole.some((role) => hasRole(user, role)));

export const visibleChildren = (item: MenuItem, user: CurrentUser) =>
	item.children?.filter((child) => canSee(child, user)) ?? [];

export const menuHref = (href: AppHref) => {
	switch (href) {
		case '/cotizatie':
			return resolve('/cotizatie');
		case '/membership':
			return resolve('/membership');
		case '/':
			return resolve('/');
		case '/profile':
			return resolve('/profile');
		case '/admin':
			return resolve('/admin');
		case '/admin/finance':
			return resolve('/admin/finance');
		case '/admin/finance/membership':
			return resolve('/admin/finance/membership');
		case '/admin/finance/receipts':
			return resolve('/admin/finance/receipts');
		case '/admin/finance/payments':
			return resolve('/admin/finance/payments');
		case '/admin/finance/transfers':
			return resolve('/admin/finance/transfers');
		case '/admin/finance/membership-settings':
			return resolve('/admin/finance/membership-settings');
		case '/admin/finance/payment-processor':
			return resolve('/admin/finance/payment-processor');
		case '/admin/finance/guide':
			return resolve('/admin/finance/guide');
		case '/admin/users':
			return resolve('/admin/users');
		case '/admin/notifications':
			return resolve('/admin/notifications');
		case '/admin/parental-consent':
			return resolve('/admin/parental-consent');
		case '/audit':
			return resolve('/audit');
		case '/activities':
			return resolve('/activities');
		case '/finance':
			return resolve('/finance');
		case '/finance/documents':
			return resolve('/finance/documents');
		case '/info/calendar':
			return resolve('/info/calendar');
		case '/info/statut':
			return resolve('/info/statut');
		case '/programe/regulamente':
			return resolve('/programe/regulamente');
		case '/sediu/inventar':
			return resolve('/sediu/inventar');
		case '/sediu/regulament':
			return resolve('/sediu/regulament');
		case '/sediu/orar':
			return resolve('/sediu/orar');
	}
};

export const activityHref = (activityId: number) => resolve(`/activities/${activityId}`);
export const financeHref = (activityId: number) => resolve(`/activities/${activityId}/finance`);
export const kitchenHref = (activityId: number) => resolve(`/activities/${activityId}/kitchen`);
export const parentalConsentHref = (activityId: number) =>
	resolve(`/activities/${activityId}/parental-consent`);
export const auditHref = (activityId: number) => resolve(`/activities/${activityId}/audit`);
export const settingsHref = (activityId: number) => resolve(`/activities/${activityId}/settings`);

export const isPathActive = (href: string, pathname: string) =>
	href === '/' || href === menuHref('/admin')
		? pathname === href
		: pathname === href || pathname.startsWith(`${href}/`);

export const groupHasActiveChild = (item: MenuItem, user: CurrentUser, pathname: string): boolean =>
	visibleChildren(item, user).some(
		(child) =>
			Boolean(child.href && isPathActive(menuHref(child.href), pathname)) ||
			Boolean(child.children && groupHasActiveChild(child, user, pathname))
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
			: pathname.includes('/parental-consent')
				? 'Acord parental'
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
	if (pathname.startsWith('/cotizatie')) return 'Cotizație';
	if (pathname === '/activities') return 'Activități';
	if (pathname.startsWith('/finance/documents')) return 'Documente financiare';
	if (pathname === '/finance') return 'Panou financiar';
	if (pathname.startsWith('/audit')) return 'Audit';
	if (pathname.startsWith('/admin/notifications')) return 'Notificări';
	if (pathname.startsWith('/admin/parental-consent')) return 'Acorduri parentale';
	if (pathname.startsWith('/admin/users')) return 'Utilizatori';
	if (pathname.startsWith('/admin/finance/payment-processor')) return 'Procesatori de plăți';
	if (pathname.startsWith('/admin/finance/guide')) return 'Ghid financiar';
	if (pathname.startsWith('/admin/finance/membership-settings')) return 'Configurare cotizații';
	if (pathname.startsWith('/admin/finance/receipts')) return 'Încasări și alocări';
	if (pathname.startsWith('/admin/finance/payments')) return 'Plăți în curs';
	if (pathname.startsWith('/admin/finance/transfers')) return 'Transferuri naționale';
	if (pathname.startsWith('/admin/finance/membership')) return 'Membri și cotizații';
	if (pathname.startsWith('/admin/finance')) return 'Administrare financiară';
	if (pathname.startsWith('/admin')) return 'Administrare';
	if (pathname.startsWith('/profile')) return 'Profil';
	if (pathname.startsWith('/info/calendar')) return 'Calendar Eventos';
	if (pathname.startsWith('/info/statut')) return 'Statut ONCR';
	if (pathname.startsWith('/programe/regulamente')) return 'Regulament ONCR';
	if (pathname.startsWith('/sediu/inventar')) return 'Inventar sediu';
	if (pathname.startsWith('/sediu/regulament')) return 'Regulament sediu';
	if (pathname.startsWith('/sediu/orar')) return 'Calendar sediu';
	if (pathname.startsWith('/user/docs')) return 'Documentație aplicație';
	if (pathname.startsWith('/user/feedback')) return 'Feedback';
	return 'Resurse';
};
