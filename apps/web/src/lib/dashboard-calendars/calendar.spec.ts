import { describe, expect, it } from 'vitest';
import {
	addDays,
	daysRange,
	eventTime,
	initialRange,
	localDay,
	midnight,
	moveMonth,
	nextWindow,
	pageMetadata,
	overlapsDay,
	sorted,
	visibleDays,
	type CalendarEvent
} from './calendar';

const allDay: CalendarEvent = {
	id: 'all-day',
	title: 'Tabără',
	allDay: true,
	start: '2026-10-23',
	end: '2026-10-25'
};
describe('Bucharest calendar dates and windows', () => {
	it('keeps an earlier stale warning when a continuation page is fresh', () => {
		const range = { from: '2026-10-23T00:00:00Z', to: '2026-11-23T00:00:00Z' };
		const earlier = { items: [], range, stale: true, fetchedAt: '2026-10-23T09:00:00Z' };
		const later = {
			...earlier,
			stale: false,
			fetchedAt: '2026-10-23T09:10:00Z',
			nextCursor: 'next'
		};
		expect(pageMetadata(earlier, later)).toMatchObject({
			stale: true,
			fetchedAt: earlier.fetchedAt,
			nextCursor: 'next'
		});
	});
	it('uses the 23-hour spring and 25-hour autumn days without shifting all-day dates', () => {
		expect(midnight('2026-03-29')).toBe('2026-03-28T22:00:00.000Z');
		expect(midnight('2026-03-30')).toBe('2026-03-29T21:00:00.000Z');
		expect(midnight('2026-10-25')).toBe('2026-10-24T21:00:00.000Z');
		expect(midnight('2026-10-26')).toBe('2026-10-25T22:00:00.000Z');
		expect(localDay('2026-10-22T22:30:00Z')).toBe('2026-10-23');
	});
	it('honors exclusive all-day end and midnight timed ends', () => {
		expect(overlapsDay(allDay, '2026-10-22')).toBe(false);
		expect(overlapsDay(allDay, '2026-10-23')).toBe(true);
		expect(overlapsDay(allDay, '2026-10-24')).toBe(true);
		expect(overlapsDay(allDay, '2026-10-25')).toBe(false);
		const timed = {
			...allDay,
			allDay: false,
			start: '2026-10-23T23:00:00+03:00',
			end: '2026-10-24T00:00:00+03:00'
		};
		expect(overlapsDay(timed, '2026-10-23')).toBe(true);
		expect(overlapsDay(timed, '2026-10-24')).toBe(false);
	});
	it('includes cross-midnight bookings on both days and shows real DST times', () => {
		const timed = {
			...allDay,
			allDay: false,
			start: '2026-10-24T23:00:00+03:00',
			end: '2026-10-25T04:00:00+02:00'
		};
		expect(overlapsDay(timed, '2026-10-24')).toBe(true);
		expect(overlapsDay(timed, '2026-10-25')).toBe(true);
		expect(eventTime(timed)).toContain('23:00');
		expect(eventTime(timed)).toContain('04:00');
		expect(eventTime(allDay)).toContain('Toată ziua');
	});
	it('lays out Monday-first weeks and complete month grids including adjacent dates', () => {
		const week = visibleDays('2026-10-23', 'week');
		expect(week).toHaveLength(7);
		expect(week[0]).toBe('2026-10-19');
		expect(week[6]).toBe('2026-10-25');
		const month = visibleDays('2026-10-23', 'month');
		expect(month[0]).toBe('2026-09-28');
		expect(month.at(-1)).toBe('2026-11-01');
		expect(month).toHaveLength(35);
		expect(daysRange(week)).toEqual({ from: midnight('2026-10-19'), to: midnight('2026-10-26') });
	});
	it('moves across year/month ends without overflowing and advances empty windows without gaps', () => {
		expect(moveMonth('2026-01-31', 1)).toBe('2026-02-28');
		expect(moveMonth('2026-12-23', 1)).toBe('2027-01-23');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		const first = initialRange(new Date('2026-10-23T10:03:20Z'));
		expect(first.from).toBe('2026-10-23T10:00:00.000Z');
		expect(nextWindow(first).from).toBe(first.to);
		expect(localDay(nextWindow(first).to)).toBe(addDays(localDay(first.to), 90));
	});
	it('sorts actual instants across different offsets and deduplicates occurrence IDs', () => {
		const a = {
			...allDay,
			allDay: false,
			id: 'a',
			start: '2026-10-25T03:30:00+03:00',
			end: '2026-10-25T04:30:00+02:00'
		};
		const b = { ...a, id: 'b', start: '2026-10-25T03:00:00+02:00' };
		expect(sorted([b, a, a]).map((event) => event.id)).toEqual(['a', 'b']);
	});
});
