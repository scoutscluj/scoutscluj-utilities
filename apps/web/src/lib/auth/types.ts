export type UserRole = 'moderator' | 'admin' | 'super_admin';
export type AppHref = '/' | '/profile' | '/admin';

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
	disabled?: boolean;
	children?: MenuItem[];
};
