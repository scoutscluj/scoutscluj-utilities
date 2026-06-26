/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, prerendered, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'scoutscluj-pwa';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${version}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${version}`;
const OFFLINE_URL = '/offline';
const ASSETS = [...build, ...files, ...prerendered];
const ASSET_SET = new Set(ASSETS);
const AUTH_PATH_PREFIXES = ['/api', '/auth', '/login'];

const isNoStore = (response: Response) =>
	response.headers.get('cache-control')?.toLowerCase().includes('no-store') ?? false;

const canCacheResponse = (response: Response) =>
	response instanceof Response && response.status === 200 && !isNoStore(response);

const isSameOrigin = (url: URL) => url.origin === worker.location.origin;

const isAuthOrApiPath = (pathname: string) =>
	AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const cacheFirst = async (request: Request) => {
	const url = new URL(request.url);
	const cache = await caches.open(SHELL_CACHE);
	const cached = await cache.match(url.pathname);

	if (cached) {
		return cached;
	}

	const response = await fetch(request);
	if (canCacheResponse(response)) {
		await cache.put(request, response.clone());
	}
	return response;
};

const staleWhileRevalidate = async (request: Request) => {
	const cache = await caches.open(RUNTIME_CACHE);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then(async (response) => {
			if (canCacheResponse(response)) {
				await cache.put(request, response.clone());
			}
			return response;
		})
		.catch(() => cached);

	return cached ?? network;
};

const navigationFallback = async (request: Request) => {
	const cache = await caches.open(RUNTIME_CACHE);

	try {
		const response = await fetch(request);
		const url = new URL(request.url);
		if (canCacheResponse(response) && isSameOrigin(url) && !isAuthOrApiPath(url.pathname)) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) {
			return cached;
		}

		const offline = await caches.match(OFFLINE_URL);
		if (offline) {
			return offline;
		}

		throw error;
	}
};

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.catch((error) => console.error('[PWA] Precaching failed', error))
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter(
							(key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== RUNTIME_CACHE
						)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method !== 'GET') {
		return;
	}

	const url = new URL(request.url);
	const accept = request.headers.get('accept') ?? '';
	const isNavigation = request.mode === 'navigate' || accept.includes('text/html');

	if (!isSameOrigin(url)) {
		return;
	}

	if (isAuthOrApiPath(url.pathname)) {
		return;
	}

	if (isNavigation) {
		event.respondWith(navigationFallback(request));
		return;
	}

	if (ASSET_SET.has(url.pathname)) {
		event.respondWith(cacheFirst(request));
		return;
	}

	if (
		url.pathname.startsWith('/icons/') ||
		url.pathname.endsWith('.png') ||
		url.pathname.endsWith('.ico') ||
		url.pathname.endsWith('.svg') ||
		url.pathname.endsWith('.webmanifest')
	) {
		event.respondWith(staleWhileRevalidate(request));
	}
});

worker.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		worker.skipWaiting();
	}
});

const getSafeNotificationUrl = (value: unknown) => {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
		return '/';
	}

	try {
		const url = new URL(value, worker.location.origin);
		if (url.origin !== worker.location.origin) {
			return '/';
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return '/';
	}
};

worker.addEventListener('push', (event) => {
	let notification = {
		title: 'ScoutsCluj',
		body: 'Ai o notificare nouă.',
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-192.png',
		tag: 'scoutscluj',
		data: { url: '/' },
		actions: [] as NotificationAction[]
	};

	if (event.data) {
		try {
			const payload = event.data.json() as {
				notification?: Partial<typeof notification>;
				title?: string;
				body?: string;
				icon?: string;
				badge?: string;
				tag?: string;
				data?: Record<string, unknown>;
				actions?: NotificationAction[];
			};
			const incoming = payload.notification ?? payload;
			notification = {
				...notification,
				...incoming,
				title: incoming.title ?? notification.title,
				body: incoming.body ?? notification.body,
				data: {
					...notification.data,
					...(incoming.data ?? {})
				},
				actions: incoming.actions ?? notification.actions
			};
		} catch (error) {
			console.error('[PWA] Push payload parsing failed', error);
		}
	}

	event.waitUntil(
		worker.registration.showNotification(notification.title, {
			body: notification.body,
			icon: notification.icon,
			badge: notification.badge,
			tag: notification.tag,
			data: notification.data,
			actions: notification.actions
		})
	);
});

worker.addEventListener('notificationclick', (event) => {
	event.notification.close();

	if (event.action === 'dismiss') {
		return;
	}

	const targetUrl = getSafeNotificationUrl(event.notification.data?.url);
	event.waitUntil(
		(async () => {
			const clients = await worker.clients.matchAll({
				type: 'window',
				includeUncontrolled: true
			});

			for (const client of clients) {
				if ('focus' in client && client.url.startsWith(worker.location.origin)) {
					if ('navigate' in client) {
						await client.navigate(`${worker.location.origin}${targetUrl}`);
					}
					return client.focus();
				}
			}

			return worker.clients.openWindow(`${worker.location.origin}${targetUrl}`);
		})()
	);
});

worker.addEventListener('notificationclose', () => {
	// Reserved for future local diagnostics.
});
