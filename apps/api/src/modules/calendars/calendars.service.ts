import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CalendarEventDto, CalendarPageDto } from './calendar.dto';

type Source = 'events' | 'headquarters';
type Cursor = {
  source: Source;
  calendar: string;
  from: string;
  to: string;
  page: string;
  expires: number;
};
type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
type GooglePage = {
  accessRole?: string;
  items?: GoogleEvent[];
  nextPageToken?: string;
};
const MINUTE = 60_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const text = (value?: string) =>
  typeof value === 'string'
    ? value
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .trim()
        .slice(0, 5000)
    : '';

export function normalizeCalendarEvent(
  event: GoogleEvent,
): CalendarEventDto | null {
  const allDay = Boolean(event.start?.date);
  const start = allDay ? event.start?.date : event.start?.dateTime;
  const end = allDay ? event.end?.date : event.end?.dateTime;
  if (event.status === 'cancelled' || !event.id || !start || !end) return null;
  if (
    allDay
      ? !validDate(start) || !validDate(end)
      : !validInstant(start) || !validInstant(end)
  )
    return null;
  if (
    (end <= start && allDay) ||
    (!allDay && Date.parse(end) <= Date.parse(start))
  )
    return null;
  return {
    id: event.id,
    title: text(event.summary) || 'Ocupat',
    allDay,
    start,
    end,
    ...(text(event.description)
      ? { description: text(event.description) }
      : {}),
    ...(text(event.location) ? { location: text(event.location) } : {}),
  };
}

function validDate(value: string) {
  return (
    DATE.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function validInstant(value: string) {
  return (
    value.length <= 64 &&
    INSTANT.test(value) &&
    Number(value.slice(11, 13)) < 24 &&
    Number(value.slice(14, 16)) < 60 &&
    Number(value.slice(17, 19)) < 60 &&
    validDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}

@Injectable()
export class CalendarsService {
  private cache = new Map<
    string,
    { source: Source; value: CalendarPageDto; time: number }
  >();
  private pending = new Map<string, Promise<CalendarPageDto>>();
  private members = new Map<number, { start: number; count: number }>();
  private configuration = '';
  private day = '';
  private calls = 0;
  constructor(private readonly config: ConfigService) {}

  async list(
    sourceValue: string,
    query: Record<string, unknown>,
    userId: number,
  ): Promise<CalendarPageDto> {
    if (sourceValue !== 'events' && sourceValue !== 'headquarters')
      throw new BadRequestException('Calendar necunoscut.');
    const source = sourceValue;
    const fromValue = query.from,
      toValue = query.to;
    if (
      Object.keys(query).some(
        (key) => !['from', 'to', 'cursor'].includes(key),
      ) ||
      typeof fromValue !== 'string' ||
      typeof toValue !== 'string' ||
      !validInstant(fromValue) ||
      !validInstant(toValue)
    ) {
      throw new BadRequestException('Interval calendar invalid.');
    }
    const from = new Date(fromValue).toISOString(),
      to = new Date(toValue).toISOString();
    const duration = Date.parse(to) - Date.parse(from);
    if (duration <= 0 || duration > 93 * 86400000 + 3600000)
      throw new BadRequestException('Intervalul maxim este de 93 de zile.');
    this.throttle(userId);
    const key = this.config.get<string>('GOOGLE_CALENDAR_API_KEY')?.trim();
    const calendar = this.config
      .get<string>(
        source === 'events'
          ? 'GOOGLE_CALENDAR_EVENTS_ID'
          : 'GOOGLE_CALENDAR_HEADQUARTERS_ID',
      )
      ?.trim();
    const fingerprint = JSON.stringify([
      key,
      this.config.get<string>('GOOGLE_CALENDAR_EVENTS_ID'),
      this.config.get<string>('GOOGLE_CALENDAR_HEADQUARTERS_ID'),
    ]);
    if (fingerprint !== this.configuration) {
      this.cache.clear();
      this.configuration = fingerprint;
    }
    if (!key || !calendar)
      throw new ServiceUnavailableException('Calendarul nu este configurat.');
    let page = '';
    if (query.cursor !== undefined)
      page = this.decodeCursor(
        query.cursor,
        { source, calendar, from, to },
        key,
      );
    const cacheKey = JSON.stringify([
      fingerprint,
      source,
      calendar,
      from,
      to,
      page,
    ]);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.time < 5 * MINUTE) return cached.value;
    const existing = this.pending.get(cacheKey);
    if (existing) return existing;
    if (this.pending.size >= 4) return this.fallback(cached);
    const promise = this.load(source, calendar, from, to, page, key)
      .then((value) => {
        if (this.configuration === fingerprint) {
          if (this.cache.size >= 256) {
            const oldest = this.cache.keys().next();
            if (!oldest.done) this.cache.delete(oldest.value);
          }
          this.cache.set(cacheKey, { source, value, time: Date.now() });
        }
        return value;
      })
      .catch((error: unknown) => {
        if (error instanceof HttpException && error.getStatus() === 502) {
          if (this.configuration === fingerprint) {
            for (const [entryKey, entry] of this.cache)
              if (entry.source === source) this.cache.delete(entryKey);
          }
          throw new ServiceUnavailableException(
            'Calendarul nu poate fi accesat. Verifică setările calendarului.',
          );
        }
        return this.fallback(cached);
      })
      .finally(() => {
        this.pending.delete(cacheKey);
      });
    this.pending.set(cacheKey, promise);
    return promise;
  }

  private fallback(cached?: {
    value: CalendarPageDto;
    time: number;
  }): CalendarPageDto {
    if (cached && Date.now() - cached.time <= 30 * MINUTE)
      return { ...cached.value, stale: true };
    throw new ServiceUnavailableException(
      'Calendarul este temporar indisponibil. Încearcă din nou.',
    );
  }

  private throttle(userId: number) {
    const now = Date.now();
    for (const [id, entry] of this.members)
      if (now - entry.start >= MINUTE) this.members.delete(id);
    const entry = this.members.get(userId) ?? { start: now, count: 0 };
    if (
      (this.members.size >= 10000 && !this.members.has(userId)) ||
      ++entry.count > 60
    )
      throw new HttpException(
        'Prea multe cereri. Reîncearcă într-un minut.',
        429,
      );
    this.members.set(userId, entry);
  }

  private encodeCursor(value: Cursor, key: string) {
    const data = Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${data}.${createHmac('sha256', key).update(data).digest('base64url')}`;
  }

  private decodeCursor(
    raw: unknown,
    expected: Omit<Cursor, 'page' | 'expires'>,
    key: string,
  ) {
    try {
      if (typeof raw !== 'string' || raw.length > 12000) throw new Error();
      const [data, signature, extra] = raw.split('.');
      const expectedSignature = createHmac('sha256', key).update(data).digest();
      const actual = Buffer.from(signature, 'base64url');
      if (
        extra ||
        actual.length !== expectedSignature.length ||
        !timingSafeEqual(actual, expectedSignature)
      )
        throw new Error();
      const value = JSON.parse(
        Buffer.from(data, 'base64url').toString(),
      ) as Cursor;
      if (
        Object.entries(expected).some(
          ([name, field]) => value[name as keyof Cursor] !== field,
        ) ||
        !Number.isFinite(value.expires) ||
        value.expires < Date.now() ||
        typeof value.page !== 'string' ||
        !value.page
      )
        throw new Error();
      return value.page;
    } catch {
      throw new BadRequestException(
        'Continuare calendar invalidă sau expirată.',
      );
    }
  }

  private async load(
    source: Source,
    calendar: string,
    from: string,
    to: string,
    page: string,
    key: string,
  ): Promise<CalendarPageDto> {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`,
    );
    url.search = new URLSearchParams({
      timeMin: from,
      timeMax: to,
      timeZone: 'Europe/Bucharest',
      singleEvents: 'true',
      orderBy: 'startTime',
      showDeleted: 'false',
      maxResults: '250',
      fields:
        'accessRole,nextPageToken,items(id,status,summary,description,location,start,end)',
      ...(page ? { pageToken: page } : {}),
    }).toString();
    for (let attempt = 0; attempt < 2; attempt++) {
      const day = new Date().toISOString().slice(0, 10);
      if (this.day !== day) {
        this.day = day;
        this.calls = 0;
      }
      const configuredBudget = Number(
        this.config.get<string>('GOOGLE_CALENDAR_DAILY_REQUEST_LIMIT') ?? 2000,
      );
      const budget =
        Number.isInteger(configuredBudget) && configuredBudget > 0
          ? Math.min(configuredBudget, 10000)
          : 2000;
      if (this.calls >= budget) throw new ServiceUnavailableException();
      this.calls++;
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { 'X-Goog-Api-Key': key },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        if (attempt === 0) {
          await this.backoff();
          continue;
        }
        throw new ServiceUnavailableException();
      }
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: { errors?: { reason?: string }[] };
        } | null;
        const limited =
          response.status === 429 ||
          (response.status === 403 &&
            errorBody?.error?.errors?.some((e) =>
              [
                'rateLimitExceeded',
                'userRateLimitExceeded',
                'quotaExceeded',
                'dailyLimitExceeded',
              ].includes(e.reason ?? ''),
            ));
        const retryable = limited || response.status >= 500;
        if (!retryable) throw new HttpException('Calendar indisponibil.', 502);
        const retryAfter = response.headers.get('retry-after');
        if (attempt === 0 && (!retryAfter || Number(retryAfter) <= 2)) {
          await this.backoff(
            retryAfter ? Math.max(0, Number(retryAfter) * 1000) : undefined,
          );
          continue;
        }
        throw new ServiceUnavailableException();
      }
      const body = (await response.json()) as GooglePage;
      if (body.accessRole === 'freeBusyReader' || body.accessRole === 'none')
        throw new HttpException('Calendar indisponibil.', 502);
      if (
        !Array.isArray(body.items) ||
        body.items.length > 250 ||
        (body.nextPageToken !== undefined &&
          typeof body.nextPageToken !== 'string')
      )
        throw new ServiceUnavailableException();
      const items = Array.from(
        new Map(
          body.items
            .map(normalizeCalendarEvent)
            .filter((event): event is CalendarEventDto => event !== null)
            .map((event) => [event.id, event]),
        ).values(),
      );
      return {
        items,
        range: { from, to },
        fetchedAt: new Date().toISOString(),
        stale: false,
        ...(body.nextPageToken
          ? {
              nextCursor: this.encodeCursor(
                {
                  source,
                  calendar,
                  from,
                  to,
                  page: body.nextPageToken,
                  expires: Date.now() + 86400000,
                },
                key,
              ),
            }
          : {}),
      };
    }
    throw new ServiceUnavailableException();
  }

  private backoff(delay = 250 + Math.random() * 200) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
