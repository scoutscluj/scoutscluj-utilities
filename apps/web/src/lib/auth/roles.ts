import type { CurrentUser, UserRole } from './types';

const roleRank: Record<UserRole, number> = {
	moderator: 1,
	admin: 2,
	super_admin: 3
};

export const hasRole = (user: CurrentUser | null | undefined, role: UserRole) => {
	if (!user) {
		return false;
	}

	return user.roles.some((userRole) => roleRank[userRole] >= roleRank[role]);
};

export const formatRole = (role: UserRole) => {
	switch (role) {
		case 'moderator':
			return 'Moderator';
		case 'admin':
			return 'Admin';
		case 'super_admin':
			return 'Super admin';
	}
};
