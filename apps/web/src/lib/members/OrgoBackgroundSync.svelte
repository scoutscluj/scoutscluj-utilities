<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	let syncState = $state('idle');
	let message = $state('');
	let lastSucceededAt = $state<string | null>(null);
	let retrying = $state(false);
	async function update(method: 'GET' | 'POST', signal?: AbortSignal) {
		const response = await fetch(resolve('/orgo-sync'), { method, signal });
		if (!response.ok) throw new Error('Actualizarea Orgo nu este disponibilă.');
		const data = await response.json();
		syncState = data.state;
		message = data.message ?? '';
		lastSucceededAt = data.lastSucceededAt;
	}
	async function retry() {
		retrying = true;
		try {
			await update('POST');
		} catch {
			syncState = 'failed';
			message = 'Actualizarea Orgo nu este disponibilă.';
		} finally {
			retrying = false;
		}
	}
	onMount(() => {
		const controller = new AbortController();
		void update('POST', controller.signal).catch(() => {
			if (!controller.signal.aborted) {
				syncState = 'failed';
				message = 'Actualizarea Orgo nu este disponibilă.';
			}
		});
		const timer = setInterval(() => {
			if (syncState === 'running') void update('GET', controller.signal).catch(() => undefined);
		}, 5000);
		return () => {
			controller.abort();
			clearInterval(timer);
		};
	});
</script>

{#if syncState === 'running' || syncState === 'failed'}
	<aside class="sync-status" aria-live="polite">
		<span>{syncState === 'running' ? 'Se actualizează datele din Orgo…' : message}</span>
		{#if lastSucceededAt}<small
				>Ultima actualizare: {new Date(lastSucceededAt).toLocaleString('ro-RO')}</small
			>{/if}
		{#if syncState === 'failed'}<button type="button" disabled={retrying} onclick={retry}
				>Reîncearcă</button
			>{/if}
	</aside>
{/if}

<style>
	.sync-status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		padding: 8px 16px;
		background: var(--sc-surface);
		border-bottom: 1px solid var(--sc-border);
		color: var(--sc-muted);
		font-size: 0.8rem;
	}
	small {
		font-size: inherit;
	}
	button {
		min-height: 36px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 4px 12px;
		cursor: pointer;
	}
</style>
