jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/member-application.entity', () => ({
  MemberApplication: 'application',
  MemberGuardian: 'guardian',
}));
jest.mock('./entities/member.entity', () => ({
  MemberSync: 'sync',
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
    execute: jest.fn(() => Promise.resolve([])),
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
    findOne: jest.fn(() => Promise.resolve(null)),
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
      action: 'approve',
    });
    await expect(
      f.service.review(f.user, 'request', { revision: 2, action: 'approve' }),
    ).rejects.toThrow('aprobată');
    expect(f.created.filter((r) => r.entity === 'member')).toHaveLength(1);
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
