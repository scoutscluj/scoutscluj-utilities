import { UserRole } from './entities/user-role.enum';

export type OrgoDateValue = {
  date?: string;
  timezone_type?: number;
  timezone?: string;
};

export type OrgoProfile = {
  id?: number;
  cardId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  feeValidUntilDate?: OrgoDateValue;
  town?: {
    id?: number;
    name?: string;
  };
  localCenter?: {
    id?: number;
    name?: string;
  };
  age?: number;
  dateOfBirth?: OrgoDateValue;
  dateJoined?: OrgoDateValue;
  dateJoinedFullMember?: OrgoDateValue;
  status?: string;
  isFulMember?: boolean;
  profileImage?: string;
};

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
