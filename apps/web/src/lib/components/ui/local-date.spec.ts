import { describe, it, expect } from 'vitest';
import { displayDate, parseLocalDate } from './local-date';
describe('Romanian date input contract', () => {
	it('keeps canonical dates independent of display order', () => {
		expect(displayDate('2026-11-13')).toBe('13.11.2026');
		expect(parseLocalDate('13.11.2026')).toBe('2026-11-13');
		expect(parseLocalDate('13/11/2026')).toBe('2026-11-13');
		expect(parseLocalDate('11/13/2026')).toBeNull();
	});
	it('rejects impossible dates and incomplete input', () => {
		for (const input of ['31.02.2026', '29.02.2026', '13.', '00.01.2026'])
			expect(parseLocalDate(input)).toBeNull();
		expect(parseLocalDate('29.02.2028')).toBe('2028-02-29');
		expect(parseLocalDate('')).toBe('');
	});
	it('preserves 24-hour time without shifting the day', () => {
		expect(displayDate('2026-11-13T18:30', true)).toBe('13.11.2026 18:30');
		expect(parseLocalDate('13.11.2026 18:30', true)).toBe('2026-11-13T18:30');
		expect(parseLocalDate('13.11.2026 24:30', true)).toBeNull();
	});
});
