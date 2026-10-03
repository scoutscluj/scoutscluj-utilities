import { browser, dev, version as buildVersion } from '$app/environment';
import { env } from '$env/dynamic/public';

type InstallMode = 'native' | 'manual' | null;

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const LAST_VERSION_KEY = 'pwa-last-version';
const DISMISSED_VERSION_KEY = 'pwa-dismissed-version';
const LAST_COMMIT_HASH_KEY = 'pwa-last-commit-hash';
const DISMISSED_COMMIT_HASH_KEY = 'pwa-dismissed-commit-hash';
const DISMISSED_INSTALL_KEY = 'pwa-install-dismissed';
const DISMISSED_WORKER_KEY = 'pwa-dismissed-worker-build';

const getVersion = () => env.PUBLIC_APP_VERSION || '0.0.0-dev';
const getCommitHash = () => env.PUBLIC_COMMIT_HASH || 'local';
const isIosDevice = () => /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

class PwaState {
	canInstall = $state(false);
	installMode = $state<InstallMode>(null);
	showInstallPrompt = $state(false);
	updateAvailable = $state(false);
	isOffline = $state(false);
	isStandalone = $state(false);
	lastVersion = $state<string | null>(null);
	lastCommitHash = $state<string | null>(null);
	isReloading = $state(false);

	readonly currentVersion = getVersion();
	readonly currentCommitHash = getCommitHash();
	private initialized = false;
	private installPromptEvent: BeforeInstallPromptEvent | null = null;
	private waitingWorker: ServiceWorker | null = null;
	private waitingWorkerVersion: string | null = null;
	private dismissedWaitingWorker: ServiceWorker | null = null;
	private installDismissed = false;
	private workerCleanup: (() => void) | null = null;

	init() {
		if (!browser || this.initialized) {
			return;
		}

		this.initialized = true;
		this.installDismissed = localStorage.getItem(DISMISSED_INSTALL_KEY) === 'true';
		this.isOffline = !navigator.onLine;
		this.syncStandaloneState();
		this.syncInstallAvailability();
		this.syncBuildMetadata();
		void this.registerServiceWorker();

		const displayMode = window.matchMedia?.('(display-mode: standalone)');
		const onDisplayModeChange = () => {
			this.syncStandaloneState();
			this.syncInstallAvailability();
		};
		const onOnline = () => {
			this.isOffline = false;
		};
		const onOffline = () => {
			this.isOffline = true;
		};
		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			this.installPromptEvent = event as BeforeInstallPromptEvent;
			this.canInstall = true;
			this.installMode = 'native';
			this.showInstallPrompt = !this.installDismissed && !this.isStandalone;
		};
		const onAppInstalled = () => {
			this.installPromptEvent = null;
			this.canInstall = false;
			this.installMode = null;
			this.showInstallPrompt = false;
			this.isStandalone = true;
		};

		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onAppInstalled);

		if (displayMode?.addEventListener) {
			displayMode.addEventListener('change', onDisplayModeChange);
		} else if (displayMode?.addListener) {
			displayMode.addListener(onDisplayModeChange);
		}

		return () => {
			this.initialized = false;
			this.workerCleanup?.();
			this.workerCleanup = null;
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
			window.removeEventListener('appinstalled', onAppInstalled);

			if (displayMode?.removeEventListener) {
				displayMode.removeEventListener('change', onDisplayModeChange);
			} else if (displayMode?.removeListener) {
				displayMode.removeListener(onDisplayModeChange);
			}
		};
	}

	async promptInstall() {
		if (this.installMode === 'manual') {
			return false;
		}

		if (!this.installPromptEvent) {
			return false;
		}

		await this.installPromptEvent.prompt();
		const { outcome } = await this.installPromptEvent.userChoice;
		this.installPromptEvent = null;
		this.canInstall = false;
		this.installMode = null;
		this.showInstallPrompt = false;
		if (outcome === 'dismissed') {
			this.dismissInstallPrompt();
		}
		return outcome === 'accepted';
	}

	dismissInstallPrompt() {
		this.installDismissed = true;
		this.showInstallPrompt = false;
		if (browser) localStorage.setItem(DISMISSED_INSTALL_KEY, 'true');
	}

	openInstallPrompt() {
		if (this.isStandalone) {
			return;
		}

		if (this.installPromptEvent) {
			this.installMode = 'native';
			this.showInstallPrompt = true;
			return;
		}

		if (this.installMode === 'manual') {
			this.showInstallPrompt = true;
		}
	}

	dismissUpdate() {
		this.updateAvailable = false;
		this.dismissedWaitingWorker = this.waitingWorker;

		if (!browser) {
			return;
		}

		localStorage.setItem(DISMISSED_VERSION_KEY, this.currentVersion);
		localStorage.setItem(DISMISSED_COMMIT_HASH_KEY, this.currentCommitHash);
		if (this.waitingWorkerVersion) {
			localStorage.setItem(DISMISSED_WORKER_KEY, this.waitingWorkerVersion);
		}
	}

	reloadForUpdate() {
		if (this.isReloading) {
			return;
		}

		this.isReloading = true;
		this.updateAvailable = false;
		console.info('[PWA] Update accepted', {
			fromVersion: this.lastVersion,
			fromCommitHash: this.lastCommitHash,
			toVersion: this.currentVersion,
			toCommitHash: this.currentCommitHash,
			hasWaitingWorker: Boolean(this.waitingWorker)
		});

		if (this.waitingWorker) {
			this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
			return;
		}

		window.location.reload();
	}

	private syncStandaloneState() {
		const displayModeStandalone =
			window.matchMedia?.('(display-mode: standalone)').matches ?? false;
		const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
		this.isStandalone = Boolean(displayModeStandalone || iosStandalone);
	}

	private syncInstallAvailability() {
		if (this.isStandalone) {
			this.canInstall = false;
			this.installMode = null;
			this.showInstallPrompt = false;
			return;
		}

		if (isIosDevice()) {
			this.canInstall = true;
			this.installMode = 'manual';
			this.showInstallPrompt = !this.installDismissed;
		}
	}

	private syncBuildMetadata() {
		const storedVersion = localStorage.getItem(LAST_VERSION_KEY);
		const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
		const storedCommitHash = localStorage.getItem(LAST_COMMIT_HASH_KEY);
		const dismissedCommitHash = localStorage.getItem(DISMISSED_COMMIT_HASH_KEY);

		this.lastVersion = storedVersion;
		this.lastCommitHash = storedCommitHash;

		const versionMismatch =
			storedVersion !== null &&
			storedVersion !== this.currentVersion &&
			dismissedVersion !== this.currentVersion;
		const commitHashMismatch =
			storedCommitHash !== null &&
			storedCommitHash !== this.currentCommitHash &&
			dismissedCommitHash !== this.currentCommitHash;

		if (versionMismatch || commitHashMismatch) {
			this.updateAvailable = true;
			console.info('[PWA] Build metadata mismatch detected', {
				stored: { version: storedVersion, commitHash: storedCommitHash },
				current: { version: this.currentVersion, commitHash: this.currentCommitHash }
			});
		}

		if (storedVersion !== this.currentVersion) {
			localStorage.setItem(LAST_VERSION_KEY, this.currentVersion);
		}
		if (storedCommitHash !== this.currentCommitHash) {
			localStorage.setItem(LAST_COMMIT_HASH_KEY, this.currentCommitHash);
		}
	}

	private getWorkerVersion(worker: ServiceWorker): Promise<string> {
		// Older workers do not answer this message. Use the page's build ID as a fallback.
		return new Promise((resolve) => {
			const channel = new MessageChannel();
			const finish = (value: string) => {
				clearTimeout(timeout);
				channel.port1.close();
				channel.port2.close();
				resolve(value);
			};
			const timeout = setTimeout(() => finish(buildVersion), 1000);
			channel.port1.onmessage = (event) => {
				const value = event.data?.version;
				finish(typeof value === 'string' && value ? value : buildVersion);
			};
			try {
				worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
			} catch {
				finish(buildVersion);
			}
		});
	}

	private async setWaitingWorker(worker: ServiceWorker) {
		if (this.waitingWorker !== worker) this.waitingWorkerVersion = null;
		this.waitingWorker = worker;
		const version = await this.getWorkerVersion(worker);
		if (!this.initialized || this.waitingWorker !== worker || this.isReloading) return;
		this.waitingWorkerVersion = version;
		if (this.dismissedWaitingWorker === worker) {
			localStorage.setItem(DISMISSED_WORKER_KEY, version);
		}
		this.updateAvailable = localStorage.getItem(DISMISSED_WORKER_KEY) !== version;
	}

	private async registerServiceWorker() {
		if (!('serviceWorker' in navigator)) {
			return;
		}

		if (dev && env.PUBLIC_ENABLE_DEV_PWA !== 'true') {
			return;
		}

		try {
			const registration = await navigator.serviceWorker.register('/service-worker.js', {
				type: dev ? 'module' : 'classic'
			});
			if (!this.initialized) return;

			const workerListeners: (() => void)[] = [];
			const onUpdateFound = () => {
				const worker = registration.installing;
				if (!worker) {
					return;
				}

				const onStateChange = () => {
					if (worker.state === 'installed' && navigator.serviceWorker.controller) {
						void this.setWaitingWorker(registration.waiting ?? worker);
					}
				};
				worker.addEventListener('statechange', onStateChange);
				workerListeners.push(() => worker.removeEventListener('statechange', onStateChange));
			};
			registration.addEventListener('updatefound', onUpdateFound);

			const onControllerChange = () => {
				if (this.isReloading) {
					window.location.reload();
				}
			};
			navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
			this.workerCleanup = () => {
				registration.removeEventListener('updatefound', onUpdateFound);
				navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
				for (const cleanup of workerListeners) cleanup();
			};

			if (registration.waiting) {
				await this.setWaitingWorker(registration.waiting);
			}
			if (!this.initialized) return;
			await registration.update();
		} catch (error) {
			console.error('[PWA] Service worker registration failed', error);
		}
	}
}

export const pwa = new PwaState();
