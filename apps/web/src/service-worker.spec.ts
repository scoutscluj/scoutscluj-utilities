import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('$service-worker', () => ({
	build: [],
	files: ['/tutoriale/inscriere-parinti.mp4'],
	prerendered: [],
	version: 'worker-build-123'
}));

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

it('leaves video byte-range requests to the network instead of returning a cached full response', async () => {
	vi.resetModules();
	const worker = Object.assign(new EventTarget(), {
		location: { origin: 'https://app.example.test' }
	});
	const match = vi.fn().mockResolvedValue(new Response('cached full video', { status: 200 }));
	vi.stubGlobal('self', worker);
	vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match }) });
	const workerModule = './service-worker';
	await import(workerModule);
	const respondWith = vi.fn();
	worker.dispatchEvent(
		Object.assign(new Event('fetch'), {
			request: {
				method: 'GET',
				url: 'https://app.example.test/tutoriale/inscriere-parinti.mp4',
				mode: 'cors',
				headers: new Headers({ range: 'bytes=1000-' })
			},
			respondWith
		})
	);
	expect(respondWith).not.toHaveBeenCalled();
	expect(match).not.toHaveBeenCalled();
});

it('returns the actual worker build identifier to the page', async () => {
	const worker = Object.assign(new EventTarget(), { skipWaiting: vi.fn() });
	vi.stubGlobal('self', worker);
	// Keep the worker out of the DOM TypeScript project, as SvelteKit's tsconfig does.
	const workerModule = './service-worker';
	await import(workerModule);
	const reply = vi.fn();
	worker.dispatchEvent(
		Object.assign(new Event('message'), {
			data: { type: 'GET_VERSION' },
			ports: [{ postMessage: reply }]
		})
	);
	expect(reply).toHaveBeenCalledWith({ version: 'worker-build-123' });
	worker.dispatchEvent(
		Object.assign(new Event('message'), { data: { type: 'SKIP_WAITING' }, ports: [] })
	);
	expect(worker.skipWaiting).toHaveBeenCalledOnce();
});

it.each(['/', '/info/calendar', '/sediu/orar', '/profile', '/admin/adult-documents'])(
	'never restores a calendar HTML snapshot offline at %s and bypasses calendar data',
	async (path) => {
		vi.resetModules();
		const worker = Object.assign(new EventTarget(), {
			location: { origin: 'https://app.example.test' }
		});
		const cache = {
			delete: vi.fn().mockResolvedValue(true),
			match: vi.fn().mockResolvedValue(new Response('private calendar data'))
		};
		vi.stubGlobal('self', worker);
		vi.stubGlobal('caches', {
			open: vi.fn().mockResolvedValue(cache),
			match: vi.fn().mockResolvedValue(new Response('Offline'))
		});
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const workerModule = './service-worker';
		await import(workerModule);
		let response: Promise<Response> | undefined;
		const respondWith = vi.fn((value: Promise<Response>) => {
			response = value;
		});
		worker.dispatchEvent(
			Object.assign(new Event('fetch'), {
				request: {
					method: 'GET',
					url: `https://app.example.test${path}`,
					mode: 'navigate',
					headers: new Headers()
				},
				respondWith
			})
		);
		expect(await (await response!).text()).toBe('Offline');
		expect(cache.delete).toHaveBeenCalledOnce();
		expect(cache.match).not.toHaveBeenCalled();
		respondWith.mockClear();
		for (const suffix of ['/calendar-data/events', '/adult-documents/versions/file/download']) {
			worker.dispatchEvent(
				Object.assign(new Event('fetch'), {
					request: {
						method: 'GET',
						url: `https://app.example.test${suffix}`,
						mode: 'cors',
						headers: new Headers()
					},
					respondWith
				})
			);
		}
		expect(respondWith).not.toHaveBeenCalled();
	}
);
