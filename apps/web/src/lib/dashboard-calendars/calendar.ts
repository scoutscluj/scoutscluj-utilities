export const zone = 'Europe/Bucharest';
export type CalendarEvent = {
	id: string;
	title: string;
	/** Sanitized HTML from the calendar API. Never raw provider HTML. */
	description?: string;
	location?: string;
	allDay: boolean;
	start: string;
	end: string;
};
export type CalendarPage = {
	items: CalendarEvent[];
	range: { from: string; to: string };
	nextCursor?: string;
	fetchedAt: string;
	stale: boolean;
};
export type CalendarResult = { page: CalendarPage | null; error: string | null };
export type Range = { from: string; to: string };
// A fresh continuation must not hide a stale page already displayed in the widget.
export function pageMetadata(previous: CalendarPage | null, next: CalendarPage): CalendarPage {
	return {
		...next,
		stale: Boolean(previous?.stale || next.stale),
		fetchedAt:
			previous && Date.parse(previous.fetchedAt) < Date.parse(next.fetchedAt)
				? previous.fetchedAt
				: next.fetchedAt
	};
}
const dayFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: zone,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

export function localDay(instant: string | number | Date = new Date()): string {
	const parts = dayFormat.formatToParts(new Date(instant));
	return ['year', 'month', 'day']
		.map((name) => parts.find((p) => p.type === name)!.value)
		.join('-');
}
export function addDays(day: string, count: number): string {
	const date = new Date(`${day}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + count);
	return date.toISOString().slice(0, 10);
}
export function midnight(day: string): string {
	const target = Date.parse(`${day}T00:00:00Z`);
	let instant = target;
	for (let i = 0; i < 3; i++) {
		const offset = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
			.formatToParts(instant)
			.find((p) => p.type === 'timeZoneName')!.value;
		const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
		const minutes = match
			? (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === '-' ? -1 : 1)
			: 0;
		instant = target - minutes * 60000;
	}
	return new Date(instant).toISOString();
}
export function weekStart(day: string): string {
	return addDays(day, -((new Date(`${day}T12:00Z`).getUTCDay() + 6) % 7));
}
export function monthStart(day: string): string {
	return `${day.slice(0, 7)}-01`;
}
export function moveMonth(day: string, step: number): string {
	const date = new Date(`${monthStart(day)}T12:00Z`);
	date.setUTCMonth(date.getUTCMonth() + step);
	const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
	date.setUTCDate(Math.min(Number(day.slice(8)), last));
	return date.toISOString().slice(0, 10);
}
export function visibleDays(selected: string, view: 'week' | 'month'): string[] {
	const start = weekStart(view === 'week' ? selected : monthStart(selected));
	const last =
		view === 'week'
			? addDays(start, 6)
			: addDays(weekStart(addDays(moveMonth(monthStart(selected), 1), -1)), 6);
	const days: string[] = [];
	for (let day = start; day <= last; day = addDays(day, 1)) days.push(day);
	return days;
}
export function daysRange(days: string[]): Range {
	return { from: midnight(days[0]), to: midnight(addDays(days[days.length - 1], 1)) };
}
export function nextWindow(range: Range): Range {
	return { from: range.to, to: midnight(addDays(localDay(range.to), 90)) };
}
export function initialRange(now: Date): Range {
	return {
		from: new Date(Math.floor(now.getTime() / 300000) * 300000).toISOString(),
		to: midnight(addDays(localDay(now), 90))
	};
}
export function eventStart(event: CalendarEvent): number {
	return Date.parse(event.allDay ? midnight(event.start) : event.start);
}
export function eventEnd(event: CalendarEvent): number {
	return Date.parse(event.allDay ? midnight(event.end) : event.end);
}
export function overlapsDay(event: CalendarEvent, day: string): boolean {
	return (
		eventStart(event) < Date.parse(midnight(addDays(day, 1))) &&
		eventEnd(event) > Date.parse(midnight(day))
	);
}
export function sorted(events: CalendarEvent[]): CalendarEvent[] {
	return [...new Map(events.map((event) => [event.id, event])).values()].sort(
		(a, b) => eventStart(a) - eventStart(b) || a.id.localeCompare(b.id)
	);
}
export function dayLabel(day: string): string {
	return new Intl.DateTimeFormat('ro-RO', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${day}T12:00Z`));
}
export function shortDate(day: string): string {
	return new Intl.DateTimeFormat('ro-RO', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(`${day}T12:00Z`));
}

export function weekdayLabel(day: string): string {
	return new Intl.DateTimeFormat('ro-RO', { weekday: 'long', timeZone: 'UTC' }).format(
		new Date(`${day}T12:00Z`)
	);
}

export function monthLabel(day: string): string {
	return new Intl.DateTimeFormat('ro-RO', { month: 'short', timeZone: 'UTC' })
		.format(new Date(`${day}T12:00Z`))
		.replace('.', '');
}

export function periodLabel(first: string, last: string): string {
	return new Intl.DateTimeFormat('ro-RO', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).formatRange(new Date(`${first}T12:00Z`), new Date(`${last}T12:00Z`));
}

export function eventDetails(event: CalendarEvent): string {
	const normalized = (value: string) =>
		value
			.replace(/<[^>]*>/g, ' ')
			.replace(/&nbsp;|&#160;/gi, ' ')
			.replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/\s+/g, ' ')
			.trim()
			.toLocaleLowerCase('ro-RO');
	const repeated = new Set([event.title, event.location ?? ''].map(normalized));
	return (event.description ?? '')
		.split(/\r?\n/)
		.filter((line) => !repeated.has(normalized(line)))
		.join('\n')
		.trim();
}
export function eventTime(event: CalendarEvent): string {
	if (event.allDay)
		return event.end > addDays(event.start, 1)
			? `Toată ziua · ${shortDate(event.start)} – ${shortDate(addDays(event.end, -1))}`
			: 'Toată ziua';
	const time = (instant: string) =>
		new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(
			new Date(instant)
		);
	return localDay(event.start) === localDay(event.end)
		? `${time(event.start)} – ${time(event.end)}`
		: `${shortDate(localDay(event.start))}, ${time(event.start)} – ${shortDate(localDay(event.end))}, ${time(event.end)}`;
}
