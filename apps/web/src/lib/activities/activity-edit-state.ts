export const activityEditContext = Symbol('activity-edit-state');
export type ActivityEditState = { dirty: boolean; publicationRevision?: number };
