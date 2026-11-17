<script lang="ts">
	import { navigating } from '$app/state';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	let slow = $state(false);
	const destination = $derived(navigating.to?.url);
	$effect(() => {
		const target = destination;
		slow = false;
		if (!target) return;
		const timer = setTimeout(() => (slow = true), 8000);
		return () => clearTimeout(timer);
	});
</script>

{#if destination}
	<div class="navigation-bar" aria-hidden="true"></div>
	<div class="navigation-feedback" role="status" aria-label="Încărcarea paginii" aria-live="polite">
		<LoaderCircle size={18} class="navigation-spinner" aria-hidden="true" />
		<div>
			<p>{slow ? 'Încărcarea durează mai mult decât de obicei.' : 'Se încarcă pagina…'}</p>
			{#if slow}
				<button
					type="button"
					onclick={() => destination && window.location.assign(destination.href)}
					>Reîncearcă deschiderea</button
				>
			{/if}
		</div>
	</div>
{/if}

<style>
	.navigation-bar {
		position: fixed;
		inset: 0 0 auto;
		height: 3px;
		z-index: 100;
		background: var(--sc-accent-soft);
		overflow: hidden;
		pointer-events: none;
	}
	.navigation-bar::after {
		content: '';
		display: block;
		height: 100%;
		width: 40%;
		background: var(--sc-accent);
		animation: navigation-slide 1.4s ease-in-out infinite;
	}
	.navigation-feedback {
		position: fixed;
		top: 16px;
		right: 16px;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: calc(100vw - 32px);
		box-sizing: border-box;
		padding: 12px 16px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface-raised);
		color: var(--sc-ink);
		box-shadow: var(--sc-shadow);
		font-size: 14px;
		line-height: 1.5;
	}
	p {
		margin: 0;
	}
	:global(.navigation-spinner) {
		flex-shrink: 0;
		color: var(--sc-accent);
		animation: navigation-spin 1s linear infinite;
	}
	button {
		margin-top: 8px;
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-link);
		font: inherit;
		cursor: pointer;
	}
	button:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	@keyframes navigation-slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(350%);
		}
	}
	@keyframes navigation-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.navigation-bar::after,
		:global(.navigation-spinner) {
			animation: none;
		}
	}
</style>
