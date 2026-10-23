<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Bell from '@lucide/svelte/icons/bell';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
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

<article aria-labelledby="notification-summary-title">
	<Bell size={22} aria-hidden="true" />
	<h2 id="notification-summary-title">Notificări</h2>
	<div class="summary" aria-live="polite">
		{#if loading}
			<p>Se încarcă statusul…</p>
		{:else if failed}
			<p role="alert">Statusul notificărilor nu este disponibil.</p>
		{:else}
			<p class="device-state">
				{!supported
					? 'Push nesuportat în acest browser'
					: permission === 'denied'
						? 'Permisiune refuzată în browser'
						: !status?.configured
							? 'Notificările nu sunt configurate'
							: status?.currentDeviceSubscribed
								? 'Active pe acest dispozitiv'
								: 'Inactive pe acest dispozitiv'}
			</p>
			<p>
				{status?.activeDeviceCount === 1
					? '1 dispozitiv activ'
					: `${status?.activeDeviceCount ?? 0} dispozitive active`}
			</p>
		{/if}
	</div>
	<a href={resolve('/profile/notifications')}
		>Setări notificări <ArrowRight size={16} aria-hidden="true" /></a
	>
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		border: 1px solid var(--sc-border);
		border-radius: var(--sc-radius);
		background: var(--sc-surface);
		padding: 20px;
	}
	h2 {
		margin: 12px 0 0;
		font-size: 18px;
		font-weight: 600;
	}
	.summary {
		margin: 12px 0 20px;
		color: var(--sc-muted);
		font-size: 14px;
		line-height: 1.5;
	}
	p {
		margin: 0 0 6px;
	}
	.device-state {
		color: var(--sc-ink);
	}
	a {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: auto;
		min-height: 38px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		color: var(--sc-ink);
		font-size: 14px;
		text-decoration: none;
	}
	a:hover {
		border-color: var(--sc-accent);
		color: var(--sc-accent);
	}
</style>
