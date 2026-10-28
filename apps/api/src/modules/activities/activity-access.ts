export const isActivityAdministrator = (
  activity: { coordinatorId: number; administratorIds?: number[] },
  userId: number,
) =>
  activity.coordinatorId === userId ||
  (activity.administratorIds ?? []).includes(userId);
