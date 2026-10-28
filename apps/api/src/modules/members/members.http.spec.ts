jest.mock('../membership/entities/admission-allocation.entity', () => ({
  AdmissionAllocation: 'admission-allocation',
}));
jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./entities/member.entity', () => ({
  LocalStructure: 'structure',
  ScoutMember: 'member',
  ScoutUnit: 'unit',
  ScoutSubunit: 'subunit',
  ScoutUnitSource: 'source',
  ScoutAssignment: 'assignment',
  ScoutNote: 'note',
  MemberSync: 'sync',
  MemberTransition: 'transition',
  MemberSettings: 'settings',
  MemberNotice: 'notice',
}));
jest.mock('../users/entities/user.entity', () => ({ User: 'user' }));
jest.mock('../users/entities/orgo-connection.entity', () => ({
  OrgoConnection: 'connection',
}));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
jest.mock('../membership/entities/membership.entity', () => ({
  MembershipObligation: 'obligation',
  MembershipAllocation: 'allocation',
  MembershipPeriod: 'period',
  MembershipCheckout: 'checkout',
  MembershipReceipt: 'receipt',
}));
jest.mock('../auth/guards/auth.guard', () => ({
  AuthGuard: class {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('./orgo.service', () => ({ MemberOrgoService: class {} }));
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MemberOrgoService } from './orgo.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { emptyProfile, targetYear } from './member.types';

type Row = Record<string, unknown>;
function fixture() {
  const tables: Record<string, Row[]> = {};
  const list = (name: string) => tables[name] ?? (tables[name] = []);
  const matches = (row: Row, filter: Row): boolean =>
    Object.entries(filter).every(([key, value]) => {
      if (key === '$or') return (value as Row[]).some((f) => matches(row, f));
      const actual =
        row[key] ??
        (key === 'structureId'
          ? 'cluj'
          : key === 'structureConfirmed'
            ? false
            : null);
      if (value && typeof value === 'object') {
        const op = value as Row;
        if ('$ne' in op) return actual !== op.$ne;
        if ('$in' in op) return (op.$in as unknown[]).includes(actual);
        if ('$ilike' in op)
          return (
            typeof actual === 'string' &&
            typeof op.$ilike === 'string' &&
            actual.toLowerCase() === op.$ilike.toLowerCase()
          );
      }
      return actual === value;
    });
  const em = {
    find: (name: string, filter: Row = {}) => {
      if (name === 'assignment')
        for (const row of list(name)) row.actorId ??= 2;
      return Promise.resolve(list(name).filter((r) => matches(r, filter)));
    },
    findOne: (name: string, filter: Row) =>
      Promise.resolve(list(name).find((r) => matches(r, filter)) ?? null),
    findOneOrFail: (name: string, filter: Row) => {
      const r = list(name).find((r) => matches(r, filter));
      if (!r) throw Error(`Missing fixture ${name}`);
      return Promise.resolve(r);
    },
    count: (name: string, filter: Row) =>
      Promise.resolve(list(name).filter((r) => matches(r, filter)).length),
    create: (name: string, data: Row) => {
      const r = {
        id: randomUUID(),
        revision: 1,
        remote: {},
        status: 'active',
        canEdit: false,
        canSeeFees: false,
        canSeeSensitive: false,
        ...data,
      };
      list(name).push(r);
      return r;
    },
    transactional: async <T>(fn: (tx: unknown) => Promise<T>) => {
      const before = structuredClone(tables);
      try {
        return await fn(em);
      } catch (error) {
        for (const key of Object.keys(tables)) {
          const old = before[key] ?? [];
          const restored = old.map((saved) => {
            const current = tables[key].find((r) => r.id === saved.id);
            if (!current) return saved;
            for (const field of Object.keys(current)) delete current[field];
            Object.assign(current, saved);
            return current;
          });
          tables[key] = restored;
        }
        throw error;
      }
    },
    execute: () => Promise.resolve([]),
    clear: () => {},
    flush: async () => {},
    fork: () => em,
  };
  return { tables, list, em: em as unknown as EntityManager };
}
describe('member HTTP scope and lifecycle', () => {
  let app: INestApplication;
  let f: ReturnType<typeof fixture>;
  let childId: string;
  let otherId: string;
  const groupA = randomUUID(),
    groupB = randomUUID(),
    unitId = randomUUID(),
    otherUnit = randomUUID(),
    adultId = randomUUID();
  beforeEach(async () => {
    f = fixture();
    f.list('structure').push(
      { id: 'cluj', name: 'Cluj' },
      { id: 'floresti', name: 'Florești' },
    );
    childId = randomUUID();
    otherId = randomUUID();
    f.list('user').push(
      { id: 1, roles: [], councilAdmin: false },
      {
        id: 2,
        roles: ['admin'],
        centralMemberAdmin: true,
        councilAdmin: false,
      },
      { id: 3, roles: [] },
    );
    f.list('connection').push(
      { user: 1, orgoUserId: 100 },
      { user: 3, orgoUserId: 201 },
    );
    f.list('member').push(
      {
        id: randomUUID(),
        accountId: 2,
        status: 'active',
        structureId: 'cluj',
        category: 'lideri',
        name: 'Central admin',
        birthDate: '1990-01-01',
        profile: emptyProfile(),
        remote: {},
      },
      {
        id: adultId,
        orgoId: 100,
        accountId: 1,
        status: 'active',
        name: 'Adult',
        birthDate: '1990-01-01',
        category: 'lideri',
        profile: emptyProfile(),
        revision: 1,
        remote: {},
      },
      {
        id: childId,
        orgoId: 201,
        accountId: 3,
        status: 'active',
        name: 'Child A',
        unitId,
        groupId: groupA,
        grade: 5,
        profile: { ...emptyProfile(), medical: 'medical-secret' },
        revision: 1,
        remote: {},
      },
      {
        id: otherId,
        orgoId: 202,
        status: 'active',
        name: 'Child B',
        unitId,
        groupId: groupB,
        grade: 6,
        profile: { ...emptyProfile(), medical: 'medical-secret-b' },
        revision: 1,
        remote: {},
      },
    );
    f.list('unit').push(
      {
        id: unitId,
        parentId: null,
        branch: 'temerari',
        fixed: true,
        archived: false,
      },
      {
        id: groupA,
        parentId: unitId,
        branch: 'temerari',
        fixed: true,
        archived: false,
      },
      {
        id: groupB,
        parentId: unitId,
        branch: 'temerari',
        fixed: true,
        archived: false,
      },
      {
        id: otherUnit,
        parentId: null,
        branch: 'exploratori',
        fixed: true,
        archived: false,
      },
    );
    f.list('subunit').push({
      id: groupB + '-other',
      parentId: otherUnit,
      branch: 'exploratori',
      archived: false,
    });
    f.list('subunit').push(...f.list('unit').filter((u) => !!u.parentId));
    f.tables.unit = f.list('unit').filter((u) => !u.parentId);
    f.list('assignment').push({
      id: randomUUID(),
      memberId: adultId,
      role: 'leader',
      unitId,
      groupId: groupA,
      canEdit: false,
      canSeeSensitive: false,
      canSeeFees: false,
    });
    const module = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        { provide: MembersService, useValue: new MembersService(f.em) },
        { provide: MemberOrgoService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ headers: Record<string, string>; user: unknown }>();
          req.user = { id: Number(req.headers['x-actor'] ?? 1), roles: [] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });
  const http = () => request(app.getHttpServer() as Server);
  const localAdmin = () => {
    const actor = f.list('member').find((m) => m.id === adultId)!;
    actor.structureId = 'floresti';
    actor.birthDate = '1990-01-01';
    f.tables.assignment = [
      {
        id: randomUUID(),
        memberId: adultId,
        role: 'structure_admin',
        structureId: 'floresti',
        unitId: null,
        groupId: null,
      },
    ];
    const unit = f.list('unit').find((u) => u.id === unitId)!;
    unit.structureId = 'floresti';
    for (const id of [childId, otherId])
      f.list('member').find((m) => m.id === id)!.structureId = 'floresti';
  };
  it('lets unit leaders read public clinical custom fields and keeps edits linked to the reusable profile', async () => {
    const child = f.list('member').find((m) => m.id === childId)!;
    child.orgoProfile = {
      customDefinitions: [{ id: 2, name: 'Alergii', visibility: 'public' }],
      customFieldValues: [{ field: 2, value: 'Anterior', media: null }],
    };
    child.profile = { ...emptyProfile(), allergies: 'Anterior' };
    await http()
      .post('/members/' + childId)
      .send({ revision: 1, profile: { allergies: 'Corectat' } })
      .expect(201);
    expect(f.list('sync')[0]).toMatchObject({
      kind: 'orgo-profile',
      payload: { rawUserCustomFieldsValues: { '2': 'Corectat' } },
    });
    const response = await http()
      .get('/members/' + childId)
      .expect(200);
    const detail = JSON.parse(response.text) as {
      member: {
        profile: { allergies: string };
        orgoProfile: { customFieldValues: unknown[] };
      };
    };
    expect(detail.member.profile.allergies).toBe('Corectat');
    expect(detail.member.orgoProfile.customFieldValues).toEqual([
      { field: 2, value: 'Corectat', media: null },
    ]);
  });
  it('previews a multi-member Floresti transfer without changing data, then applies it atomically', async () => {
    const body = {
      members: [childId, otherId].map((id) => ({ id, revision: 1 })),
      changes: { kind: 'structure', structureId: 'floresti' },
    };
    const preview = await http()
      .post('/members/bulk')
      .set('x-actor', '2')
      .send(body)
      .expect(201);
    expect(
      f
        .list('member')
        .filter((m) => [childId, otherId].includes(String(m.id)))
        .every((m) => m.structureId !== 'floresti'),
    ).toBe(true);
    const result = JSON.parse(preview.text) as {
      version: string;
      members: unknown[];
    };
    expect(result.members).toHaveLength(2);
    await http()
      .post('/members/bulk')
      .set('x-actor', '2')
      .send({ ...body, confirm: true, version: result.version })
      .expect(201);
    for (const id of [childId, otherId])
      expect(f.list('member').find((m) => m.id === id)).toMatchObject({
        structureId: 'floresti',
        unitId: null,
      });
    await http()
      .post('/members/bulk')
      .set('x-actor', '2')
      .send({ ...body, confirm: true, version: result.version })
      .expect(409);
  });
  it('rejects a bulk change outside the leader group and rolls back preceding rows', async () => {
    await http()
      .post('/members/bulk')
      .send({
        members: [childId, otherId].map((id) => ({ id, revision: 1 })),
        changes: { kind: 'grade', grade: 8 },
      })
      .expect(403);
    expect(f.list('member').find((m) => m.id === childId)?.grade).toBe(5);
    expect(f.list('sync')).toHaveLength(0);
  });
  it('keeps fees private from readers without an explicit financial grant', async () => {
    f.tables.assignment = [
      {
        memberId: adultId,
        role: 'helper',
        unitId,
        groupId: groupA,
        canSeeFees: false,
      },
    ];
    const response = await http()
      .get('/members/' + childId)
      .expect(200);
    expect(
      (
        JSON.parse(response.text) as {
          access: { fees: boolean; edit: boolean };
        }
      ).access,
    ).toMatchObject({ fees: false, edit: false });
    await http()
      .get('/members/' + otherId)
      .expect(403);
  });
  it('ends authority for incoming suspension and does not restore it on remote reactivation', async () => {
    const member = f.list('member').find((m) => m.id === adultId)!;
    member.status = 'suspended'; // Existing imported state must still revoke stale authority.
    const service = new MembersService(f.em);
    const assignment = {
      id: 'suspended-authority',
      memberId: adultId,
      role: 'helper',
      endedAt: null,
    };
    f.list('assignment').push(assignment);
    await service.applyOrgoStatus(f.em, member as never, 'suspended');
    expect(member.status).toBe('suspended');
    expect(assignment.endedAt).toBeInstanceOf(Date);
    await service.applyOrgoStatus(f.em, member as never, 'active');
    expect(member.status).toBe('active');
    expect(assignment.endedAt).toBeInstanceOf(Date);
    expect(f.list('sync')).toHaveLength(0);
  });
  it('queues the Orgo status change when withdrawing an imported inactive member', async () => {
    const member = f.list('member').find((m) => m.id === childId)!;
    member.status = 'review';
    member.remote = { status: 'INACTIVE' };
    await http()
      .post('/members/' + childId + '/lifecycle')
      .send({ action: 'withdraw' })
      .expect(201);
    expect(member.status).toBe('withdrawn');
    expect(f.list('sync')[0]).toMatchObject({
      kind: 'status',
      state: 'pending',
    });
  });
  it('preserves adult responsibilities when council transfers primary affiliation and flags pending admissions', async () => {
    const adult = f.list('member').find((m) => m.id === adultId)!;
    adult.birthDate = '1990-01-01';
    await http()
      .post(`/members/${adultId}/assignments`)
      .set('x-actor', '2')
      .send({ role: 'helper', unitId: otherUnit, groupId: groupB + '-other' })
      .expect(201);
    f.list('obligation').push({ id: 'o-admission', orgoUserId: 100 });
    f.list('checkout').push({
      id: 'pending-admission',
      obligationId: 'o-admission',
      purpose: 'admission',
      state: 'pending',
      reviewRequired: false,
    });
    await http()
      .post(`/members/${adultId}/transfer`)
      .set('x-actor', '2')
      .send({ structureId: 'floresti' })
      .expect(201);
    expect(
      f.list('assignment').filter((a) => a.memberId === adultId && !a.endedAt),
    ).toHaveLength(2);
    expect(f.list('checkout')[0].reviewRequired).toBe(true);
    expect(adult.structureId).toBe('floresti');
  });
  it('does not let a responsibility bypass the primary structure boundary', async () => {
    f.list('unit').find((u) => u.id === unitId)!.structureId = 'floresti';
    f.list('member').find((m) => m.id === childId)!.structureId = 'floresti';
    await http().get(`/members/${childId}`).expect(403);
    await http()
      .post(`/members/${childId}/lifecycle`)
      .send({ action: 'withdraw' })
      .expect(403);
    const roster = await http().get('/members').expect(200);
    expect(
      (JSON.parse(roster.text) as { members: { id: string }[] }).members.some(
        (m) => m.id === childId,
      ),
    ).toBe(false);
  });
  it('gives local administrators only their structure and no global admin role', async () => {
    localAdmin();
    f.list('member').push({
      id: randomUUID(),
      name: 'Membru Cluj',
      structureId: 'cluj',
      status: 'active',
      profile: emptyProfile(),
    });
    const result = await http().get('/members').expect(200);
    const data = JSON.parse(result.text) as {
      admin: boolean;
      members: { name: string }[];
    };
    expect(data.admin).toBe(false);
    expect(data.members.map((m) => m.name)).not.toContain('Membru Cluj');
    await http()
      .post('/members/units')
      .send({
        name: 'Subunitate Florești',
        parentId: unitId,
        structureId: 'floresti',
      })
      .expect(201);
    await http()
      .post('/members/units')
      .send({ name: 'Subunitate Cluj', parentId: otherUnit })
      .expect(403);
    await http()
      .post(`/members/${childId}/transfer`)
      .send({ unitId: otherUnit, structureId: 'cluj' })
      .expect(403);
    await http()
      .post(`/members/${adultId}/assignments`)
      .send({ role: 'council' })
      .expect(403);
  });
  it('allows only council to grant a local mandate and does not require a leader promise', async () => {
    f.list('member').find((m) => m.id === adultId)!.structureId = 'floresti';
    const adult = f.list('member').find((m) => m.id === adultId)!;
    adult.birthDate = '1990-01-01';
    await http()
      .post(`/members/${adultId}/assignments`)
      .set('x-actor', '2')
      .send({ role: 'structure_admin', structureId: 'floresti' })
      .expect(201);
    expect(f.list('user').find((u) => u.id === 1)).toMatchObject({
      roles: [],
      councilAdmin: false,
    });
    expect(adult.promiseDate).toBeUndefined();
    await http()
      .post(`/members/${adultId}/assignments`)
      .send({ role: 'structure_admin', structureId: 'cluj' })
      .expect(403);
  });
  it('shows a basic same-structure roster while keeping unrelated profiles private', async () => {
    f.tables.assignment = [];
    const roster = await http().get('/members').expect(200);
    expect(
      (JSON.parse(roster.text) as { members: { id: string }[] }).members.some(
        (m) => m.id === otherId,
      ),
    ).toBe(true);
    await http().get(`/members/${otherId}`).expect(403);
  });
  it('denies a local manager direct and delegated access to visitors from another structure', async () => {
    localAdmin();
    const guestId = randomUUID();
    f.list('member').push({
      id: guestId,
      name: 'Adult Cluj',
      structureId: 'cluj',
      birthDate: '1990-01-01',
      status: 'active',
      profile: emptyProfile(),
      revision: 1,
    });
    await http().get(`/members/${guestId}`).expect(403);
    await http()
      .post(`/members/${guestId}/assignments`)
      .send({ role: 'helper', unitId, groupId: groupA })
      .expect(403);
    await http()
      .post(`/members/${guestId}/lifecycle`)
      .send({ action: 'withdraw' })
      .expect(403);
  });
  it('retains Florești progression for manual resolution if no local destination exists', async () => {
    localAdmin();
    const child = f.list('member').find((m) => m.id === childId)!;
    child.grade = 8;
    child.lastProgressionYear = 2026;
    f.list('settings').push({ id: 'default', progressionEnabled: true });
    await new MembersService(f.em).annual(new Date('2027-09-01T10:00:00Z'));
    expect(child).toMatchObject({ grade: 8, structureId: 'floresti', unitId });
    expect(
      f.list('transition').find((t) => t.memberId === childId)?.state,
    ).toBe('review');
    const result = await http().get('/members').expect(200);
    expect(
      (
        JSON.parse(result.text) as { transitions: { memberId: string }[] }
      ).transitions.some((t) => t.memberId === childId),
    ).toBe(true);
  });
  it('confirms initial membership once and preserves it when the name changes', async () => {
    const m = f.list('member').find((m) => m.id === childId)!;
    f.list('unit').push({
      id: randomUUID(),
      name: 'Temerari Floresti',
      branch: 'temerari',
      fixed: true,
      parentId: null,
      structureId: 'floresti',
      archived: false,
    });
    m.name = 'Copil Florești';
    m.structureId = 'floresti';
    for (const u of f.list('unit')) u.name = 'Unitate test';
    const preview = await http()
      .get('/members/structures/preview')
      .set('x-actor', '2')
      .expect(200);
    expect(
      (
        JSON.parse(preview.text) as {
          members: { id: string; structureId: string }[];
        }
      ).members.find((r) => r.id === childId)?.structureId,
    ).toBe('floresti');
    // This fixture puts all beneficiaries into the same unit; confirm them together.
    await http()
      .post('/members/structures/confirm')
      .set('x-actor', '2')
      .send({
        confirm: true,
        units: [{ id: unitId, structureId: 'floresti' }],
        members: [childId, otherId].map((id) => ({
          id,
          revision: 1,
          structureId: 'floresti',
          category: 'temerari',
        })),
      })
      .expect(201);
    await http()
      .post(`/members/${childId}`)
      .set('x-actor', '2')
      .send({ revision: m.revision, name: 'Nume fără localitate' })
      .expect(201);
    expect(m.structureId).toBe('floresti');
    await http()
      .post('/members/structures/confirm')
      .set('x-actor', '2')
      .send({
        confirm: true,
        units: [],
        members: [
          { id: childId, revision: m.revision, structureId: 'cluj', unitId },
        ],
      })
      .expect(409);
  });
  it('includes inactive and suspended members in the main scoped roster', async () => {
    f.list('member').push(
      {
        id: 'historical',
        orgoId: 800,
        name: 'Istoric',
        status: 'review',
        remote: { status: 'INACTIVE' },
      },
      {
        id: 'suspended',
        orgoId: 801,
        name: 'Suspendat',
        status: 'review',
        remote: { status: 'SUSPENDED' },
      },
      {
        id: 'returned',
        orgoId: 802,
        name: 'Reactivat',
        status: 'active',
        remote: { status: 'INACTIVE' },
      },
    );
    const response = await http()
      .get('/members')
      .set('x-actor', '2')
      .expect(200);
    const result = JSON.parse(response.text) as {
      members: { id: string }[];
      inactiveMembers: { id: string }[];
    };
    expect(result.inactiveMembers).toBeUndefined();
    expect(result.members.map((m) => m.id)).toEqual(
      expect.arrayContaining(['historical', 'suspended', 'returned']),
    );
    const scoped = await http().get('/members').expect(200);
    expect((JSON.parse(scoped.text) as { members: unknown[] }).members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'historical' })]),
    );
  });
  it('denies private health details and updates outside the designated subunit', async () => {
    await http().get(`/members/${otherId}`).expect(403);
    await http()
      .post(`/members/${otherId}`)
      .send({ revision: 1, profile: { medical: 'Changed' } })
      .expect(403);
  });
  it('rejects elevated identity edits by a group leader', async () => {
    await http()
      .post(`/members/${childId}`)
      .send({ revision: 1, name: 'Changed identity' })
      .expect(403);
    expect(f.list('member').find((m) => m.id === childId)?.name).toBe(
      'Child A',
    );
  });
  it('does not serialize notes to the child account, but permits its medical correction', async () => {
    f.list('note').push({
      id: randomUUID(),
      memberId: childId,
      body: 'internal-secret',
    });
    const read = await http()
      .get(`/members/${childId}`)
      .set('x-actor', '3')
      .expect(200);
    expect((JSON.parse(read.text) as { notes: unknown[] }).notes).toEqual([]);
    expect(read.text).not.toContain('internal-secret');
    await http()
      .post(`/members/${childId}`)
      .set('x-actor', '3')
      .send({ revision: 1, profile: { medical: 'updated' } })
      .expect(201);
  });
  it('rejects stale health updates', async () => {
    await http()
      .post(`/members/${childId}`)
      .send({ revision: 0, profile: { medical: 'stale' } })
      .expect(409);
    expect(
      (f.list('member').find((m) => m.id === childId)?.profile as Row).medical,
    ).toBe('medical-secret');
  });
  it('withdraws globally without chief approval and ends all responsibilities', async () => {
    const council = {
      id: randomUUID(),
      memberId: childId,
      role: 'council',
      unitId: null,
    };
    f.list('assignment').push(council);
    await http()
      .post(`/members/${childId}/lifecycle`)
      .send({ action: 'withdraw' })
      .expect(201);
    expect(f.list('member').find((m) => m.id === childId)?.status).toBe(
      'withdrawn',
    );
    expect(council).toHaveProperty('endedAt');
    expect(f.list('user').find((u) => u.id === 3)?.memberAccessDisabled).toBe(
      true,
    );
    expect(f.list('sync').at(-1)).toMatchObject({
      kind: 'status',
      payload: { status: 'withdrawn' },
    });
  });
  it('forbids a leader from transferring a beneficiary across units', async () => {
    await http()
      .post(`/members/${childId}/transfer`)
      .send({ unitId: otherUnit })
      .expect(403);
  });
  it('allows admin transfer and removes former-unit access to the live file', async () => {
    await http()
      .post(`/members/${childId}/transfer`)
      .set('x-actor', '2')
      .send({ unitId: otherUnit })
      .expect(201);
    await http().get(`/members/${childId}`).expect(403);
    expect(f.list('notice')).toHaveLength(1);
  });
  it('keeps the same cohort and leader when advancing grade 5 to grade 6 exactly once', async () => {
    const child = f.list('member').find((m) => m.id === childId)!;
    child.lastProgressionYear = 2026;
    f.list('settings').push({ id: 'default', progressionEnabled: true });
    const service = new MembersService(f.em);
    await service.annual(new Date('2027-09-01T10:00:00Z'));
    await service.annual(new Date('2027-09-01T11:00:00Z'));
    expect(child).toMatchObject({
      grade: 6,
      groupId: groupA,
      unitId,
      lastProgressionYear: 2027,
    });
    expect(
      f.list('assignment').find((a) => a.memberId === adultId)?.endedAt,
    ).toBeUndefined();
    expect(
      f.list('transition').filter((t) => t.memberId === childId),
    ).toHaveLength(1);
  });
  it('archives only a graduated cohort and ends its adults without assigning them to explorers', async () => {
    const child = f.list('member').find((m) => m.id === childId)!;
    child.grade = 8;
    child.lastProgressionYear = 2026;
    f.list('settings').push({ id: 'default', progressionEnabled: true });
    f.list('assignment').push({
      id: randomUUID(),
      memberId: childId,
      unitId,
      groupId: groupA,
      role: 'beneficiary',
    });
    await new MembersService(f.em).annual(new Date('2027-09-01T10:00:00Z'));
    expect(child).toMatchObject({ grade: 9, unitId: otherUnit, groupId: null });
    expect(f.list('subunit').find((u) => u.id === groupA)?.archived).toBe(true);
    expect(f.list('subunit').find((u) => u.id === groupB)?.archived).toBe(
      false,
    );
    expect(
      f.list('assignment').find((a) => a.memberId === adultId)?.endedAt,
    ).toBeInstanceOf(Date);
  });
  it('converts a senior aged 24 to an adult with no unit and ends helper assignments', async () => {
    const seniorUnit = randomUUID(),
      child = f.list('member').find((m) => m.id === childId)!;
    child.unitId = seniorUnit;
    child.groupId = null;
    child.grade = null;
    child.birthDate = '2003-09-01';
    child.lastProgressionYear = 2026;
    f.list('unit').push({
      id: seniorUnit,
      branch: 'seniori',
      archived: false,
      parentId: null,
    });
    const helper = {
      id: randomUUID(),
      memberId: childId,
      unitId,
      groupId: groupA,
      role: 'helper',
    };
    f.list('assignment').push(helper);
    f.list('settings').push({ id: 'default', progressionEnabled: true });
    await new MembersService(f.em).annual(new Date('2027-09-01T10:00:00Z'));
    expect(child).toMatchObject({
      unitId: null,
      groupId: null,
      adultKind: 'volunteer',
    });
    expect(helper).toHaveProperty('endedAt');
  });
  it('returns within the current period without recreating obligations or restoring old responsibilities', async () => {
    const child = f.list('member').find((m) => m.id === childId)!;
    child.status = 'withdrawn';
    const old = {
      id: randomUUID(),
      memberId: childId,
      role: 'helper',
      unitId,
      groupId: groupA,
      endedAt: new Date(),
    };
    f.list('assignment').push(old);
    f.list('period').push({
      id: 'current',
      startsOn: `${targetYear(new Date())}-09-01`,
    });
    f.list('obligation').push({
      id: 'paid-partly',
      orgoUserId: 201,
      periodId: 'current',
      totalBani: 30000,
    });
    f.list('allocation').push({
      id: 'credit',
      obligationId: 'paid-partly',
      amountBani: 10000,
      reversed: false,
    });
    await http()
      .post(`/members/${childId}/lifecycle`)
      .send({ action: 'reactivate', unitId, groupId: groupA })
      .expect(201);
    expect(f.list('obligation')).toHaveLength(1);
    expect(f.list('allocation')[0].amountBani).toBe(10000);
    expect(child.status).toBe('active');
    expect(old.endedAt).toBeInstanceOf(Date);
  });
  it('refuses leader status for a senior even if a promise date is supplied', async () => {
    const seniorUnit = randomUUID(),
      child = f.list('member').find((m) => m.id === childId)!;
    child.unitId = seniorUnit;
    child.birthDate = '2005-01-01';
    f.list('unit').push({
      id: seniorUnit,
      branch: 'seniori',
      archived: false,
      parentId: null,
    });
    await http()
      .post(`/members/${childId}/assignments`)
      .set('x-actor', '2')
      .send({
        role: 'leader',
        unitId,
        groupId: groupA,
        promiseDate: '2025-01-01',
      })
      .expect(400);
  });
  it('derives admin access from a council mandate and revokes it while the account remains signed in', async () => {
    const member = f.list('member').find((m) => m.id === childId)!;
    member.birthDate = '2000-01-01';
    await http()
      .post(`/members/${childId}/assignments`)
      .set('x-actor', '2')
      .send({ role: 'council' })
      .expect(201);
    expect(f.list('user').find((u) => u.id === 3)?.councilAdmin).toBe(true);
    await http()
      .post('/members/units')
      .set('x-actor', '3')
      .send({ name: 'Subunitate', parentId: unitId })
      .expect(201);
    const mandate = f
      .list('assignment')
      .find((a) => a.memberId === childId && a.role === 'council')!;
    await http()
      .post(`/members/${childId}/assignments/${String(mandate.id)}/end`)
      .set('x-actor', '2')
      .send({})
      .expect(201);
    await http()
      .post('/members/units')
      .set('x-actor', '3')
      .send({ name: 'Forbidden', parentId: unitId })
      .expect(403);
    expect(f.list('user').find((u) => u.id === 3)?.roles).toEqual([]);
  });
  it('bounds delegation to a chief mandate and invalidates the helper when its parent ends', async () => {
    const recipient = f.list('member').find((m) => m.id === childId)!;
    Object.assign(recipient, {
      birthDate: '1990-01-01',
      category: 'lideri',
      unitId: null,
      groupId: null,
    });
    await http()
      .post(`/members/${childId}/assignments`)
      .send({ role: 'helper', unitId, groupId: groupA, canEdit: true })
      .expect(403);
    const chief = f.list('assignment')[0];
    Object.assign(chief, { role: 'chief', groupId: null });
    await http()
      .post(`/members/${childId}/assignments`)
      .send({ role: 'helper', unitId, groupId: groupA, canEdit: true })
      .expect(201);
    const helper = f.list('assignment').find((a) => a.memberId === childId)!;
    expect(helper.parentAssignmentId).toBe(chief.id);
    expect(recipient.category).toBe('lideri');
    const target = f.list('member').find((m) => m.id === otherId)!;
    target.groupId = groupA;
    await http()
      .post(`/members/${otherId}`)
      .set('x-actor', '3')
      .send({ revision: 1, grade: 7 })
      .expect(201);
    await http()
      .post(`/members/${adultId}/assignments/${String(chief.id)}/end`)
      .set('x-actor', '2')
      .send({})
      .expect(201);
    await http()
      .post(`/members/${otherId}`)
      .set('x-actor', '3')
      .send({ revision: target.revision, grade: 8 })
      .expect(403);
  });
  it('protects fixed units even from central administrators', async () => {
    await http()
      .post('/members/units')
      .set('x-actor', '2')
      .send({ name: 'Extra', branch: 'temerari' })
      .expect(400);
    await http()
      .post(`/members/units/${unitId}/archive`)
      .set('x-actor', '2')
      .send({})
      .expect(400);
  });
  it('reconciles a named legacy root as a subunit only after explicit central confirmation', async () => {
    const legacyId = randomUUID();
    f.list('unit').push({
      id: legacyId,
      name: 'Vechea grupa numita',
      branch: 'temerari',
      structureId: 'cluj',
      parentId: null,
      fixed: false,
      archived: false,
      orgoId: 777,
    });
    f.list('source').push({ id: 777, unitId, groupId: null });
    const body = {
      confirm: true,
      members: [],
      units: [{ id: legacyId, convert: false, parentId: unitId }],
    };
    await http()
      .post('/members/structures/confirm')
      .set('x-actor', '2')
      .send(body)
      .expect(201);
    expect(f.list('subunit').some((g) => g.id === legacyId)).toBe(false);
    body.units[0].convert = true;
    await http()
      .post('/members/structures/confirm')
      .set('x-actor', '2')
      .send(body)
      .expect(201);
    await http()
      .post('/members/structures/confirm')
      .set('x-actor', '2')
      .send(body)
      .expect(201);
    expect(f.list('subunit').filter((g) => g.id === legacyId)).toHaveLength(1);
    expect(f.list('source').find((s) => s.id === 777)).toMatchObject({
      unitId,
      groupId: legacyId,
    });
    expect(f.list('unit').find((u) => u.id === legacyId)?.fixed).toBe(false);
  });
});
