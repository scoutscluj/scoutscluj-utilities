jest.mock('@mikro-orm/core', () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'array',
    'autoincrement',
    'default',
    'deleteRule',
    'fieldName',
    'inversedBy',
    'mappedBy',
    'nativeEnumName',
    'nullable',
    'onCreate',
    'onUpdate',
    'owner',
    'primary',
    'unique',
    'updateRule',
  ]) {
    chain[method] = jest.fn(() => chain);
  }

  const p = {
    boolean: jest.fn(() => chain),
    datetime: jest.fn(() => chain),
    enum: jest.fn(() => chain),
    integer: jest.fn(() => chain),
    json: jest.fn(() => chain),
    oneToOne: jest.fn(() => chain),
    string: jest.fn(() => chain),
    text: jest.fn(() => chain),
    type: jest.fn(() => chain),
  };

  return {
    defineEntity: <T>(entity: T): T => entity,
    p,
  };
});

jest.mock('@mikro-orm/nestjs', () => ({
  InjectRepository: jest.fn(() => () => undefined),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';

type TestUser = {
  id: number;
  email: string | null;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  orgoConnection: {
    orgoUserId?: number | null;
    cardId?: string | null;
    email?: string | null;
    connectedAt?: Date;
    lastLoginAt?: Date;
    profile?: Record<string, unknown>;
  } | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const createUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 1,
  email: 'ana@example.test',
  displayName: 'Ana Cercetas',
  firstName: 'Ana',
  lastName: 'Cercetas',
  avatarUrl: null,
  roles: [],
  orgoConnection: null,
  lastLoginAt: new Date('2026-06-20T10:00:00.000Z'),
  createdAt: new Date('2026-06-10T10:00:00.000Z'),
  updatedAt: new Date('2026-06-20T10:00:00.000Z'),
  ...overrides,
});

const createService = (
  user: TestUser | null = createUser(),
  activeNotificationUserIds: number[] = [],
) => {
  const usersRepository = {
    find: jest.fn(() => Promise.resolve(user ? [user] : [])),
    findOne: jest.fn(() => Promise.resolve(user)),
    create: jest.fn((value: TestUser) => value),
  };
  const orgoConnectionsRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: unknown) => value),
  };
  const subscriptionsRepository = {
    find: jest.fn(() =>
      Promise.resolve(activeNotificationUserIds.map((userId) => ({ userId }))),
    ),
    findOne: jest.fn(({ userId }: { userId: number }) =>
      Promise.resolve(
        activeNotificationUserIds.includes(userId) ? { userId } : null,
      ),
    ),
  };
  const em = {
    persist: jest.fn(),
    flush: jest.fn(() => Promise.resolve(undefined)),
  };

  return {
    service: new UsersService(
      usersRepository as never,
      orgoConnectionsRepository as never,
      subscriptionsRepository as never,
      em as never,
    ),
    usersRepository,
    subscriptionsRepository,
    em,
  };
};

describe('UsersService role administration', () => {
  it('returns only requested Orgo personal fields and uses the stored profile photo', () => {
    const user = createUser({
      avatarUrl: 'https://images.example.test/older.jpg',
      orgoConnection: {
        cardId: 'FT678',
        orgoUserId: 517,
        profile: {
          email: 'florin@example.test',
          status: 'ACTIVE',
          dateOfBirth: { date: '1993-03-09 00:00:00.000000', timezone: 'UTC' },
          dateJoined: { date: '2007-11-20 00:00:00.000000', timezone: 'UTC' },
          feeValidUntilDate: {
            date: '2026-09-30 00:00:00.000000',
            timezone: 'UTC',
          },
          profileImage: 'https://images.example.test/current.jpg',
          accessToken: 'must-not-leak',
          privateField: 'also-private',
        },
      },
    });
    const { service } = createService(user);
    const result = service.serialize(user as never);
    expect(result.orgoConnection?.profile).toEqual({
      email: 'florin@example.test',
      status: 'ACTIVE',
      dateOfBirth: '1993-03-09',
      dateJoined: '2007-11-20',
      feeValidUntilDate: '2026-09-30',
    });
    expect(result.avatarUrl).toBe('https://images.example.test/current.jpg');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('also-private');
    expect(
      service.serializeAdminUser(user as never).orgoConnection,
    ).not.toHaveProperty('profile');
  });

  it('handles missing or malformed profile fields without broken dates or image URLs', () => {
    const { service } = createService();
    const user = createUser({
      avatarUrl: 'https://images.example.test/fallback.jpg',
      orgoConnection: {
        profile: {
          dateOfBirth: { date: '2026-02-30 00:00:00.000000' },
          dateJoined: { date: 'not-a-date' },
          feeValidUntilDate: { date: null },
          email: { token: 'private' },
          status: ['ACTIVE'],
          profileImage: 'javascript:alert(1)',
        },
      },
    });
    const result = service.serialize(user as never);
    expect(result.orgoConnection?.profile).toEqual({
      dateOfBirth: undefined,
      dateJoined: undefined,
      feeValidUntilDate: undefined,
      email: undefined,
      status: undefined,
    });
    expect(result.avatarUrl).toBe('https://images.example.test/fallback.jpg');
    expect(
      service.serialize(createUser() as never).orgoConnection,
    ).toBeUndefined();
    expect(
      service.serialize(
        createUser({
          avatarUrl: 'http://insecure.example.test/photo',
        }) as never,
      ).avatarUrl,
    ).toBeUndefined();
  });

  it('lists admin-safe user payloads with Orgo hints', async () => {
    const { service, subscriptionsRepository } = createService(
      createUser({
        roles: [UserRole.Admin],
        orgoConnection: {
          orgoUserId: 42,
          cardId: 'CJ-123',
          email: 'ana@orgo.test',
          connectedAt: new Date('2026-06-11T10:00:00.000Z'),
          lastLoginAt: new Date('2026-06-20T10:00:00.000Z'),
        },
      }),
      [1],
    );

    const [adminUser] = await service.listAdminUsers();

    expect(adminUser).toMatchObject({
      id: 1,
      displayName: 'Ana Cercetas',
      roles: [UserRole.Admin],
      notificationsEnabled: true,
    });
    expect(adminUser.orgoConnection?.orgoUserId).toBe(42);
    expect(adminUser.orgoConnection?.cardId).toBe('CJ-123');
    expect(subscriptionsRepository.find).toHaveBeenCalledWith(
      { isActive: true },
      { fields: ['userId'] },
    );
  });

  it('reports notifications as disabled without active subscriptions', async () => {
    const { service } = createService();

    const [adminUser] = await service.listAdminUsers();

    expect(adminUser.notificationsEnabled).toBe(false);
  });

  it('updates roles with deterministic ordering and without duplicates', async () => {
    const user = createUser();
    const { service, em } = createService(user, [user.id]);

    const result = await service.updateRoles(1, [
      UserRole.SuperAdmin,
      UserRole.Admin,
      UserRole.Admin,
      UserRole.FinanceManager,
    ]);

    expect(user.roles).toEqual([
      UserRole.Admin,
      UserRole.FinanceManager,
      UserRole.SuperAdmin,
    ]);
    expect(result.roles).toEqual(user.roles);
    expect(result.notificationsEnabled).toBe(true);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported role values', async () => {
    const { service, em } = createService();

    await expect(service.updateRoles(1, ['owner'])).rejects.toThrow(
      BadRequestException,
    );
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('rejects non-array role payloads', async () => {
    const { service, em } = createService();

    await expect(service.updateRoles(1, UserRole.Admin)).rejects.toThrow(
      BadRequestException,
    );
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('throws not found for missing target users', async () => {
    const { service, em } = createService(null);

    await expect(service.updateRoles(404, [])).rejects.toThrow(
      NotFoundException,
    );
    expect(em.flush).not.toHaveBeenCalled();
  });
});
