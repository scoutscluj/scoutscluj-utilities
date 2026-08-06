import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('$lib/server/api', () => ({ apiFetch }));
vi.mock('$lib/server/cookies', () => ({
	SESSION_COOKIE_NAME: 'scouts_session'
}));

import { proxyInventoryImage } from './inventory-image-proxy';

const cookies = {
	get: vi.fn(() => 'session-token')
};

describe('proxyInventoryImage', () => {
	beforeEach(() => {
		apiFetch.mockReset();
		cookies.get.mockClear();
	});

	it('streams an upstream image and preserves delivery headers', async () => {
		const upstream = new Response(Buffer.from('thumbnail'), {
			status: 200,
			headers: {
				'cache-control': 'private, max-age=300',
				'content-disposition': 'inline; filename="photo.webp"',
				'content-length': '9',
				'content-type': 'image/webp',
				etag: '"checksum"'
			}
		});
		const arrayBuffer = vi.spyOn(upstream, 'arrayBuffer');
		apiFetch.mockResolvedValue(upstream);

		const response = await proxyInventoryImage({
			cookies: cookies as never,
			request: new Request('http://localhost/image'),
			apiPath: '/api/inventory/items/1/image/thumbnail'
		});

		expect(arrayBuffer).not.toHaveBeenCalled();
		expect(response.body).not.toBeNull();
		expect(response.headers.get('etag')).toBe('"checksum"');
		expect(response.headers.get('content-type')).toBe('image/webp');
	});

	it('forwards validators and returns an empty 304 response', async () => {
		apiFetch.mockResolvedValue(
			new Response(null, {
				status: 304,
				headers: { etag: '"checksum"' }
			})
		);

		const response = await proxyInventoryImage({
			cookies: cookies as never,
			request: new Request('http://localhost/image', {
				headers: { 'if-none-match': '"checksum"' }
			}),
			apiPath: '/api/inventory/items/1/image/thumbnail'
		});

		expect(apiFetch).toHaveBeenCalledWith(
			'/api/inventory/items/1/image/thumbnail',
			expect.objectContaining({ headers: expect.any(Headers) })
		);
		const forwardedHeaders = apiFetch.mock.calls[0][1].headers as Headers;
		expect(forwardedHeaders.get('if-none-match')).toBe('"checksum"');
		expect(response.status).toBe(304);
		expect(response.body).toBeNull();
	});
});
