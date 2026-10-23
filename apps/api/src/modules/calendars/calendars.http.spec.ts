jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));

import { Test } from '@nestjs/testing';
import { UnauthorizedException, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server } from 'node:http';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { CalendarPageDto } from './calendar.dto';
import { CalendarsController } from './calendars.controller';
import { CalendarsService, normalizeCalendarEvent } from './calendars.service';

const range = { from: '2026-10-23T00:00:00Z', to: '2026-11-23T00:00:00Z' };
const event = {
  id: 'occurrence-1',
  summary: '<b>Întâlnire</b>',
  description: '<script>alert(1)</script><p>Detalii</p>',
  attendees: [{ email: 'private@example.test' }],
  start: { date: '2026-10-24' },
  end: { date: '2026-10-25' },
};
const ok = (body: unknown = { items: [event] }) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });

describe('calendar API authentication, pagination and provider boundary', () => {
  let app: INestApplication;
  let service: CalendarsService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let config: Record<string, string>;
  let now: number;

  beforeEach(async () => {
    now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    config = {
      GOOGLE_CALENDAR_API_KEY: 'synthetic-secret',
      GOOGLE_CALENDAR_EVENTS_ID: 'events@example.test',
      GOOGLE_CALENDAR_HEADQUARTERS_ID: 'hq@example.test',
    };
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(ok()));
    const module = await Test.createTestingModule({
      controllers: [CalendarsController],
      providers: [
        CalendarsService,
        AuthGuard,
        {
          provide: ConfigService,
          useValue: { get: (name: string) => config[name] },
        },
        {
          provide: AuthService,
          useValue: {
            extractSessionToken: (headers: { authorization?: string }) =>
              headers.authorization?.replace('Bearer ', ''),
            getCurrentUserFromToken: (token: string) => {
              if (token !== 'member') throw new UnauthorizedException();
              return Promise.resolve({ id: 1, roles: [] });
            },
          },
        },
      ],
    }).compile();
    service = module.get(CalendarsService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });
  const http = () => request(app.getHttpServer() as Server);
  const get = (source = 'events', query: Record<string, unknown> = range) =>
    http()
      .get(`/api/calendars/${source}`)
      .query(query)
      .auth('member', { type: 'bearer' });

  it('rejects missing and expired sessions before cold or warm cache reads', async () => {
    await http().get('/api/calendars/events').query(range).expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
    await get().expect(200);
    await http()
      .get('/api/calendars/events')
      .query(range)
      .auth('expired', { type: 'bearer' })
      .expect(401);
    await http().get('/api/calendars/headquarters').query(range).expect(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a minimal safe DTO, preserves exclusive all-day boundaries, and caches across members', async () => {
    const response = await get().expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect((response.body as CalendarPageDto).items).toEqual([
      {
        id: event.id,
        title: 'Întâlnire',
        description: '<p>Detalii</p>',
        allDay: true,
        start: '2026-10-24',
        end: '2026-10-25',
      },
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /synthetic-secret|attendees|private@example/,
    );
    await service.list('events', range, 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect((url as URL).toString()).toContain('singleEvents=true');
    expect((url as URL).toString()).toContain('showDeleted=false');
    expect((url as URL).toString()).not.toContain('synthetic-secret');
    expect(init?.headers).toEqual({ 'X-Goog-Api-Key': 'synthetic-secret' });
  });

  it('binds signed continuation to the calendar, period and expiry', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ items: [event], nextPageToken: 'page-two' }))
      .mockResolvedValueOnce(ok({ items: [] }));
    const first = await get().expect(200);
    const cursor = (first.body as CalendarPageDto).nextCursor as string;
    expect(cursor).toBeTruthy();
    await get('headquarters', { ...range, cursor }).expect(400);
    await get('events', {
      ...range,
      to: '2026-11-24T00:00:00Z',
      cursor,
    }).expect(400);
    await get('events', { ...range, cursor: `${cursor}x` }).expect(400);
    const second = await get('events', { ...range, cursor }).expect(200);
    expect((second.body as CalendarPageDto).items).toEqual([]);
    expect((second.body as CalendarPageDto).nextCursor).toBeUndefined();
    expect((fetchMock.mock.calls[1][0] as URL).toString()).toContain(
      'pageToken=page-two',
    );
    now += 86400001;
    await get('events', { ...range, cursor }).expect(400);
  });

  it.each([
    ['unknown', range],
    ['events', {}],
    ['events', { ...range, to: range.from }],
    ['events', { ...range, from: '2026-02-30T00:00:00Z' }],
    ['events', { ...range, to: '2027-10-23T00:00:00Z' }],
    ['events', { ...range, from: '2026-10-23' }],
    ['events', { ...range, calendarId: 'unapproved' }],
    ['events', { ...range, cursor: ['x', 'y'] }],
  ])(
    'rejects invalid source/range/parameters: %s %j',
    async (source, query) => {
      await get(source, query).expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('keeps recurrence occurrence identities, removes cancellations and duplicate entries', async () => {
    fetchMock.mockResolvedValue(
      ok({
        items: [
          event,
          event,
          { ...event, id: 'cancelled-occurrence', status: 'cancelled' },
          {
            ...event,
            id: 'occurrence-2',
            start: { dateTime: '2026-10-26T10:00:00+02:00' },
            end: { dateTime: '2026-10-26T11:00:00+02:00' },
          },
        ],
      }),
    );
    const response = await get().expect(200);
    expect(
      (response.body as CalendarPageDto).items.map(
        (entry: { id: string }) => entry.id,
      ),
    ).toEqual(['occurrence-1', 'occurrence-2']);
  });

  it('coalesces simultaneous requests for an identical range', async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = service.list('events', range, 1);
    const second = service.list('events', range, 2);
    finish(ok());
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows marked stale results only for a bounded transient outage', async () => {
    await get().expect(200);
    now += 6 * 60000;
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response('{}', { status: 429, headers: { 'retry-after': '60' } }),
      ),
    );
    const stale = await get().expect(200);
    expect((stale.body as CalendarPageDto).stale).toBe(true);
    now += 25 * 60000;
    await get().expect(503);
  });

  it('recovers from a transient provider failure with one bounded retry', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(ok());
    await get().expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await get().expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates cache on source permission failure instead of exposing stale results', async () => {
    await get().expect(200);
    now += 6 * 60000;
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));
    await get().expect(503);
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response('{}', { status: 429, headers: { 'retry-after': '60' } }),
      ),
    );
    await get().expect(503);
  });

  it('fails closed for missing credentials or free/busy-only access', async () => {
    delete config.GOOGLE_CALENDAR_API_KEY;
    await get().expect(503);
    expect(fetchMock).not.toHaveBeenCalled();
    config.GOOGLE_CALENDAR_API_KEY = 'synthetic-secret';
    fetchMock.mockResolvedValue(
      ok({ accessRole: 'freeBusyReader', items: [event] }),
    );
    await get().expect(503);
  });

  it('bounds retries, daily upstream requests and per-member traffic', async () => {
    config.GOOGLE_CALENDAR_DAILY_REQUEST_LIMIT = '1';
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    await get().expect(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockClear();
    for (let i = 0; i < 59; i++) await get().expect(503);
    await get().expect(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose arbitrary upstream payloads or malformed events', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        items: [
          { ...event, start: { date: '2026-02-30' } },
          { ...event, end: { date: '2026-10-23' } },
        ],
      }),
    );
    const response = await get().expect(200);
    expect((response.body as CalendarPageDto).items).toEqual([]);
    expect(
      normalizeCalendarEvent({ ...event, summary: undefined }),
    ).toMatchObject({ title: 'Ocupat' });
  });
});
