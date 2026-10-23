<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { resolve } from '$app/paths';
	import {
		getDeviceInfo,
		getOrCreateDeviceId,
		isWebPushSupported,
		notificationApiFetch,
		readApiMessage,
		urlBase64ToUint8Array,
		type NotificationActionResult,
		type NotificationDeliverySummary,
		type NotificationStatus
	} from '$lib/notifications/notifications';

	let notificationSupported = $state(false);
	let notificationPermission = $state<NotificationPermission>('default');
	let notificationStatus = $state<NotificationStatus>({
		configured: false,
		activeDeviceCount: 0,
		currentDeviceSubscribed: false
	});
	let notificationLoading = $state(true);
	let notificationBusy = $state(false);
	let notificationError = $state('');

	const loadNotificationStatus = async () => {
		if (!notificationSupported) {
			notificationLoading = false;
			return;
		}

		notificationLoading = true;
		notificationError = '';
		try {
			const deviceId = getOrCreateDeviceId();
			const response = await notificationApiFetch(
				`/api/notifications/me?deviceId=${encodeURIComponent(deviceId)}`
			);
			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			notificationStatus = (await response.json()) as NotificationStatus;
		} catch (error) {
			notificationError =
				error instanceof Error ? error.message : 'Statusul notificărilor nu a putut fi citit.';
		} finally {
			notificationLoading = false;
		}
	};

	const getServiceWorkerRegistration = async () => {
		const existing = await navigator.serviceWorker.getRegistration('/');
		if (existing) {
			return existing;
		}

		return navigator.serviceWorker.register('/service-worker.js');
	};

	const enableNotifications = async () => {
		if (!notificationSupported) {
			toast.error('Browserul nu suportă notificări push.');
			return;
		}

		if (!notificationStatus.configured || !notificationStatus.publicKey) {
			toast.error('Notificările nu sunt configurate pe server.');
			return;
		}

		notificationBusy = true;
		try {
			if (Notification.permission === 'default') {
				notificationPermission = await Notification.requestPermission();
			} else {
				notificationPermission = Notification.permission;
			}

			if (notificationPermission !== 'granted') {
				toast.error('Permisiunea pentru notificări nu a fost acordată.');
				return;
			}

			const registration = await getServiceWorkerRegistration();
			let subscription = await registration.pushManager.getSubscription();
			if (!subscription) {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(notificationStatus.publicKey)
				});
			}

			const response = await notificationApiFetch('/api/notifications/subscribe', {
				method: 'POST',
				body: JSON.stringify({
					deviceId: getOrCreateDeviceId(),
					subscription: subscription.toJSON(),
					platform: navigator.platform,
					userAgent: navigator.userAgent,
					deviceInfo: getDeviceInfo()
				})
			});

			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			const result = (await response.json()) as NotificationActionResult;
			notificationStatus = {
				...notificationStatus,
				activeDeviceCount: result.activeDeviceCount ?? notificationStatus.activeDeviceCount,
				currentDeviceSubscribed:
					result.currentDeviceSubscribed ?? notificationStatus.currentDeviceSubscribed
			};
			toast.success(result.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Notificările nu au putut fi activate.');
		} finally {
			notificationBusy = false;
		}
	};

	const disableThisDevice = async () => {
		notificationBusy = true;
		try {
			const registration = await navigator.serviceWorker.getRegistration('/');
			const subscription = await registration?.pushManager.getSubscription();
			await subscription?.unsubscribe();

			const response = await notificationApiFetch(
				`/api/notifications/subscriptions/${encodeURIComponent(getOrCreateDeviceId())}`,
				{ method: 'DELETE' }
			);
			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			const result = (await response.json()) as NotificationActionResult;
			notificationStatus = {
				...notificationStatus,
				activeDeviceCount: result.activeDeviceCount ?? 0,
				currentDeviceSubscribed: false
			};
			toast.success(result.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Dezabonarea nu a reușit.');
		} finally {
			notificationBusy = false;
		}
	};

	const disableAllDevices = async () => {
		notificationBusy = true;
		try {
			const response = await notificationApiFetch('/api/notifications/subscriptions', {
				method: 'DELETE'
			});
			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			const result = (await response.json()) as NotificationActionResult;
			notificationStatus = {
				...notificationStatus,
				activeDeviceCount: result.activeDeviceCount ?? 0,
				currentDeviceSubscribed: false
			};
			toast.success(result.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Dezabonarea nu a reușit.');
		} finally {
			notificationBusy = false;
		}
	};

	const sendTestNotification = async () => {
		notificationBusy = true;
		try {
			const response = await notificationApiFetch('/api/notifications/test', {
				method: 'POST',
				body: JSON.stringify({ deviceId: getOrCreateDeviceId() })
			});
			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			const result = (await response.json()) as NotificationDeliverySummary;
			toast.success(
				`Test procesat: ${result.successCount} trimise, ${result.failureCount} eșuate.`
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Testul nu a putut fi trimis.');
		} finally {
			notificationBusy = false;
		}
	};

	onMount(() => {
		notificationSupported = isWebPushSupported();
		notificationPermission = notificationSupported ? Notification.permission : 'denied';
		void loadNotificationStatus();
	});
</script>

<svelte:head><title>Notificări | Scouts Cluj Utilities</title></svelte:head>

<a class="back-link" href={resolve('/profile')}>← Înapoi la profil</a>
<header>
	<h1>Setări notificări</h1>
	<p>Alege pe ce dispozitive primești notificări.</p>
</header>
<article class="settings-card">
	<h2>Notificări push</h2>
	<dl class="notification-status">
		<div>
			<dt>Permisiune browser</dt>
			<dd>
				{notificationSupported
					? { default: 'Neacordată', granted: 'Acordată', denied: 'Refuzată' }[
							notificationPermission
						]
					: 'Nesuportat'}
			</dd>
		</div>
		<div>
			<dt>Acest dispozitiv</dt>
			<dd>
				{notificationLoading
					? '…'
					: notificationError
						? 'Indisponibil'
						: notificationStatus.currentDeviceSubscribed
							? 'Abonat'
							: 'Neabonat'}
			</dd>
		</div>
		<div>
			<dt>Dispozitive active</dt>
			<dd>
				{notificationLoading
					? '…'
					: notificationError
						? 'Indisponibil'
						: notificationStatus.activeDeviceCount}
			</dd>
		</div>
	</dl>

	{#if notificationError}
		<p role="alert" class="notice warning">{notificationError}</p>
		<button type="button" class="retry" onclick={loadNotificationStatus}>Reîncearcă</button>
	{:else if notificationLoading}
		<p class="notice" role="status">Se încarcă setările…</p>
	{:else if !notificationSupported}
		<p class="notice warning">Browserul nu suportă notificări push.</p>
	{:else if notificationPermission === 'denied'}
		<p class="notice warning">
			Permisiunea a fost refuzată. Activează notificările din setările browserului sau ale
			sistemului de operare.
		</p>
	{:else if !notificationStatus.configured}
		<p class="notice warning">Notificările nu sunt configurate încă pe server.</p>
	{:else}
		<p class="notice">
			Trebuie să activezi notificările din nou în aplicația nouă. Abonările vechi nu sunt importate.
		</p>
	{/if}

	<div class="notification-actions">
		<button
			type="button"
			onclick={enableNotifications}
			disabled={notificationBusy ||
				notificationLoading ||
				!notificationStatus.configured ||
				!!notificationError ||
				!notificationSupported ||
				notificationPermission === 'denied'}
		>
			Activează notificările
		</button>
		<button
			type="button"
			class="secondary-button"
			onclick={sendTestNotification}
			disabled={notificationBusy || !notificationStatus.currentDeviceSubscribed}
		>
			Trimite test
		</button>
		<button
			type="button"
			class="secondary-button"
			onclick={disableThisDevice}
			disabled={notificationBusy || !notificationStatus.currentDeviceSubscribed}
		>
			Dezactivează acest dispozitiv
		</button>
		<button
			type="button"
			class="secondary-button"
			onclick={disableAllDevices}
			disabled={notificationBusy || notificationStatus.activeDeviceCount === 0}
		>
			Dezactivează toate
		</button>
	</div>
</article>

<style>
	.back-link {
		color: var(--sc-muted);
		text-decoration: none;
	}
	header {
		margin: 20px 0 24px;
	}
	h1 {
		margin: 0;
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	header p {
		color: var(--sc-muted);
		margin: 8px 0 0;
	}
	.settings-card {
		max-width: 720px;
		padding: 24px;
		border: 1px solid var(--sc-border);
		border-radius: var(--sc-radius);
		background: var(--sc-surface);
	}
	h2 {
		margin: 0 0 20px;
		font-size: 18px;
		font-weight: 600;
	}
	dl {
		display: grid;
		gap: 12px;
		margin: 0;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--sc-border);
	}
	dt,
	.notice {
		color: var(--sc-muted);
	}
	dd {
		margin: 0;
		text-align: right;
		font-weight: 500;
	}
	.notice {
		line-height: 1.6;
		margin: 16px 0 0;
	}
	.warning {
		color: #991b1b;
	}
	.notification-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
	}
	button {
		min-height: 38px;
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		padding: 8px 12px;
		background: var(--sc-accent);
		color: white;
		font: inherit;
		font-size: 14px;
		cursor: pointer;
	}
	.secondary-button,
	.retry {
		background: var(--sc-surface);
		border-color: var(--sc-border-strong);
		color: var(--sc-ink);
	}
	.retry {
		margin-top: 12px;
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	@media (max-width: 600px) {
		.settings-card {
			padding: 18px;
		}
		.notification-actions {
			flex-direction: column;
		}
	}
</style>
