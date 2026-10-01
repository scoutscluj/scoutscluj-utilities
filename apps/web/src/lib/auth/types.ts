export type UserRole = 'moderator' | 'admin' | 'finance_manager' | 'super_admin';
export type AppHref =
	| '/cotizatie'
	| '/membership'
	| '/'
	| '/profile'
	| '/admin'
	| '/admin/finance'
	| '/admin/finance/membership'
	| '/admin/finance/receipts'
	| '/admin/finance/transfers'
	| '/admin/finance/membership-settings'
	| '/admin/finance/payment-processor'
	| '/admin/finance/guide'
	| '/admin/users'
	| '/admin/notifications'
	| '/admin/parental-consent'
	| '/audit'
	| '/activities'
	| '/finance'
	| '/finance/documents'
	| '/info/statut'
	| '/programe/regulamente'
	| '/sediu/inventar'
	| '/sediu/regulament'
	| '/sediu/orar';

export type CurrentUser = {
	id: number;
	email?: string;
	displayName: string;
	firstName?: string;
	lastName?: string;
	avatarUrl?: string;
	roles: UserRole[];
	orgoConnection?: {
		orgoUserId?: number;
		cardId?: string;
		email?: string;
		connectedAt?: string;
		lastLoginAt?: string;
	};
};

export type MenuItem = {
	label: string;
	href?: AppHref;
	minRole?: UserRole;
	anyRole?: UserRole[];
	disabled?: boolean;
	children?: MenuItem[];
};
