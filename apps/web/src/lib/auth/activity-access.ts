import type { CurrentUser } from './types';
export const managesActivity = (
	activity: { coordinatorId: number; administratorIds?: number[] },
	user: CurrentUser
) =>
	activity.coordinatorId === user.id ||
	(activity.administratorIds ?? []).includes(user.id) ||
	user.roles.includes('super_admin');
