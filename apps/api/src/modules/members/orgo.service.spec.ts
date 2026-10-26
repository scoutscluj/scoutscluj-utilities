jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/member.entity', () => ({
  ScoutAssignment: 'assignment',
  MemberSettings: 'settings',
  ScoutUnit: 'unit',
  ScoutSubunit: 'subunit',
  ScoutUnitSource: 'source',
  LocalStructure: 'structure',
  ScoutMember: 'member',
  MemberSync: 'sync',
}));
jest.mock('../users/entities/user.entity', () => ({ User: 'user' }));
jest.mock('../users/entities/orgo-connection.entity', () => ({
  OrgoConnection: 'connection',
}));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
jest.mock('./members.service', () => ({
  bodyObject: (b: unknown) => b,
  stringValue: (s: unknown) => String(s),
}));
import type { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { MemberOrgoService } from './orgo.service';
import type { MembersService } from './members.service';
import { emptyProfile } from './member.types';

describe('Orgo import preview', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('imports leader promise evidence and active scoped functions without a fictional promise date or patrol access', async () => {
    const created: { entity: unknown; value: Record<string, unknown> }[] = [];
    const unit = {
      id: 'unit-local',
      orgoId: 10,
      branch: 'temerari',
      structureId: 'cluj',
    };
    const em = {
      findOneOrFail: () =>
        Promise.resolve({ id: 'fixed', branch: 'temerari', roles: ['admin'] }),
      findOne: () => Promise.resolve(null),
      find: (entity: unknown) =>
        Promise.resolve(
          entity === 'unit'
            ? [unit]
            : entity === 'source'
              ? [{ id: 10, unitId: 'unit-local' }]
              : [],
        ),
      count: () => Promise.resolve(0),
      flush: async () => {},
      execute: () => Promise.resolve([]),
      create: (entity: unknown, value: Record<string, unknown>) => {
        const row = { id: 'new-' + created.length, ...value };
        created.push({ entity, value: row });
        return row;
      },
      transactional: async <T>(fn: (tx: unknown) => Promise<T>) => fn(em),
    };
    const detail = {
      id: 42,
      fullName: 'Adult lider',
      firstName: 'Adult',
      lastName: 'lider',
      dateBirth: '1990-01-01',
      status: 'ACTIVE',
      localCenter: { id: 7 },
      type: { id: 42, name: 'Lider' },
      userRoles: [
        { role: { id: 1, name: 'Lider' }, unit: { id: 10 } },
        { role: { id: 8, name: 'Consiliu' }, unit: { id: 7 } },
        { role: { id: 18, name: 'Lider' }, unit: { id: 11 } },
        {
          role: { id: 7, name: 'Șef unitate' },
          unit: { id: 10 },
          dateEnded: '2020-01-01',
        },
      ],
    };
    global.fetch = jest.fn().mockImplementation((url: string | URL) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(url).includes('/users/42')
              ? detail
              : {
                  'hydra:member': String(url).includes('/users?')
                    ? [detail]
                    : [],
                },
          ),
          { status: 200 },
        ),
      ),
    );
    const service = new MemberOrgoService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_API_TOKEN: 'server',
        ORGO_LOCAL_CENTER_ID: '7',
        ORGO_OAUTH_BASE_URL: 'https://orgo.example.test',
      }),
      { requireCentral: async () => {} } as unknown as MembersService,
    );
    await service.import(
      { id: 1, displayName: 'Admin', roles: [] },
      { confirm: true },
    );
    const member = created.find((r) => r.entity === 'member')!.value;
    expect(member.promiseSource).toBe('orgo-leader');
    expect(member.promiseDate).toBeUndefined();
    expect(
      created.filter((r) => r.entity === 'assignment').map((r) => r.value.role),
    ).toEqual(['leader', 'council']);
    expect(created.find((r) => r.value.role === 'leader')?.value.unitId).toBe(
      'unit-local',
    );
  });
  it('imports selected units with confirmed branches and rejects a forged patrol selection', async () => {
    const created: Record<string, unknown>[] = [];
    const em = {
      findOneOrFail: () =>
        Promise.resolve({ id: 'fixed', branch: 'temerari', roles: ['admin'] }),
      findOne: () => Promise.resolve(null),
      execute: () => Promise.resolve([]),
      flush: async () => {},
      create: (_entity: unknown, value: Record<string, unknown>) => {
        created.push(value);
        return value;
      },
      transactional: async <T>(fn: (tx: unknown) => Promise<T>) => fn(em),
    };
    const service = new MemberOrgoService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_API_TOKEN: 'server',
        ORGO_LOCAL_CENTER_ID: '7',
        ORGO_OAUTH_BASE_URL: 'https://orgo.example.test',
      }),
      { requireCentral: async () => {} } as unknown as MembersService,
    );
    global.fetch = jest.fn().mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            'hydra:member': String(url).includes('/units?')
              ? [
                  {
                    id: 10,
                    name: 'Unitatea Florești',
                    unitType: { name: 'Unitate' },
                  },
                  { id: 11, name: 'Patrulă', unitType: { name: 'Patrula' } },
                ]
              : [],
          }),
          { status: 200 },
        ),
      ),
    );
    const actor = { id: 1, displayName: 'Admin', roles: [] };
    await expect(
      service.import(actor, {
        confirm: true,
        units: [{ orgoId: 11, branch: 'temerari', structureId: 'floresti' }],
      }),
    ).rejects.toThrow('nu poate fi importată');
    expect(created).toHaveLength(0);
    await expect(
      service.import(actor, {
        confirm: true,
        units: [{ orgoId: 10, branch: '', structureId: 'floresti' }],
      }),
    ).rejects.toThrow('ramura');
    const result = await service.import(actor, {
      confirm: true,
      units: [{ orgoId: 10, branch: 'temerari', structureId: 'floresti' }],
    });
    expect(result.unitsAdded).toBe(1);
    expect(created[0]).toMatchObject({
      orgoId: 10,
      name: 'Unitatea Florești',
      branch: 'temerari',
      structureId: 'floresti',
      structureConfirmed: true,
    });
  });
  it('separates inactive members and excludes patrol types and descendants without matching unit names', async () => {
    const em = {
      findOneOrFail: () =>
        Promise.resolve({ id: 'fixed', branch: 'temerari', roles: ['admin'] }),
      find: () => Promise.resolve([]),
    };
    const service = new MemberOrgoService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_API_TOKEN: 'server',
        ORGO_LOCAL_CENTER_ID: '7',
        ORGO_OAUTH_BASE_URL: 'https://orgo.example.test',
      }),
      { requireCentral: async () => {} } as unknown as MembersService,
    );
    global.fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockImplementation((url) => {
        const match = /\/users\/(\d+)$/.exec(
          typeof url === 'string'
            ? url
            : url instanceof URL
              ? url.href
              : url.url,
        );
        if (match) {
          const id = Number(match[1]);
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id,
                fullName: ['ACTIVE', 'INACTIVE', 'SUSPENDED'][id - 1],
                status: ['ACTIVE', 'INACTIVE', 'SUSPENDED'][id - 1],
                localCenter: { id: 7 },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              'hydra:member': (typeof url === 'string'
                ? url
                : url instanceof URL
                  ? url.href
                  : url.url
              ).includes('/users?')
                ? ['ACTIVE', 'INACTIVE', 'SUSPENDED'].map((status, i) => ({
                    id: i + 1,
                    fullName: status,
                    status,
                    localCenter: { id: 7 },
                  }))
                : [
                    { id: 10, name: 'Unitate', unitType: { name: 'Unitate' } },
                    {
                      id: 11,
                      name: 'Patrulă istorică',
                      unitType: { name: 'Patrula' },
                    },
                    { id: 12, name: 'Copil patrulă', parent: { id: 11 } },
                    {
                      id: 13,
                      name: 'Patrula Nouă',
                      unitType: { name: 'Unitate' },
                    },
                    {
                      id: 14,
                      name: 'Altă patrulă',
                      unitType: { name: 'Patrulă' },
                    },
                  ],
            }),
            { status: 200 },
          ),
        );
      });
    const result = await service.discover({
      id: 1,
      displayName: 'Admin',
      roles: [],
    });
    expect(result.members.map((m) => m.id)).toEqual([1, 3]);
    expect(result.inactiveMembers.map((m) => m.id)).toEqual([2]);
    expect(result.units.map((u) => u.id)).toEqual([10, 13]);
  });
});

function fixture(writes = true) {
  const member = {
    id: 'local',
    orgoId: 42,
    orgoProfile: {} as Record<string, unknown>,
    orgoBase: {} as Record<string, unknown>,
    revision: 2,
    profile: { ...emptyProfile(), email: 'new@example.test', phone: '123' },
    remote: {
      name: 'Test',
      status: 'ACTIVE',
      email: 'old@example.test',
      phone: '123',
    },
  };
  const operation = {
    id: 'job',
    memberId: 'local',
    revision: 2,
    state: 'pending',
    kind: 'profile',
    payload: { contact: { email: member.profile.email, phone: '123' } },
    baseline: member.remote,
    claimedAt: null as Date | null,
    message: '',
    nextAttemptAt: null as Date | null,
    attempts: 0,
  };
  const em = {
    fork: () => em,
    find: (entity: string) =>
      Promise.resolve(entity === 'sync' ? [operation] : []),
    findOneOrFail: (entity: string) =>
      Promise.resolve(entity === 'member' ? member : operation),
    execute: () => Promise.resolve([]),
    create: jest.fn(),
    transactional: <T>(fn: (tx: unknown) => Promise<T>) => fn(em),
  };
  const service = new MemberOrgoService(
    em as unknown as EntityManager,
    new ConfigService({
      ORGO_API_TOKEN: 'test-server-token',
      ORGO_LOCAL_CENTER_ID: '7',
      ORGO_OAUTH_BASE_URL: 'https://orgo.example.test',
      ORGO_MEMBER_WRITES_ENABLED: writes ? 'true' : 'false',
    }),
  );
  return { service, member, operation };
}
const response = (email = 'old@example.test', center = 7, id = 42) =>
  new Response(
    JSON.stringify({
      id,
      fullName: 'Test',
      status: 'ACTIVE',
      email,
      phoneNumber: '123',
      localCenter: { id: center },
    }),
    { status: 200 },
  );
describe('server-token member synchronization', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('uses only Api-Token, verifies the local center and confirms writes by readback', async () => {
    const f = fixture();
    const fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response('new@example.test'))
      .mockResolvedValueOnce(response('new@example.test'));
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('synced');
    expect(fetch).toHaveBeenCalledTimes(3);
    const init = fetch.mock.calls[1][1]!;
    expect(init.method).toBe('PATCH');
    expect(init.headers).toMatchObject({ 'Api-Token': 'test-server-token' });
    expect(init.headers).not.toHaveProperty('Authorization');
  });
  it('does not write when the server has changed the same fields', async () => {
    const f = fixture();
    const fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockResolvedValue(response('third@example.test'));
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('superseded');
    expect(f.member.profile.email).toBe('third@example.test');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not substitute a delegated credential when writes are disabled', async () => {
    const f = fixture(false);
    const fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockResolvedValue(response());
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('permission-required');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects a user from another center before sending any mutation', async () => {
    const f = fixture();
    const fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockResolvedValue(response('old@example.test', 8));
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('unsupported');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('schedules uncertain writes for automatic readback before retrying', async () => {
    const f = fixture();
    const fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error('lost response'));
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('uncertain');
  });
  it('does not overwrite a newer local revision with an old remote response', async () => {
    const f = fixture();
    const fetch = jest
      .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
      .mockImplementation(() => {
        f.member.revision = 3;
        return Promise.resolve(response('new@example.test'));
      });
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('pending');
    expect(f.member.remote.email).toBe('old@example.test');
  });
});

describe('member photo isolation', () => {
  it('rejects arbitrary remote hosts before fetching an imported photo', async () => {
    const fetcher = global.fetch;
    global.fetch = jest.fn();
    try {
      const members = {
        detail: () =>
          Promise.resolve({
            member: {
              orgoProfile: { logo: 'https://untrusted.example/private.jpg' },
            },
          }),
      };
      const service = new MemberOrgoService(
        {} as EntityManager,
        new ConfigService(),
        members as never,
      );
      await expect(
        service.photo({ id: 1, displayName: 'Reader', roles: [] }, 'member'),
      ).rejects.toThrow('Referință de fotografie invalidă');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = fetcher;
    }
  });
  it('rejects SVG and false image MIME declarations without writing an outbox operation', async () => {
    const members = {
      detail: () => Promise.resolve({ access: { edit: true, own: false } }),
    };
    const service = new MemberOrgoService(
      {} as EntityManager,
      new ConfigService(),
      members as never,
    );
    await expect(
      service.savePhoto({ id: 1, displayName: 'Editor', roles: [] }, 'member', {
        revision: 1,
        data: 'data:image/svg+xml;base64,PHN2Zz4=',
      }),
    ).rejects.toThrow();
    await expect(
      service.savePhoto({ id: 1, displayName: 'Editor', roles: [] }, 'member', {
        revision: 1,
        data: 'data:image/png;base64,YWJj',
      }),
    ).rejects.toThrow('nu este o fotografie validă');
  });
});

it('prevents a basic helper from editing clinical custom fields through a forged rich-profile request', async () => {
  const member = {
    id: 'm',
    revision: 1,
    orgoProfile: {
      customDefinitions: [{ id: 2, name: 'Alergii', visibility: 'public' }],
      customFieldValues: [{ field: 2, value: 'Original' }],
    },
  };
  const grant = { edit: true, own: false, sensitive: false, identity: false };
  const members = {
    detail: () => Promise.resolve({ access: grant }),
    access: () => Promise.resolve(grant),
  };
  const create = jest.fn();
  const em = {
    transactional: <T>(fn: (tx: unknown) => Promise<T>) => fn(em),
    execute: () => Promise.resolve([]),
    findOneOrFail: () => Promise.resolve(member),
    create,
  };
  const service = new MemberOrgoService(
    em as unknown as EntityManager,
    new ConfigService(),
    members as never,
  );
  await expect(
    service.saveProfile({ id: 1, displayName: 'Helper', roles: [] }, 'm', {
      revision: 1,
      values: { 'custom:2': 'Changed' },
    }),
  ).rejects.toThrow('fișa protejată');
  expect(create).not.toHaveBeenCalled();
});

describe('automatic member roster refresh', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  function rosterFixture() {
    type Row = Record<string, unknown>;
    const tables: Record<string, Row[]> = {
      settings: [{ id: 'default', refreshState: 'idle' }],
      member: [],
      sync: [],
    };
    const list = (name: string) => tables[name] ?? (tables[name] = []);
    const match = (row: Row, filter: Row) =>
      Object.entries(filter).every(([key, value]) => {
        if (value && typeof value === 'object') {
          const op = value as Row;
          if ('$in' in op) return (op.$in as unknown[]).includes(row[key]);
          if ('$ilike' in op)
            return (
              String(row[key]).toLowerCase() === String(op.$ilike).toLowerCase()
            );
        }
        return (row[key] ?? null) === value;
      });
    const em = {
      fork: () => em,
      execute: () => Promise.resolve([]),
      flush: async () => {},
      transactional: async <T>(fn: (tx: unknown) => Promise<T>) => fn(em),
      find: (name: string, filter: Row = {}) =>
        Promise.resolve(list(name).filter((row) => match(row, filter))),
      findOne: (name: string, filter: Row) =>
        Promise.resolve(list(name).find((row) => match(row, filter)) ?? null),
      findOneOrFail: (name: string, filter: Row) => {
        const row = list(name).find((row) => match(row, filter));
        if (!row) throw new Error('Missing row');
        return Promise.resolve(row);
      },
      count: (name: string, filter: Row) =>
        Promise.resolve(list(name).filter((row) => match(row, filter)).length),
      nativeUpdate: (name: string, filter: Row, update: Row) => {
        for (const row of list(name).filter((row) => match(row, filter)))
          Object.assign(row, update);
        return Promise.resolve();
      },
      create: (name: string, values: Row) => {
        const row = {
          id: name + list(name).length,
          revision: 1,
          orgoProfile: {},
          orgoBase: {},
          remote: {},
          ...values,
        };
        list(name).push(row);
        return row;
      },
    };
    const applyOrgoStatus = jest.fn(
      (_tx: unknown, row: Row, status: string) => {
        row.status = status;
        return Promise.resolve();
      },
    );
    const service = new MemberOrgoService(
      em as unknown as EntityManager,
      new ConfigService({
        ORGO_API_TOKEN: 'server',
        ORGO_LOCAL_CENTER_ID: '7',
        ORGO_OAUTH_BASE_URL: 'https://orgo.example.test',
        ORGO_ACTIVE_STATUS: 'ACTIVE',
      }),
      {
        requireRosterAccess: async () => {},
        applyOrgoStatus,
      } as unknown as MembersService,
    );
    return { service, tables, list, applyOrgoStatus };
  }
  const raw = (id: number, status = 'ACTIVE') => ({
    id,
    fullName: 'Member ' + id,
    status,
    localCenter: { id: 7 },
    type: { id: 39, name: 'Temerar' },
  });
  function serve(rows: ReturnType<typeof raw>[], total = rows.length) {
    global.fetch = jest
      .fn()
      .mockImplementation((url: URL) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              url.pathname === '/api/v1/users'
                ? { 'hydra:member': rows, 'hydra:totalItems': total }
                : url.pathname.startsWith('/api/v1/users/')
                  ? rows.find(
                      (row) => row.id === Number(url.pathname.split('/').pop()),
                    )
                  : { 'hydra:member': [] },
            ),
            { status: 200 },
          ),
        ),
      );
  }
  it('discovers missing members and reactivates existing members without changing local organization', async () => {
    const f = rosterFixture();
    f.list('member').push({
      id: 'old',
      orgoId: 1,
      name: 'Member 1',
      status: 'suspended',
      structureId: 'floresti',
      category: 'scouteri',
      unitId: 'local-unit',
      groupId: 'local-group',
      revision: 3,
      profile: emptyProfile(),
      orgoProfile: {},
      orgoBase: {},
      remote: { status: 'SUSPENDED' },
    });
    serve([raw(1), raw(2, 'INACTIVE'), raw(3, 'SUSPENDED')]);
    await f.service.refreshProfiles();
    expect(f.list('member')).toHaveLength(3);
    expect(f.list('member')[0]).toMatchObject({
      id: 'old',
      status: 'active',
      structureId: 'floresti',
      category: 'scouteri',
      unitId: 'local-unit',
      groupId: 'local-group',
    });
    expect(f.list('member')[1].status).toBe('inactive');
    expect(f.list('member')[2].status).toBe('suspended');
    expect(f.list('assignment')).toHaveLength(0);
    expect(f.list('settings')[0].refreshState).toBe('succeeded');
  });
  it('preserves a pending withdrawal when the remote baseline has not changed', async () => {
    const f = rosterFixture();
    f.list('member').push({
      id: 'old',
      orgoId: 1,
      name: 'Member 1',
      status: 'withdrawn',
      revision: 3,
      profile: emptyProfile(),
      orgoProfile: {},
      orgoBase: {},
      remote: { status: 'ACTIVE' },
    });
    f.list('sync').push({
      memberId: 'old',
      kind: 'status',
      state: 'pending',
      baseline: { status: 'ACTIVE' },
    });
    serve([raw(1)]);
    await f.service.refreshProfiles();
    expect(f.list('member')[0].status).toBe('withdrawn');
    expect(f.applyOrgoStatus).not.toHaveBeenCalled();
  });
  it('accepts Orgo status when it differs from a pending edit baseline', async () => {
    const f = rosterFixture();
    f.list('member').push({
      id: 'old',
      orgoId: 1,
      name: 'Member 1',
      status: 'withdrawn',
      revision: 3,
      profile: emptyProfile(),
      orgoProfile: {},
      orgoBase: {},
      remote: { status: 'ACTIVE' },
    });
    f.list('sync').push({
      memberId: 'old',
      kind: 'status',
      state: 'pending',
      baseline: { status: 'ACTIVE' },
    });
    serve([raw(1, 'SUSPENDED')]);
    await f.service.refreshProfiles();
    expect(f.list('member')[0].status).toBe('suspended');
  });
  it('recognizes an in-flight older write without erasing a newer local profile edit', async () => {
    const f = rosterFixture();
    f.list('member').push({
      id: 'old',
      orgoId: 1,
      name: 'Member 1',
      status: 'active',
      revision: 4,
      profile: { ...emptyProfile(), email: 'latest@example.test' },
      orgoProfile: { email: 'latest@example.test' },
      orgoBase: { email: 'original@example.test' },
      remote: { status: 'ACTIVE' },
    });
    f.list('sync').push({
      memberId: 'old',
      kind: 'orgo-profile',
      state: 'running',
      payload: { email: 'previous@example.test' },
      baseline: { email: 'original@example.test' },
    });
    const row = { ...raw(1), email: 'previous@example.test' };
    global.fetch = jest
      .fn()
      .mockImplementation((url: URL) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              url.pathname === '/api/v1/users'
                ? { 'hydra:member': [row] }
                : url.pathname.endsWith('/1')
                  ? row
                  : { 'hydra:member': [] },
            ),
            { status: 200 },
          ),
        ),
      );
    await f.service.refreshProfiles();
    expect(f.list('member')[0].profile).toMatchObject({
      email: 'latest@example.test',
    });
    expect(f.list('member')[0].orgoBase).toMatchObject({
      email: 'previous@example.test',
    });
  });
  it('does not apply incomplete pages or advance the success timestamp', async () => {
    const f = rosterFixture();
    const date = new Date('2026-10-01');
    f.list('settings')[0].lastOrgoRefresh = date;
    serve([raw(1)], 2);
    await expect(f.service.refreshProfiles()).rejects.toThrow('incomplet');
    expect(f.list('member')).toHaveLength(0);
    expect(f.list('settings')[0]).toMatchObject({
      refreshState: 'failed',
      lastOrgoRefresh: date,
    });
  });
  it('fetches again on another opening even after a successful refresh', async () => {
    const f = rosterFixture();
    serve([raw(1)]);
    await f.service.refreshProfiles();
    serve([raw(1, 'INACTIVE')]);
    await f.service.refreshProfiles();
    expect(f.list('member')).toHaveLength(1);
    expect(f.list('member')[0].status).toBe('inactive');
  });
  it('does not start another roster read while an existing refresh lease is live', async () => {
    const f = rosterFixture();
    Object.assign(f.list('settings')[0], {
      refreshState: 'running',
      refreshClaimedAt: new Date(),
    });
    global.fetch = jest.fn();
    await f.service.refresh({ id: 1, displayName: 'Reader', roles: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('recovers an expired refresh lease', async () => {
    const f = rosterFixture();
    Object.assign(f.list('settings')[0], {
      refreshState: 'running',
      refreshClaimedAt: new Date(Date.now() - 180000),
    });
    serve([raw(1)]);
    await f.service.refreshProfiles();
    expect(f.list('settings')[0].refreshState).toBe('succeeded');
  });
  it('leaves ambiguous provisional identities for review instead of creating duplicates', async () => {
    const f = rosterFixture();
    f.list('member').push({
      id: 'provisional',
      orgoId: null,
      name: 'Member 1',
    });
    serve([raw(1)]);
    await f.service.refreshProfiles();
    expect(f.list('member')).toHaveLength(1);
    expect(f.list('audit')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'members.orgo-identity-review' }),
      ]),
    );
  });
});

describe('automatic outgoing retry', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });
  it('backs off temporary failures and automatically resumes after the due time', async () => {
    const f = fixture();
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('{}', { status: 503 }));
    await f.service.run();
    expect(f.operation.state).toBe('pending');
    expect(f.operation.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(response('new@example.test'))
      .mockResolvedValueOnce(response('new@example.test'));
    global.fetch = fetch;
    await f.service.run();
    expect(fetch).not.toHaveBeenCalled();
    f.operation.nextAttemptAt = new Date(0);
    await f.service.run();
    expect(f.operation.state).toBe('synced');
  });
  it('reads back a timed-out write before deciding whether another PATCH is necessary', async () => {
    const f = fixture();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error('timeout'));
    await f.service.run();
    expect(f.operation.state).toBe('uncertain');
    f.operation.nextAttemptAt = new Date(0);
    const fetch = jest.fn().mockResolvedValue(response('new@example.test'));
    global.fetch = fetch;
    await f.service.run();
    expect(f.operation.state).toBe('synced');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps permission failure explicit instead of retrying rapidly', async () => {
    const f = fixture();
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('{}', { status: 403 }));
    await f.service.run();
    expect(f.operation.state).toBe('permission-required');
    expect(f.operation.nextAttemptAt!.getTime() - Date.now()).toBeGreaterThan(
      800000,
    );
  });
});

it('preserves a newer local edit when its predecessor succeeds during the network call', async () => {
  const f = fixture(),
    original = global.fetch;
  try {
    global.fetch = jest
      .fn()
      .mockImplementation((_url: unknown, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          f.member.profile.email = 'latest@example.test';
          f.member.orgoProfile.email = 'latest@example.test';
          f.member.revision++;
        }
        return Promise.resolve(
          response(
            init?.method === 'GET' && f.member.revision === 2
              ? 'old@example.test'
              : 'new@example.test',
          ),
        );
      });
    await f.service.run();
    expect(f.member.profile.email).toBe('latest@example.test');
    expect(f.member.orgoBase.email).toBe('new@example.test');
    f.operation.payload.contact.email = 'latest@example.test';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response('new@example.test'))
      .mockResolvedValueOnce(response('latest@example.test'))
      .mockResolvedValueOnce(response('latest@example.test'));
    await f.service.run();
    expect(f.operation.state).toBe('synced');
    expect(f.member.profile.email).toBe('latest@example.test');
  } finally {
    global.fetch = original;
  }
});

it('sends a fee-type change using the canonical ProductPrice IRI and confirms it by readback', async () => {
  const f = fixture(),
    original = global.fetch;
  const baseline = '/api/v1/product_prices/100',
    selected = '/api/v1/product_prices/102';
  Object.assign(f.operation, {
    kind: 'fee-plan',
    payload: { plan: 'fam2', feeTenantProductPrice: selected },
    baseline: { feeTenantProductPrice: baseline },
  });
  f.member.orgoProfile.feeTenantProductPrice = selected;
  f.member.orgoBase.feeTenantProductPrice = baseline;
  const reply = (ref: string) =>
    new Response(
      JSON.stringify({
        id: 42,
        localCenter: { id: 7 },
        feeTenantProductPrice: { '@id': ref },
      }),
      { status: 200 },
    );
  const fetcher = jest
    .fn<ReturnType<typeof global.fetch>, Parameters<typeof global.fetch>>()
    .mockResolvedValueOnce(reply(baseline))
    .mockResolvedValueOnce(reply(selected))
    .mockResolvedValueOnce(reply(selected));
  try {
    global.fetch = fetcher;
    await f.service.run();
    expect(f.operation.state).toBe('synced');
    expect(fetcher.mock.calls[1][1]?.body).toBe(
      JSON.stringify({ feeTenantProductPrice: selected }),
    );
  } finally {
    global.fetch = original;
  }
});
