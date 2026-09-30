import { describe, expect, it, vi } from 'vitest';
vi.mock('$lib/server/api', () => ({
	apiFetch: vi.fn(async () => new Response('null', { status: 404 }))
}));
import { load } from './+page.server';

describe('membership payment page privacy', () => {
	it('keeps browser form origins while preventing external referrer disclosure', async () => {
		const setHeaders = vi.fn();
		await load({
			cookies: { get: () => 'existing-attempt' },
			locals: { user: null },
			setHeaders
		} as unknown as Parameters<typeof load>[0]);
		expect(setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'referrer-policy': 'same-origin'
		});
	});
});
