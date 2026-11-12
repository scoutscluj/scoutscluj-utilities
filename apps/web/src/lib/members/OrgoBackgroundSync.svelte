<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { RefreshCw, CircleAlert } from '@lucide/svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	let { open = $bindable(false) }: { open?: boolean } = $props();
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

<button
	class="sync-indicator"
	class:failed={syncState === 'failed'}
	class:idle={syncState !== 'running' && syncState !== 'failed'}
	aria-label={syncState === 'running'
		? 'Actualizări Orgo: în curs'
		: syncState === 'failed'
			? 'Actualizări Orgo: necesită atenție'
			: 'Actualizări Orgo'}
	title="Actualizări Orgo"
	onclick={() => (open = true)}
>
	{#if syncState === 'failed'}<CircleAlert size={18} aria-hidden="true" />{:else}<RefreshCw
			size={17}
			class={syncState === 'running' ? 'spinning' : ''}
			aria-hidden="true"
		/>{/if}
</button>
<span class="sc-sr-only" aria-live="polite"
	>{syncState === 'running'
		? 'Se actualizează datele din Orgo.'
		: syncState === 'failed'
			? message
			: ''}</span
>
<Modal
	bind:open
	title="Actualizări Orgo"
	description="Datele se actualizează în fundal; poți continua lucrul."
>
	<div class="sync-details">
		<p>
			{syncState === 'running'
				? 'Se actualizează datele din Orgo…'
				: syncState === 'failed'
					? message
					: lastSucceededAt
						? 'Datele din Orgo sunt actualizate.'
						: 'Starea actualizării Orgo este disponibilă la conectare.'}
		</p>
		{#if lastSucceededAt}<p class="last-sync">
				Ultima actualizare: {new Intl.DateTimeFormat('ro-RO', {
					dateStyle: 'medium',
					timeStyle: 'short',
					timeZone: 'Europe/Bucharest'
				}).format(new Date(lastSucceededAt))}
			</p>{/if}
		{#if syncState === 'failed'}<button
				class="retry sc-primary-button"
				disabled={retrying}
				onclick={retry}>{retrying ? 'Se reîncearcă…' : 'Reîncearcă actualizarea'}</button
			>{/if}
	</div>
</Modal>

<style>
	.sync-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--sc-muted);
		cursor: pointer;
	}
	.sync-indicator:hover {
		background: var(--sc-inset);
		color: var(--sc-ink);
	}
	.sync-indicator.failed {
		color: var(--sc-warning);
		background: var(--sc-warning-soft);
	}
	.sync-details {
		display: grid;
		gap: 12px;
	}
	p {
		margin: 0;
		line-height: 1.6;
	}
	.last-sync {
		color: var(--sc-muted);
		font-size: 13px;
	}
	.retry {
		min-height: 44px;
		padding: 8px 14px;
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		color: var(--sc-on-accent);
		background: var(--sc-accent);
		cursor: pointer;
	}
	:global(.sync-indicator .spinning) {
		animation: sync-turn 2s linear infinite;
	}
	@keyframes sync-turn {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 360px) {
		.sync-indicator.idle {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.sync-indicator .spinning) {
			animation: none;
		}
	}
</style>
