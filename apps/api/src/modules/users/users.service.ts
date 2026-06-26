import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminUserDto } from './dto/admin-user.dto';
import { OrgoConnection } from './entities/orgo-connection.entity';
import { UserRole } from './entities/user-role.enum';
import { User } from './entities/user.entity';
import { OrgoProfile, CurrentUser } from './users.types';

const ROLE_ORDER = [
  UserRole.Moderator,
  UserRole.Admin,
  UserRole.FinanceManager,
  UserRole.SuperAdmin,
];

const normalizeEmail = (email?: string) => {
  const value = email?.trim().toLowerCase();
  return value || undefined;
};

const cleanString = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const getDisplayName = (profile: OrgoProfile) => {
  const firstName = cleanString(profile.firstName);
  const lastName = cleanString(profile.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return (
    fullName || normalizeEmail(profile.email) || cleanString(profile.cardId)
  );
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: EntityRepository<User>,
    @InjectRepository(OrgoConnection)
    private readonly orgoConnectionsRepository: EntityRepository<OrgoConnection>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async findById(id: number) {
    return this.usersRepository.findOne(
      { id },
      { populate: ['orgoConnection'] },
    );
  }

  async listAdminUsers(): Promise<AdminUserDto[]> {
    const users = await this.usersRepository.find(
      {},
      {
        populate: ['orgoConnection'],
        orderBy: { displayName: 'asc', id: 'asc' },
      },
    );

    return users.map((user) => this.serializeAdminUser(user));
  }

  async updateRoles(userId: number, roles: unknown): Promise<AdminUserDto> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.roles = this.normalizeRoles(roles);
    await this.em.flush();

    return this.serializeAdminUser(user);
  }

  async resolveOrCreateFromOrgoProfile(profile: OrgoProfile) {
    const matches = new Map<number, User>();
    const orgoUserId = profile.id;
    const cardId = cleanString(profile.cardId);
    const email = normalizeEmail(profile.email);

    if (!orgoUserId && !cardId && !email) {
      throw new UnauthorizedException(
        'Orgo profile does not include a stable identity.',
      );
    }

    if (orgoUserId) {
      const connection = await this.orgoConnectionsRepository.findOne(
        { orgoUserId },
        { populate: ['user', 'user.orgoConnection'] },
      );
      if (connection) {
        matches.set(connection.user.id, connection.user);
      }
    }

    if (cardId) {
      const connection = await this.orgoConnectionsRepository.findOne(
        { cardId },
        { populate: ['user', 'user.orgoConnection'] },
      );
      if (connection) {
        matches.set(connection.user.id, connection.user);
      }
    }

    if (email) {
      const user = await this.usersRepository.findOne(
        { email },
        { populate: ['orgoConnection'] },
      );
      if (user) {
        matches.set(user.id, user);
      }

      const connection = await this.orgoConnectionsRepository.findOne(
        { email },
        { populate: ['user', 'user.orgoConnection'] },
      );
      if (connection) {
        matches.set(connection.user.id, connection.user);
      }
    }

    if (matches.size > 1) {
      throw new UnauthorizedException(
        'Multiple local users match this Orgo account.',
      );
    }

    const matchedUser = matches.values().next().value as User | undefined;
    if (matchedUser) {
      this.updateUserFromLogin(matchedUser, profile);
      await this.upsertOrgoConnection(matchedUser, profile);
      await this.em.flush();
      return { user: matchedUser, wasCreated: false };
    }

    const createdUser = this.createUserFromOrgoProfile(profile);
    await this.upsertOrgoConnection(createdUser, profile);
    await this.em.flush();

    return { user: createdUser, wasCreated: true };
  }

  serialize(user: User): CurrentUser {
    const connection = user.orgoConnection;

    return {
      id: user.id,
      email: user.email ?? undefined,
      displayName: user.displayName,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      roles: user.roles,
      orgoConnection: connection
        ? {
            orgoUserId: connection.orgoUserId ?? undefined,
            cardId: connection.cardId ?? undefined,
            email: connection.email ?? undefined,
            connectedAt: connection.connectedAt?.toISOString(),
            lastLoginAt: connection.lastLoginAt?.toISOString(),
          }
        : undefined,
    };
  }

  serializeAdminUser(user: User): AdminUserDto {
    const connection = user.orgoConnection;

    return {
      id: user.id,
      email: user.email ?? undefined,
      displayName: user.displayName,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      roles: this.normalizeRoles(user.roles),
      orgoConnection: connection
        ? {
            orgoUserId: connection.orgoUserId ?? undefined,
            cardId: connection.cardId ?? undefined,
            email: connection.email ?? undefined,
            connectedAt: connection.connectedAt?.toISOString(),
            lastLoginAt: connection.lastLoginAt?.toISOString(),
          }
        : undefined,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private normalizeRoles(roles: unknown): UserRole[] {
    if (!Array.isArray(roles)) {
      throw new BadRequestException('Roles must be an array.');
    }

    const requestedRoles = new Set<UserRole>();
    for (const role of roles) {
      if (!ROLE_ORDER.includes(role as UserRole)) {
        throw new BadRequestException(`Unsupported role: ${String(role)}.`);
      }

      requestedRoles.add(role as UserRole);
    }

    return ROLE_ORDER.filter((role) => requestedRoles.has(role));
  }

  private createUserFromOrgoProfile(profile: OrgoProfile) {
    const displayName = getDisplayName(profile);

    if (!displayName) {
      throw new UnauthorizedException(
        'Orgo profile does not include enough user details.',
      );
    }

    const user = this.usersRepository.create({
      email: normalizeEmail(profile.email),
      displayName,
      firstName: cleanString(profile.firstName),
      lastName: cleanString(profile.lastName),
      avatarUrl: cleanString(profile.profileImage),
      roles: [],
      lastLoginAt: new Date(),
    });

    this.em.persist(user);
    return user;
  }

  private updateUserFromLogin(user: User, profile: OrgoProfile) {
    const displayName = getDisplayName(profile);

    user.email = normalizeEmail(profile.email) ?? user.email;
    user.displayName = displayName ?? user.displayName;
    user.firstName = cleanString(profile.firstName) ?? user.firstName;
    user.lastName = cleanString(profile.lastName) ?? user.lastName;
    user.avatarUrl = cleanString(profile.profileImage) ?? user.avatarUrl;
    user.lastLoginAt = new Date();
  }

  private async upsertOrgoConnection(user: User, profile: OrgoProfile) {
    const existing =
      user.orgoConnection ??
      (await this.orgoConnectionsRepository.findOne({ user }));
    const profileSnapshot = profile as Record<string, unknown>;

    if (existing) {
      existing.orgoUserId = profile.id ?? existing.orgoUserId;
      existing.cardId = cleanString(profile.cardId) ?? existing.cardId;
      existing.email = normalizeEmail(profile.email) ?? existing.email;
      existing.profile = profileSnapshot;
      existing.lastLoginAt = new Date();
      user.orgoConnection = existing;
      return existing;
    }

    const connection = this.orgoConnectionsRepository.create({
      user,
      orgoUserId: profile.id,
      cardId: cleanString(profile.cardId),
      email: normalizeEmail(profile.email),
      profile: profileSnapshot,
      connectedAt: new Date(),
      lastLoginAt: new Date(),
    });

    this.em.persist(connection);
    user.orgoConnection = connection;
    return connection;
  }
}
