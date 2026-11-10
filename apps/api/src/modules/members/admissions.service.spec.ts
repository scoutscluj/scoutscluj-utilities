jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/member-application.entity', () => ({
  MemberApplication: 'application',
  MemberGuardian: 'guardian',
}));
jest.mock('./entities/member.entity', () => ({
  MemberSync: 'sync',
  MemberFamilyLink: 'family-link',
  ScoutMember: 'member',
  ScoutUnit: 'unit',
  ScoutAssignment: 'assignment',
}));
jest.mock('../users/entities/user.entity', () => ({ User: 'user' }));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
jest.mock('./members.service', () => ({
  MembersService: class {},
  bodyObject: (v: unknown) => v,
  stringValue: (v: unknown) => String(v).trim(),
}));
jest.mock('./orgo.service', () => ({ MemberOrgoService: class {} }));
import { ForbiddenException } from '@nestjs/common';
import { OrgoRequestError } from './orgo-sync';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from '@mikro-orm/postgresql';
import { AdmissionsService } from './admissions.service';
import type { MembersService } from './members.service';
import type { MemberOrgoService } from './orgo.service';
import { UserRole } from '../users/entities/user-role.enum';

function fixture(admin = false, config: Record<string, string> = {}) {
  const application = {
    id: 'request',
    requestKey: '11111111-1111-4111-8111-111111111111',
    state: 'pending',
    revision: 1,
    unitId: 'own-unit',
    memberId: null,
    data: {
      firstName: 'Ana',
      lastName: 'Test',
      birthDate: '2014-01-01',
      grade: 6,
      schooling: 'grade',
      email: '',
      phone: '',
      guardianName: 'Parent',
      guardianPhone: '0700',
      guardianEmail: 'parent@example.test',
    },
  };
  const created: { entity: unknown; value: Record<string, unknown> }[] = [];
  const scope = jest.fn(() =>
    Promise.resolve({ admin, unitIds: ['own-unit'] }),
  );
  const tx = {
    find: jest.fn(() => Promise.resolve([])),
    count: jest.fn(() => Promise.resolve(2)),
    execute: jest.fn(
      (
        _sql?: string,
        _params?: unknown[],
      ): Promise<Record<string, unknown>[]> => {
        void _sql;
        void _params;
        return Promise.resolve([]);
      },
    ),
    findOneOrFail: jest.fn(
      (entity: unknown): Promise<Record<string, unknown>> =>
        Promise.resolve(
          entity === 'application'
            ? application
            : entity === 'unit'
              ? { id: 'own-unit', branch: 'temerari', structureId: 'cluj' }
              : {},
        ),
    ),
    findOne: jest.fn(
      (
        _entity: unknown,
        _where: unknown,
      ): Promise<Record<string, unknown> | null> => {
        void _entity;
        void _where;
        return Promise.resolve(null);
      },
    ),
    nativeDelete: jest.fn(() => Promise.resolve(1)),
    nativeUpdate: jest.fn(
      (_entity: unknown, _where: unknown, update: Record<string, unknown>) => {
        Object.assign(application, update);
        return Promise.resolve(1);
      },
    ),
    flush: jest.fn(() => Promise.resolve()),
    create: jest.fn((entity: unknown, value: Record<string, unknown>) => {
      const row = { id: 'created-member', revision: 1, ...value };
      created.push({ entity, value: row });
      return row;
    }),
  };
  type FakeManager = typeof tx & {
    fork: () => FakeManager;
    transactional: (work: (t: unknown) => unknown) => Promise<unknown>;
  };
  const em: FakeManager = {
    ...tx,
    fork() {
      return em;
    },
    transactional: (work: (t: unknown) => unknown) => Promise.resolve(work(tx)),
  };
  const orgo = {
    serverRequest: jest.fn(
      (
        _path: string,
        _method?: string,
        _body?: Record<string, unknown>,
      ): Promise<Record<string, unknown>> => {
        void _path;
        void _method;
        void _body;
        return Promise.resolve({});
      },
    ),
    registerDelivery: jest.fn(),
    registrationFeePrice: jest.fn(() =>
      Promise.resolve('/api/v1/product_prices/222'),
    ),
    registrationEmailExists: jest.fn(() => Promise.resolve(false)),
  };
  const service = new AdmissionsService(
    em as unknown as EntityManager,
    { admissionScope: scope, queue: jest.fn() } as unknown as MembersService,
    orgo as unknown as MemberOrgoService,
    new ConfigService(config),
  );
  const user = { id: 1, displayName: 'Leader', roles: [] as UserRole[] };
  return { service, application, created, scope, user, tx, orgo };
}
describe('admission review authorization and provisioning', () => {
  it('allows an active unit leader to approve without local admin roles', async () => {
    const f = fixture();
    await f.service.review(f.user, 'request', {
      revision: 1,
      familyVersion: (await f.service.previewFamily(f.user, 'request')).version,
      action: 'approve',
    });
    expect(f.application.state).toBe('approved');
    expect(f.created.find((r) => r.entity === 'sync')?.value).toMatchObject({
      kind: 'admission-create',
      actorId: 1,
    });
    expect(f.orgo.serverRequest).not.toHaveBeenCalled(); // review itself never performs an external create
  });
  it('denies another unit before returning or mutating personal data', async () => {
    const f = fixture();
    f.application.unitId = 'other-unit';
    await expect(
      f.service.review(f.user, 'request', { revision: 1, action: 'approve' }),
    ).rejects.toThrow();
    expect(f.created).toHaveLength(0);
    expect(f.application.state).toBe('pending');
  });
  it('requires an administrator for applications without a destination', async () => {
    const f = fixture();
    f.application.unitId = null as unknown as string;
    await expect(
      f.service.review(f.user, 'request', { revision: 1, action: 'approve' }),
    ).rejects.toThrow();
    expect(f.created).toHaveLength(0);
  });
  it('rejects stale and repeated approval instead of creating a second identity', async () => {
    const f = fixture(true);
    await expect(
      f.service.review(f.user, 'request', { revision: 0, action: 'approve' }),
    ).rejects.toThrow('schimbat');
    await f.service.review(f.user, 'request', {
      revision: 1,
      familyVersion: (await f.service.previewFamily(f.user, 'request')).version,
      action: 'approve',
    });
    await expect(
      f.service.review(f.user, 'request', { revision: 2, action: 'approve' }),
    ).rejects.toThrow('aprobată');
    expect(f.created.filter((r) => r.entity === 'member')).toHaveLength(1);
  });
  it('does not move a reserved family price to a different canonical account after an uncertain creation', async () => {
    const f = fixture(true);
    Object.assign(f.application, {
      state: 'approved',
      memberId: 'provisional',
      attemptedAt: new Date(),
    });
    const job = { state: 'permission-required', memberId: 'provisional' };
    f.tx.findOneOrFail.mockImplementation((entity) =>
      Promise.resolve(entity === 'application' ? f.application : job),
    );
    f.tx.findOne.mockImplementation((entity) =>
      Promise.resolve(
        entity === 'member'
          ? { id: 'canonical' }
          : entity === 'family-link'
            ? { memberId: 'provisional', plan: 'fam2' }
            : null,
      ),
    );
    await expect(
      f.service.review(f.user, 'request', {
        action: 'retry',
        revision: 1,
        existingOrgoId: 42,
      }),
    ).rejects.toThrow('verificarea manuală');
    expect(job.memberId).toBe('provisional');
    expect(f.tx.nativeDelete).not.toHaveBeenCalled();
    expect(f.created).toHaveLength(0);
  });
  it('does not let a leader bind a guessed existing Orgo ID', async () => {
    const f = fixture();
    await expect(
      f.service.review(f.user, 'request', {
        revision: 1,
        action: 'approve',
        existingOrgoId: 999,
      }),
    ).rejects.toThrow();
    expect(f.orgo.serverRequest).not.toHaveBeenCalled();
    expect(f.created).toHaveLength(0);
  });
});

describe('registration structure and account email validation', () => {
  const input = {
    registrationFor: 'other',
    gender: 'F',
    requestKey: '22222222-2222-4222-8222-222222222222',
    firstName: 'Ana',
    lastName: 'Test',
    birthDate: '2014-01-01',
    schooling: 'grade',
    grade: 6,
    structureId: 'floresti',
    email: 'child@example.test',
    forChild: true,
    consent: true,
    guardianName: 'Parent',
    guardianEmail: 'parent@example.test',
    guardianPhone: '0700',
    guardianRelation: 'Părinte',
  };
  it('persists the selected structure even when requesting branch guidance', async () => {
    const f = fixture();
    await f.service.submit(input);
    expect(
      f.created.find((r) => r.entity === 'application')?.value.data,
    ).toMatchObject({ structureId: 'floresti' });
    expect(f.orgo.registrationEmailExists).toHaveBeenCalledWith(
      'child@example.test',
    );
  });
  it('retains Florești on approval when no branch has been selected', async () => {
    const f = fixture(true);
    Object.assign(f.application, { unitId: null });
    Object.assign(f.application.data, { structureId: 'floresti' });
    await f.service.review(f.user, 'request', {
      revision: 1,
      familyVersion: (await f.service.previewFamily(f.user, 'request')).version,
      action: 'approve',
    });
    expect(f.created.find((r) => r.entity === 'member')?.value).toMatchObject({
      structureId: 'floresti',
      unitId: null,
    });
  });
  it('rejects a unit from a different structure on the server', async () => {
    const f = fixture();
    f.tx.findOne.mockImplementation((entity) =>
      Promise.resolve(
        entity === 'unit' ? { id: 'unit', structureId: 'cluj' } : null,
      ),
    );
    await expect(
      f.service.submit({ ...input, unitId: 'unit' }),
    ).rejects.toThrow('structurii');
    expect(f.created).toHaveLength(0);
  });
  it('rejects a normalized email already used by a local account, member or active application', async () => {
    const f = fixture();
    f.tx.execute.mockImplementation((sql) =>
      Promise.resolve(
        sql?.includes('select true as used') ? [{ used: true }] : [],
      ),
    );
    await expect(
      f.service.submit({ ...input, email: ' CHILD@EXAMPLE.TEST ' }),
    ).rejects.toThrow('deja folosit');
    expect(f.orgo.registrationEmailExists).not.toHaveBeenCalled();
    expect(f.created).toHaveLength(0);
    expect(
      f.tx.execute.mock.calls.find(([sql]) =>
        sql?.includes('select true as used'),
      )?.[1]?.[0],
    ).toBe('child@example.test');
  });
  it('rejects an email already used in Orgo and does not accept an unverified result', async () => {
    const f = fixture();
    f.orgo.registrationEmailExists.mockResolvedValue(true);
    await expect(f.service.submit(input)).rejects.toThrow('deja folosit');
    f.orgo.registrationEmailExists.mockRejectedValue(new Error('Unavailable'));
    await expect(f.service.submit(input)).rejects.toThrow(
      'Nu am putut verifica',
    );
    expect(f.created).toHaveLength(0);
  });
  it('checks the account email even when it is also the guardian contact', async () => {
    const f = fixture();
    await f.service.submit({ ...input, email: input.guardianEmail });
    expect(f.orgo.registrationEmailExists).toHaveBeenCalledWith(
      input.guardianEmail,
    );
    expect(f.created[0].value.data).toMatchObject({
      email: input.guardianEmail,
      guardianEmail: input.guardianEmail,
    });
  });
  it('does not disclose or revalidate the data of a replayed request key', async () => {
    const f = fixture();
    f.tx.findOne.mockResolvedValue({
      id: 'prior',
      data: { email: 'private@example.test' },
    });
    await expect(f.service.submit(input)).resolves.toEqual({ received: true });
    expect(f.created).toHaveLength(0);
    expect(f.orgo.registrationEmailExists).not.toHaveBeenCalled();
  });
});

function deliveryFixture() {
  const f = fixture(false, {
    ORGO_MEMBER_CREATION_ENABLED: 'true',
    ORGO_LOCAL_CENTER_ID: '7',
  });
  const job: Record<string, unknown> = {
    id: 'job',
    state: 'pending',
    kind: 'admission-create',
    memberId: 'member',
    payload: { applicationId: 'request', unitId: 'own-unit' },
    attempts: 0,
  };
  const member = {
    id: 'member',
    orgoId: null,
    unitId: 'own-unit',
    category: 'temerari',
    grade: 6,
    remote: {},
  };
  Object.assign(f.application, {
    state: 'approved',
    approvedBy: 1,
    memberId: 'member',
    attemptedAt: null,
    existingOrgoId: null,
  });
  f.tx.findOneOrFail.mockImplementation((entity: unknown) =>
    Promise.resolve(
      entity === 'sync'
        ? job
        : entity === 'application'
          ? f.application
          : entity === 'member'
            ? member
            : entity === 'user'
              ? { id: 1, roles: [], displayName: 'Leader' }
              : { id: 'own-unit', branch: 'temerari' },
    ),
  );
  return { ...f, job, member };
}
describe('admission provisioning result correlation', () => {
  it('checks email again before recording a creation attempt and never sends a duplicate create', async () => {
    const f = deliveryFixture();
    f.application.data.email = 'child@example.test';
    f.orgo.registrationEmailExists.mockResolvedValue(true);
    await f.service.deliver('job');
    expect(f.orgo.registrationEmailExists).toHaveBeenCalledWith(
      'child@example.test',
    );
    expect(f.orgo.serverRequest).not.toHaveBeenCalled();
    expect(f.application).toMatchObject({ attemptedAt: null });
    expect(f.job.state).toBe('permission-required');
    expect(f.job.message).toContain('deja folosit');
  });
  it('does not repeat a POST after a remote timeout that may have created the account', async () => {
    const f = deliveryFixture();
    f.orgo.serverRequest.mockRejectedValue(new OrgoRequestError(504));
    await f.service.deliver('job');
    expect(f.job.state).toBe('pending');
    await f.service.deliver('job');
    expect(f.job.state).toBe('uncertain');
    expect(f.orgo.serverRequest).toHaveBeenCalledTimes(1);
  });
  it('revalidates a revoked reviewer before sending any ORGO request', async () => {
    const f = deliveryFixture();
    f.scope.mockRejectedValue(new ForbiddenException());
    await f.service.deliver('job');
    expect(f.job.state).toBe('permission-required');
    expect(f.orgo.serverRequest).not.toHaveBeenCalled();
  });
  it('persists returned ID before readback and excludes guardian identity from account creation', async () => {
    const f = deliveryFixture();
    f.orgo.serverRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path === '/api/v1/member-register-by-admin'
          ? { id: 42 }
          : {
              id: 42,
              localCenter: { id: 7 },
              firstName: 'Ana',
              lastName: 'Test',
              dateBirth: '2014-01-01',
              status: 'ACTIVE',
            },
      ),
    );
    await f.service.deliver('job');
    expect(f.job.state).toBe('synced');
    expect(f.tx.nativeUpdate).toHaveBeenCalledWith(
      'application',
      { id: 'request' },
      { existingOrgoId: 42 },
    );
    const body = f.orgo.serverRequest.mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(body.email).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('parent@example.test');
    expect(f.member.orgoId).toBe(42);
  });
});

describe('new account family price delivery', () => {
  const setup = (confirmed: boolean) => {
    const f = deliveryFixture();
    const family = {
      memberId: 'member',
      sourceApplicationId: 'request',
      plan: 'fam2',
      priceReference: null as string | null,
      priceConfirmedAt: null,
    };
    f.tx.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === 'family-link' ? family : null),
    );
    const find = f.tx.findOneOrFail.getMockImplementation()!;
    f.tx.findOneOrFail.mockImplementation((entity) =>
      entity === 'family-link' ? Promise.resolve(family) : find(entity),
    );
    f.orgo.serverRequest.mockImplementation((path) =>
      Promise.resolve(
        path === '/api/v1/member-register-by-admin'
          ? { id: 42 }
          : {
              id: 42,
              localCenter: { id: 7 },
              firstName: 'Ana',
              lastName: 'Test',
              dateBirth: '2014-01-01',
              status: 'ACTIVE',
              feeTenantProductPrice: confirmed
                ? '/api/v1/product_prices/222'
                : '/api/v1/product_prices/111',
            },
      ),
    );
    return { ...f, family };
  };
  it('sends only the new member price in initial creation and verifies it before enabling collection', async () => {
    const f = setup(true);
    await f.service.deliver('job');
    expect(f.orgo.registrationFeePrice).toHaveBeenCalledWith('fam2');
    expect(f.orgo.serverRequest.mock.calls[0][2]).toMatchObject({
      feeTenantProductPrice: '/api/v1/product_prices/222',
    });
    expect(JSON.stringify(f.orgo.serverRequest.mock.calls)).not.toContain(
      'parent@example.test',
    );
    expect(f.family.priceConfirmedAt).toBeInstanceOf(Date);
    expect(f.job.state).toBe('synced');
  });
  it('keeps a mismatched price visible and retries readback without another account creation', async () => {
    const f = setup(false);
    await f.service.deliver('job');
    expect(f.job.state).toBe('permission-required');
    expect(f.family.priceConfirmedAt).toBeNull();
    await f.service.deliver('job');
    expect(
      f.orgo.serverRequest.mock.calls.filter(([, method]) => method === 'POST'),
    ).toHaveLength(1);
  });
});

describe('application photo privacy and pending indicator', () => {
  it('counts pending applications only within review scope', async () => {
    const f = fixture();
    await expect(f.service.pendingCount(f.user)).resolves.toEqual({ count: 2 });
    expect(f.tx.count).toHaveBeenCalledWith('application', {
      state: 'pending',
      unitId: { $in: ['own-unit'] },
    });
    f.scope.mockResolvedValue({ admin: false, unitIds: [] });
    f.tx.count.mockClear();
    await expect(f.service.pendingCount(f.user)).resolves.toEqual({ count: 0 });
    expect(f.tx.count).not.toHaveBeenCalled();
  });
  it('never returns a photo to a reviewer outside the destination unit', async () => {
    const f = fixture();
    Object.assign(f.application.data, { photo: 'data:image/jpeg;base64,/9j/' });
    expect((await f.service.photo(f.user, 'request')).type).toBe('image/jpeg');
    f.application.unitId = 'other-unit';
    await expect(f.service.photo(f.user, 'request')).rejects.toThrow();
  });
  it('uses SQL projection to keep image bytes out of the list', async () => {
    const f = fixture();
    await f.service.list(f.user);
    expect(f.tx.execute).toHaveBeenCalledWith(
      expect.stringContaining("data - 'photo' as data"),
      ['own-unit'],
    );
  });
  it('sends gender at creation and queues photo once after the account is confirmed', async () => {
    const f = deliveryFixture();
    Object.assign(f.application.data, {
      gender: 'F',
      photo: 'data:image/jpeg;base64,/9j/',
    });
    f.orgo.serverRequest.mockImplementation((path) =>
      Promise.resolve(
        path === '/api/v1/member-register-by-admin'
          ? { id: 42 }
          : {
              id: 42,
              localCenter: { id: 7 },
              firstName: 'Ana',
              lastName: 'Test',
              dateBirth: '2014-01-01',
              gender: 'F',
              status: 'ACTIVE',
              logo: null,
            },
      ),
    );
    await f.service.deliver('job');
    expect(f.job.state).toBe('synced');
    expect(f.orgo.serverRequest).toHaveBeenCalledWith(
      '/api/v1/member-register-by-admin',
      'POST',
      expect.objectContaining({ gender: 'F' }),
    );
    const photo = f.created.find((r) => r.value.kind === 'photo');
    expect(photo?.value).toMatchObject({
      memberId: 'member',
      payload: {
        applicationId: 'request',
        logo: 'data:image/jpeg;base64,/9j/',
      },
      baseline: { logo: null },
    });
    expect(
      f.created.some(
        (r) =>
          r.entity === 'audit' && JSON.stringify(r.value).includes('base64'),
      ),
    ).toBe(false);
    f.tx.findOne.mockImplementation((entity) =>
      Promise.resolve(
        entity === 'sync' ? { ...photo!.value, state: 'pending' } : null,
      ),
    );
    f.job.state = 'pending';
    await f.service.deliver('job');
    expect(f.created.filter((r) => r.value.kind === 'photo')).toHaveLength(1);
    expect(
      f.orgo.serverRequest.mock.calls.filter(
        ([path]) => path === '/api/v1/member-register-by-admin',
      ),
    ).toHaveLength(1);
  });
});
