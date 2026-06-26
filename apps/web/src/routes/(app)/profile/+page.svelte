<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { formatRole } from '$lib/auth/roles';
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

	let { data } = $props();

	const user = $derived(data.user);
	const connection = $derived(user.orgoConnection);
	const roles = $derived(user.roles);
	let notificationSupported = $state(false);
	let notificationPermission = $state<NotificationPermission>('default');
	let notificationStatus = $state<NotificationStatus>({
		configured: false,
		activeDeviceCount: 0,
		currentDeviceSubscribed: false
	});
	let notificationLoading = $state(true);
	let notificationBusy = $state(false);

	const loadNotificationStatus = async () => {
		if (!notificationSupported) {
			notificationLoading = false;
			return;
		}

		notificationLoading = true;
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
			toast.error(
				error instanceof Error ? error.message : 'Statusul notificărilor nu a putut fi citit.'
			);
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

<svelte:head>
	<title>Profil | Scouts Cluj Utilities</title>
</svelte:head>

<section class="profile-header">
	<div class="avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
	<div>
		<p class="eyebrow">Profil</p>
		<h1>{user.displayName}</h1>
		<p>{user.email ?? 'Email indisponibil'}</p>
	</div>
</section>

<section class="profile-grid" aria-label="Detalii profil">
	<article>
		<h2>Roluri</h2>
		{#if roles.length}
			<div class="chips">
				{#each roles as role (role)}
					<span>{formatRole(role)}</span>
				{/each}
			</div>
		{:else}
			<p>Membru autentificat fara rol administrativ.</p>
		{/if}
	</article>

	<article>
		<h2>Conexiune Orgo</h2>
		<dl>
			<div>
				<dt>Status</dt>
				<dd>Conectat</dd>
			</div>
			<div>
				<dt>Card ID</dt>
				<dd>{connection?.cardId ?? '-'}</dd>
			</div>
			<div>
				<dt>Orgo ID</dt>
				<dd>{connection?.orgoUserId ?? '-'}</dd>
			</div>
			<div>
				<dt>Ultimul login</dt>
				<dd>{connection?.lastLoginAt ?? '-'}</dd>
			</div>
		</dl>
	</article>

	<article>
		<h2>Notificări push</h2>
		<dl class="notification-status">
			<div>
				<dt>Permisiune browser</dt>
				<dd>{notificationSupported ? notificationPermission : 'nesuportat'}</dd>
			</div>
			<div>
				<dt>Acest dispozitiv</dt>
				<dd>{notificationStatus.currentDeviceSubscribed ? 'Abonat' : 'Neabonat'}</dd>
			</div>
			<div>
				<dt>Dispozitive active</dt>
				<dd>{notificationLoading ? '...' : notificationStatus.activeDeviceCount}</dd>
			</div>
		</dl>

		{#if !notificationSupported}
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
				Trebuie să activezi notificările din nou în aplicația nouă. Abonările vechi nu sunt
				importate.
			</p>
		{/if}

		<div class="notification-actions">
			<button
				type="button"
				onclick={enableNotifications}
				disabled={notificationBusy || !notificationSupported || notificationPermission === 'denied'}
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
</section>

<form method="POST" action="/auth/logout" class="logout-form">
	<button type="submit">Logout</button>
</form>

<style>
	.profile-header {
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.avatar {
		width: 64px;
		height: 64px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #c81e1e;
		color: #ffffff;
		font-size: 1.6rem;
		font-weight: 900;
	}

	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1,
	.profile-header p {
		margin: 0;
	}

	h1 {
		margin-top: 6px;
		font-size: 2rem;
	}

	.profile-header p:not(.eyebrow) {
		margin-top: 4px;
		color: #64748b;
	}

	.profile-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin-top: 28px;
	}

	article {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
	}

	h2 {
		margin: 0 0 14px;
		font-size: 1.05rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chips span {
		border-radius: 999px;
		background: #fef2f2;
		color: #991b1b;
		padding: 8px 12px;
		font-weight: 800;
	}

	dl,
	dd {
		margin: 0;
	}

	dl {
		display: grid;
		gap: 12px;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		border-bottom: 1px solid #edf1f5;
		padding-bottom: 10px;
	}

	dt {
		color: #64748b;
		font-weight: 750;
	}

	dd {
		font-weight: 850;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.logout-form {
		margin-top: 18px;
	}

	.logout-form button {
		min-height: 40px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 14px;
		color: #334155;
		font-weight: 800;
		cursor: pointer;
	}

	.notification-status {
		display: grid;
		gap: 12px;
	}

	.notification-status div {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		border-bottom: 1px solid #edf1f5;
		padding-bottom: 10px;
	}

	.notice {
		margin: 14px 0 0;
		color: #52616f;
	}

	.notice.warning {
		color: #991b1b;
	}

	.notification-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 16px;
	}

	.notification-actions button {
		min-height: 38px;
		border: 1px solid #c81e1e;
		border-radius: 8px;
		background: #c81e1e;
		padding: 0 12px;
		color: #ffffff;
		font-weight: 850;
		cursor: pointer;
	}

	.notification-actions .secondary-button {
		border-color: #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.notification-actions button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.logout-form button:hover {
		border-color: #991b1b;
		color: #991b1b;
	}

	@media (max-width: 760px) {
		.profile-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
