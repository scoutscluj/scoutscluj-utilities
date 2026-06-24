import type { CurrentUser, UserRole } from './types';

const impliedRoles: Record<UserRole, UserRole[]> = {
	moderator: ['moderator'],
	admin: ['admin', 'moderator'],
	finance_manager: ['finance_manager'],
	super_admin: ['super_admin', 'admin', 'moderator', 'finance_manager']
};

export const hasRole = (user: CurrentUser | null | undefined, role: UserRole) => {
	if (!user) {
		return false;
	}

	return user.roles.some((userRole) => impliedRoles[userRole]?.includes(role));
};

export const formatRole = (role: UserRole) => {
	switch (role) {
		case 'moderator':
			return 'Moderator';
		case 'admin':
			return 'Admin';
		case 'finance_manager':
			return 'Responsabil financiar';
		case 'super_admin':
			return 'Super admin';
	}
};
