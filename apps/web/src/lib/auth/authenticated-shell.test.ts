import { describe, expect, it } from 'vitest';
import { usesAuthenticatedShell } from './authenticated-shell';

describe('usesAuthenticatedShell', () => {
	it('keeps the public membership payment page for guests', () => {
		expect(usesAuthenticatedShell('/cotizatie', false)).toBe(false);
	});

	it('uses the application shell for authenticated membership payment pages', () => {
		expect(usesAuthenticatedShell('/cotizatie', true)).toBe(true);
		expect(usesAuthenticatedShell('/cotizatie/rezultat', true)).toBe(true);
	});

	it('does not wrap unrelated public routes', () => {
		expect(usesAuthenticatedShell('/login', true)).toBe(false);
	});
});
