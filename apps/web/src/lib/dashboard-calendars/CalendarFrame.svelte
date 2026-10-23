<script lang="ts">
	import { flushSync, onMount, untrack, type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { localDay } from './calendar';
	let {
		now: initialNow,
		children
	}: {
		now: string;
		children: Snippet<[{ now: number; today: string; expire: () => void }]>;
	} = $props();
	let now = $state(untrack(() => Date.parse(initialNow)));
	let expired = $state(false);
	let suspended = $state(false);
	const currentDay = $derived(localDay(now));
	function expire() {
		expired = true;
		window.location.replace(resolve('/login'));
	}
	onMount(() => {
		const timer = setInterval(() => {
			now = Date.now();
		}, 60000);
		const hide = () => {
			flushSync(() => {
				suspended = true;
			});
		};
		const show = (event: PageTransitionEvent) => {
			if (event.persisted) window.location.reload();
			else suspended = false;
		};
		window.addEventListener('pagehide', hide);
		window.addEventListener('pageshow', show);
		return () => {
			clearInterval(timer);
			window.removeEventListener('pagehide', hide);
			window.removeEventListener('pageshow', show);
		};
	});
</script>

{#if expired}<p role="alert">Sesiunea a expirat. Se deschide pagina de autentificare…</p>
{:else if !suspended}
	<div class="calendars">{@render children({ now, today: currentDay, expire })}</div>
{/if}

<style>
	.calendars :global(.calendar-widget) {
		min-width: 0;
		border: 1px solid var(--sc-border);
		border-radius: 14px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		overflow: hidden;
		box-shadow: 0 2px 4px #10182803;
	}
	.calendars :global(.widget-header) {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		border-bottom: 1px solid var(--sc-border);
	}
	.calendars :global(.widget-title) {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.calendars :global(.widget-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		flex-shrink: 0;
		border-radius: 10px;
	}
	.calendars :global(.events-icon) {
		background: var(--sc-accent-soft);
		color: var(--sc-accent);
	}
	.calendars :global(.headquarters-icon) {
		background: #eaf5f0;
		color: #0f766e;
	}
	.calendars :global(h2) {
		font-size: 1rem;
		line-height: 1.4;
		letter-spacing: -0.015em;
		margin: 0;
		font-weight: 650;
	}
	.calendars :global(.count-badge) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 24px;
		padding: 0 6px;
		background: #f2f4f7;
		color: #475467;
		border-radius: 7px;
		font-size: 0.72rem;
		font-weight: 600;
	}
	.calendars :global(.calendar-link) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		font-size: 0.72rem;
		color: #667085;
		text-decoration: none;
		transition: color 160ms ease;
		white-space: nowrap;
	}
	.calendars :global(.calendar-link:hover) {
		color: var(--sc-accent);
	}
	.calendars :global(.calendar-body) {
		padding: 14px 16px;
	}
	.calendars :global(.timeline-day) {
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr);
		align-items: start;
		column-gap: 10px;
	}
	.calendars :global(.day-content) {
		min-width: 0;
	}
	.calendars :global(:where(h3)) {
		display: flex;
		align-items: center;
		margin: 3px 0 10px;
		color: #475467;
		font-size: 0.78rem;
		font-weight: 650;
	}
	.calendars :global(h3::first-letter) {
		text-transform: uppercase;
	}
	.calendars :global(.day-year) {
		margin-left: auto;
		color: #667085;
		font-size: 0.68rem;
		font-weight: 400;
	}
	.calendars :global(.bookings) {
		container-type: inline-size;
		container-name: bookings;
		display: grid;
		gap: 5px;
	}
	.calendars :global(:where(button)) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-height: 44px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: #fff;
		color: #344054;
		padding: 8px 12px;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		transition:
			background 160ms ease,
			border-color 160ms ease;
	}
	.calendars :global(button:hover:not(:disabled)) {
		background: #f5f7f9;
		border-color: #cbd3dc;
	}
	.calendars :global(button:disabled) {
		cursor: wait;
		opacity: 0.65;
	}
	.calendars :global(.load-more) {
		width: 100%;
		font-weight: 600;
		color: #46556a;
	}
	.calendars :global(.notice) {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 0.78rem;
		line-height: 1.65;
		background: #fff8e9;
		color: #795817;
		border: 1px solid #ead8af;
		padding: 11px 12px;
		border-radius: 8px;
		margin: 0 0 18px;
	}
	.calendars :global(.notice > svg) {
		margin-top: 3px;
		flex-shrink: 0;
	}
	.calendars :global(.notice-action) {
		display: flex;
		border: 0;
		min-height: 44px;
		margin-top: 2px;
		background: transparent;
		color: inherit;
		padding: 5px 0;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.calendars :global(.error) {
		background: #fff1ef;
		color: #96392f;
		border-color: #edc9c3;
	}
	.calendars :global(.progress) {
		color: #667085;
		font-size: 0.73rem;
		line-height: 1.6;
		margin: 10px 0 0;
	}
	.calendars :global(.sr-only) {
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
	.calendars :global(button:focus-visible),
	.calendars :global(a:focus-visible) {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	@media (max-width: 480px) {
		.calendars :global(.widget-header),
		.calendars :global(.calendar-body) {
			padding: 12px;
		}
		.calendars :global(.calendar-link) {
			width: 44px;
			justify-content: center;
			flex-shrink: 0;
		}
		.calendars :global(.calendar-link span) {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.calendars :global(.widget-title) {
			gap: 8px;
		}
		.calendars :global(.widget-icon) {
			width: 32px;
			height: 32px;
			border-radius: 8px;
		}
		.calendars :global(h2) {
			font-size: 0.91rem;
		}
		.calendars :global(.timeline-day) {
			grid-template-columns: 44px minmax(0, 1fr);
			column-gap: 9px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.calendars :global(button),
		.calendars :global(.calendar-link) {
			transition: none;
		}
	}
</style>
