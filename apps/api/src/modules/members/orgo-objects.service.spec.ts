jest.mock('@mikro-orm/postgresql', () => ({ EntityManager: class {} }));
jest.mock('./orgo.service', () => ({ MemberOrgoService: class {} }));
jest.mock('./entities/orgo-object-sync.entity', () => ({
  OrgoObjectJob: 'job',
  OrgoObjectLink: 'link',
}));
jest.mock('./entities/member.entity', () => ({
  ScoutUnit: 'unit',
  ScoutSubunit: 'subunit',
  ScoutMember: 'member',
}));
jest.mock('../activities/entities/activity.entity', () => ({
  Activity: 'activity',
}));
jest.mock('../activity-registrations/registration.entity', () => ({
  ActivityRegistration: 'registration',
  ActivityRegistrationSettings: 'settings',
}));
jest.mock('../users/entities/user.entity', () => ({ User: 'user' }));
jest.mock('../audit/entities/audit-entry.entity', () => ({
  AuditEntry: 'audit',
}));
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { MemberOrgoService } from './orgo.service';
import { OrgoObjectsService } from './orgo-objects.service';
type Row = Record<string, any>;
function fixture(subject = 'activity') {
  const job: Row = {
    id: 'j1',
    subject,
    subjectId: '1',
    state: 'pending',
    changedFields: ['create'],
    payload: {},
    attempts: 0,
  };
  const activity: Row = {
    id: 1,
    title: 'Activity',
    status: 'planned',
    coordinatorId: 1,
    startDate: new Date('2026-11-01T10:00:00Z'),
    endDate: new Date('2026-11-01T11:00:00Z'),
  };
  const rows: Record<string, Row[]> = {
    job: [job],
    link: [],
    activity: [activity],
    user: [{ id: 1, memberAccessDisabled: false }],
    settings: [{ activityId: 1, data: { published: false } }],
    registration: [
      { id: '1', activityId: 1, memberId: 'm1', state: 'pending' },
    ],
    member: [{ id: 'm1', orgoId: 42 }],
  };
  const find = (entity: string, where: Row = {}) =>
    (rows[entity] ?? []).filter((r) =>
      Object.entries(where).every(([k, v]) =>
        typeof v === 'object' && v !== null ? true : r[k] === v,
      ),
    );
  const db = {
    fork: () => db,
    execute: () => Promise.resolve([]),
    find: (entity: string) =>
      Promise.resolve(
        (rows[entity] ?? []).filter((r) =>
          ['pending', 'running', 'permission-required'].includes(
            String(r.state),
          ),
        ),
      ),
    findOne: (entity: string, where: Row) =>
      Promise.resolve(find(entity, where)[0] ?? null),
    findOneOrFail: (entity: string, where: Row) =>
      Promise.resolve(
        find(entity, where)[0] ??
          (() => {
            throw new Error('Missing ' + entity);
          })(),
      ),
    count: () => Promise.resolve(0),
    flush: () => Promise.resolve(),
    create: (entity: string, input: Row) => {
      const row = { baseline: {}, creationStarted: false, ...input };
      (rows[entity] ??= []).push(row);
      return row;
    },
    nativeUpdate: (entity: string, where: Row, update: Row) => {
      find(entity, where).forEach((r) => Object.assign(r, update));
      return Promise.resolve(1);
    },
    transactional: <T>(work: (tx: unknown) => T) => Promise.resolve(work(db)),
  };
  let event: Row | undefined;
  const request = jest.fn((path: string, method = 'GET', body?: Row) =>
    Promise.resolve().then(() => {
      if (path === '/api/v1/units/10')
        return { id: 10, localCenter: { id: 7 } };
      if (path === '/api/v1/users/42')
        return { id: 42, localCenter: { id: 7 } };
      if (path === '/api/v1/events' && method === 'POST') {
        event = {
          ...body,
          uuid: 'event-1',
          unit: { '@id': '/api/v1/units/10', localCenter: { id: 7 } },
        };
        return event;
      }
      if (path === '/api/v1/events/event-1') {
        if (method === 'PATCH') Object.assign(event!, body);
        // ORGO may return equivalent timestamps with another precision/offset.
        return {
          ...event,
          dateTimeBegin: '2026-11-01T12:00:00+02:00',
          dateTimeEnd: '2026-11-01T13:00:00+02:00',
        };
      }
      throw new Error('Unexpected request: ' + path);
    }),
  );
  const service = new OrgoObjectsService(
    db as unknown as EntityManager,
    {
      serverRequest: request,
      registerPump: jest.fn(),
    } as unknown as MemberOrgoService,
    new ConfigService({
      ORGO_OBJECT_WRITES_ENABLED: 'true',
      ORGO_LOCAL_CENTER_ID: '7',
      ORGO_EVENT_UNIT_ID: '10',
      ORGO_ATTENDANCE_STATUS_MAP: '{"pending":"success"}',
    }),
  );
  return {
    service,
    job,
    activity,
    rows,
    request,
    setEvent: (value: Row) => {
      event = value;
    },
  };
}
describe('durable ORGO event/participation delivery', () => {
  it('creates one draft event, confirms equivalent timestamps, and stores canonical correlation', async () => {
    const f = fixture();
    await f.service.run();
    expect(f.job.state).toBe('synced');
    expect(f.activity.orgoEventId).toBe('event-1');
    expect(f.request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(1);
    expect(f.request).toHaveBeenCalledWith(
      '/api/v1/events',
      'POST',
      expect.objectContaining({ status: 'draft', hasEventTicketing: false }),
    );
    await f.service.run();
    expect(f.request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(1);
  });
  it('never creates a second event after a timeout, even after another local edit', async () => {
    const f = fixture();
    f.request.mockImplementation((path, method) =>
      Promise.resolve().then(() => {
        if (method === 'POST') throw new Error('Timeout after remote commit');
        return { id: 10, localCenter: { id: 7 } };
      }),
    );
    await f.service.run();
    f.job.nextAttemptAt = null;
    await f.service.run();
    expect(f.job.state).toBe('uncertain');
    f.rows.job.push({
      ...f.job,
      id: 'j2',
      state: 'pending',
      changedFields: ['title'],
    });
    await f.service.run();
    expect(f.request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(1);
  });
  it('preserves concurrent ORGO changes and never replays unrelated local fields', async () => {
    const f = fixture();
    f.activity.orgoEventId = 'event-1';
    f.job.changedFields = ['title'];
    f.rows.link.push({
      id: 'activity:1',
      remoteId: 'event-1',
      baseline: { name: 'Old title' },
    });
    f.setEvent({
      name: 'Changed remotely',
      description: 'Remote description',
      unit: { localCenter: { id: 7 } },
    });
    await f.service.run();
    expect(f.job.state).toBe('superseded');
    expect(f.request.mock.calls.some((c) => c[1] === 'PATCH')).toBe(false);
  });
  it('refuses to map pending registrations to confirmed attendance', async () => {
    const f = fixture('registration');
    f.activity.orgoEventId = 'event-1';
    await f.service.run();
    expect(f.job.state).toBe('permission-required');
    expect(f.request.mock.calls.some((c) => c[1] === 'POST')).toBe(false);
  });
  it('refuses to send an event into another local center', async () => {
    const f = fixture();
    f.request.mockResolvedValue({ id: 10, localCenter: { id: 99 } });
    await f.service.run();
    expect(f.job.state).toBe('permission-required');
    expect(f.request.mock.calls.some((c) => c[1] === 'POST')).toBe(false);
  });
  it('does not create a remotely unsent registration deleted locally', async () => {
    const f = fixture('registration');
    f.rows.registration = [];
    f.job.payload = { deleted: true, activityId: 1, memberId: 'm1' };
    await f.service.run();
    expect(f.job.state).toBe('synced');
    expect(f.request).not.toHaveBeenCalled();
  });
});
