export type SidebarActivityStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type SidebarActivityType = 'camp' | 'hike' | 'festival' | 'training' | 'meeting' | 'other';
export type SidebarActivityDepartment = 'finance' | 'kitchen' | 'program' | 'logistics';

export type SidebarActivity = {
	id: number;
	title: string;
	type: SidebarActivityType;
	status: SidebarActivityStatus;
	departments: SidebarActivityDepartment[];
	coordinatorId: number;
	startDate?: string;
	endDate?: string;
	location?: string;
};

export const activityBelongsInSidebar = (activity: SidebarActivity, todayIso: string) =>
	(activity.status === 'active' || activity.status === 'planned') &&
	(!activity.endDate || activity.endDate >= todayIso);
