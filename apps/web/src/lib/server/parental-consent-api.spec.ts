import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('$lib/server/api', () => ({ apiFetch }));
vi.mock('$lib/server/cookies', () => ({
	SESSION_COOKIE_NAME: 'scouts_session'
}));

import { parentalConsentJsonOrNull } from './parental-consent-api';

const cookies = {
	get: vi.fn(() => 'session-token')
};

describe('parentalConsentJsonOrNull', () => {
	beforeEach(() => {
		apiFetch.mockReset();
		cookies.get.mockClear();
	});

	it('returns null for a successful empty response', async () => {
		apiFetch.mockResolvedValue(new Response(null, { status: 200 }));

		await expect(
			parentalConsentJsonOrNull(cookies as never, '/api/activities/2/parental-consent/publication')
		).resolves.toBeNull();
	});
});
