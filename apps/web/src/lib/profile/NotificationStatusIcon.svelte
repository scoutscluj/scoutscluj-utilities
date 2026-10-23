<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import Check from '@lucide/svelte/icons/check';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import {
		getOrCreateDeviceId,
		isWebPushSupported,
		notificationApiFetch,
		type NotificationStatus
	} from '$lib/notifications/notifications';
	let loading = $state(true);
	let failed = $state(false);
	let supported = $state(false);
	let status = $state<NotificationStatus | null>(null);
	let permission = $state<NotificationPermission>('default');
	const ready = $derived(
		!loading &&
			!failed &&
			supported &&
			permission === 'granted' &&
			Boolean(status?.configured && status.currentDeviceSubscribed)
	);
	const statusLabel = $derived(
		loading
			? 'Se încarcă statusul notificărilor'
			: failed
				? 'Statusul notificărilor nu este disponibil'
				: !supported
					? 'Push nesuportat în acest browser'
					: permission === 'denied'
						? 'Permisiune refuzată în browser'
						: !status?.configured
							? 'Notificările nu sunt configurate'
							: ready
								? 'Notificările sunt active pe acest dispozitiv'
								: 'Notificările sunt inactive pe acest dispozitiv'
	);
	onMount(() => {
		supported = isWebPushSupported();
		if (supported) permission = Notification.permission;
		const load = async () => {
			try {
				const deviceId = supported ? getOrCreateDeviceId() : undefined;
				const response = await notificationApiFetch(
					`/api/notifications/me${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''}`
				);
				if (!response.ok) throw new Error('Notification status unavailable');
				status = (await response.json()) as NotificationStatus;
			} catch {
				failed = true;
			} finally {
				loading = false;
			}
		};
		void load();
	});
</script>

<a
	class={['notification-icon', { ready }]}
	href={resolve('/profile/notifications')}
	aria-label={`Setări notificări: ${statusLabel}`}
	aria-busy={loading}
	title={statusLabel}
>
	{#if ready || loading || failed}
		<Bell size={21} aria-hidden="true" />
	{:else}
		<BellOff size={21} aria-hidden="true" />
	{/if}
	{#if ready}
		<span class="status-badge" aria-hidden="true"><Check size={10} strokeWidth={3} /></span>
	{:else if failed}
		<span class="unknown-badge" aria-hidden="true"><CircleHelp size={13} /></span>
	{/if}
</a>
<span class="status-message" role="status">{statusLabel}</span>

<style>
	.notification-icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-muted);
		text-decoration: none;
	}
	.notification-icon:hover {
		background: var(--sc-inset);
		color: var(--sc-ink);
	}
	.notification-icon:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.ready {
		color: var(--sc-ink);
	}
	.status-badge,
	.unknown-badge {
		position: absolute;
		right: 5px;
		bottom: 6px;
		display: grid;
		place-items: center;
		border: 2px solid var(--sc-surface);
		border-radius: 50%;
	}
	.status-badge {
		width: 15px;
		height: 15px;
		color: white;
		background: var(--sc-success);
	}
	.unknown-badge {
		color: var(--sc-muted);
		background: var(--sc-surface);
	}
	.status-message {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
