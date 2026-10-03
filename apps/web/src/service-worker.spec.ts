import { afterEach, expect, it, vi } from 'vitest';

vi.mock('$service-worker', () => ({
	build: [],
	files: [],
	prerendered: [],
	version: 'worker-build-123'
}));

afterEach(() => vi.unstubAllGlobals());

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
