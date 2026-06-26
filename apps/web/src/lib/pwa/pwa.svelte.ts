import { browser, dev } from '$app/environment';
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

	init() {
		if (!browser || this.initialized) {
			return;
		}

		this.initialized = true;
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
			this.showInstallPrompt = true;
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
		return outcome === 'accepted';
	}

	dismissInstallPrompt() {
		this.installPromptEvent = null;
		if (this.installMode !== 'manual') {
			this.canInstall = false;
			this.installMode = null;
		}
		this.showInstallPrompt = false;
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

		if (!browser) {
			return;
		}

		localStorage.setItem(DISMISSED_VERSION_KEY, this.currentVersion);
		localStorage.setItem(DISMISSED_COMMIT_HASH_KEY, this.currentCommitHash);
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
			this.showInstallPrompt = true;
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

			if (registration.waiting) {
				this.waitingWorker = registration.waiting;
				this.updateAvailable = true;
			}

			registration.addEventListener('updatefound', () => {
				const worker = registration.installing;
				if (!worker) {
					return;
				}

				worker.addEventListener('statechange', () => {
					if (worker.state === 'installed' && navigator.serviceWorker.controller) {
						this.waitingWorker = registration.waiting ?? worker;
						this.updateAvailable = true;
					}
				});
			});

			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (this.isReloading) {
					window.location.reload();
				}
			});

			await registration.update();
		} catch (error) {
			console.error('[PWA] Service worker registration failed', error);
		}
	}
}

export const pwa = new PwaState();
