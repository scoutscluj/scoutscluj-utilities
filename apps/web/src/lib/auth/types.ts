export type UserRole = 'moderator' | 'admin' | 'finance_manager' | 'super_admin';
export type AppHref =
	| '/units'
	| '/cotizatie'
	| '/activitati'
	| '/membership'
	| '/'
	| '/profile'
	| '/admin'
	| '/admin/members'
	| '/admin/adult-documents'
	| '/admin/finance'
	| '/admin/finance/membership'
	| '/admin/finance/receipts'
	| '/admin/finance/payments'
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
	| '/info/calendar'
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
	canManageAdultDocuments?: boolean;
	orgoConnection?: {
		orgoUserId?: number;
		cardId?: string;
		email?: string;
		connectedAt?: string;
		lastLoginAt?: string;
		profile?: {
			email?: string;
			status?: string;
			dateOfBirth?: string;
			dateJoined?: string;
			feeValidUntilDate?: string;
		};
	};
};

export type MenuItem = {
	label: string;
	href?: AppHref;
	minRole?: UserRole;
	anyRole?: UserRole[];
	requiresAdultDocumentsAdmin?: boolean;
	disabled?: boolean;
	children?: MenuItem[];
};
