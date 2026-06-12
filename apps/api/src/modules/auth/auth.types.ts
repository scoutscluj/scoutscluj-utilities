import { CurrentUser } from '../users/users.types';
import type { Request } from 'express';

export type AuthenticatedUser = CurrentUser;

export type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};
