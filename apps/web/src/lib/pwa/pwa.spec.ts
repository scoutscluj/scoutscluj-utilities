import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true, dev: false, version: 'page-build' }));
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_APP_VERSION: '0.0.0', PUBLIC_COMMIT_HASH: 'unknown' }
}));

let cleanups: (() => void)[];
let registration: EventTarget & {
	waiting: ReturnType<typeof makeWorker> | null;
	installing: ReturnType<typeof makeWorker> | null;
	update: ReturnType<typeof vi.fn>;
};
let serviceWorker: EventTarget & { register: ReturnType<typeof vi.fn>; controller: object };

function makeWorker(build: string) {
	return Object.assign(new EventTarget(), {
		state: 'installed',
		postMessage: vi.fn((message, ports?: MessagePort[]) => {
			if (message.type === 'GET_VERSION') ports?.[0].postMessage({ version: build });
		})
	});
}

async function load() {
	vi.resetModules();
	registration.update.mockClear();
	const { pwa } = await import('./pwa.svelte');
	const cleanup = pwa.init();
	if (cleanup) cleanups.push(cleanup);
	await vi.waitFor(() => expect(registration.update).toHaveBeenCalled());
	return pwa;
}

function installEvent(outcome = 'accepted') {
	return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
		prompt: vi.fn(async () => {}),
		userChoice: Promise.resolve({ outcome, platform: 'web' })
	});
}

beforeEach(() => {
	localStorage.clear();
	cleanups = [];
	registration = Object.assign(new EventTarget(), {
		waiting: null,
		installing: null,
		update: vi.fn(async () => {})
	});
	serviceWorker = Object.assign(new EventTarget(), {
		register: vi.fn(async () => registration),
		controller: {}
	});
	vi.stubGlobal('navigator', { onLine: true, userAgent: 'Chrome', serviceWorker });
	vi.stubGlobal(
		'MessageChannel',
		class {
			port1 = { onmessage: null as ((event: { data: unknown }) => void) | null, close() {} };
			port2 = {
				postMessage: (data: unknown) => queueMicrotask(() => this.port1.onmessage?.({ data })),
				close() {}
			};
		}
	);
});

afterEach(() => {
	for (const cleanup of cleanups) cleanup();
	vi.unstubAllGlobals();
});

describe('PWA prompt dismissal', () => {
	it('keeps installation dismissed after repeated browser events and a page reload', async () => {
		let pwa = await load();
		window.dispatchEvent(installEvent());
		expect(pwa.showInstallPrompt).toBe(true);
		pwa.dismissInstallPrompt();
		window.dispatchEvent(installEvent());
		expect(pwa.showInstallPrompt).toBe(false);
		cleanups.pop()?.();
		pwa = await load();
		window.dispatchEvent(installEvent());
		expect(pwa.showInstallPrompt).toBe(false);
		pwa.openInstallPrompt();
		expect(pwa.showInstallPrompt).toBe(true);
		expect(await pwa.promptInstall()).toBe(true);
	});

	it('remembers dismissing the browser native installation dialog', async () => {
		const pwa = await load();
		window.dispatchEvent(installEvent('dismissed'));
		expect(await pwa.promptInstall()).toBe(false);
		window.dispatchEvent(installEvent());
		expect(pwa.showInstallPrompt).toBe(false);
	});

	it('keeps manual iOS installation dismissed across reloads', async () => {
		vi.stubGlobal('navigator', { onLine: true, userAgent: 'iPhone', serviceWorker });
		let pwa = await load();
		expect(pwa.showInstallPrompt).toBe(true);
		pwa.dismissInstallPrompt();
		cleanups.pop()?.();
		pwa = await load();
		expect(pwa.canInstall).toBe(true);
		expect(pwa.showInstallPrompt).toBe(false);
	});

	it('keeps the same waiting update dismissed but prompts for a different build', async () => {
		registration.waiting = makeWorker('worker-build-1');
		let pwa = await load();
		await vi.waitFor(() => expect(pwa.updateAvailable).toBe(true));
		pwa.dismissUpdate();
		cleanups.pop()?.();
		pwa = await load();
		expect(pwa.updateAvailable).toBe(false);
		registration.installing = makeWorker('worker-build-2');
		registration.waiting = registration.installing;
		registration.dispatchEvent(new Event('updatefound'));
		registration.installing.dispatchEvent(new Event('statechange'));
		await vi.waitFor(() => expect(pwa.updateAvailable).toBe(true));
		pwa.reloadForUpdate();
		expect(registration.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
	});

	it('does not restore a dismissed update on another statechange for the same worker', async () => {
		const pwa = await load();
		registration.installing = makeWorker('worker-build-1');
		registration.waiting = registration.installing;
		registration.dispatchEvent(new Event('updatefound'));
		registration.installing.dispatchEvent(new Event('statechange'));
		await vi.waitFor(() => expect(pwa.updateAvailable).toBe(true));
		pwa.dismissUpdate();
		registration.installing.dispatchEvent(new Event('statechange'));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(pwa.updateAvailable).toBe(false);
	});

	it('honors dismissal while the waiting worker build is still being read', async () => {
		const pwa = await load();
		registration.installing = makeWorker('worker-build-1');
		registration.waiting = registration.installing;
		registration.dispatchEvent(new Event('updatefound'));
		registration.installing.dispatchEvent(new Event('statechange'));
		pwa.dismissUpdate();
		await vi.waitFor(() =>
			expect(localStorage.getItem('pwa-dismissed-worker-build')).toBe('worker-build-1')
		);
		expect(pwa.updateAvailable).toBe(false);
	});
});
