<script lang="ts">
	import { flushSync, onMount, untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import HeadquartersCalendar from './HeadquartersCalendar.svelte';
	import UpcomingAgenda from './UpcomingAgenda.svelte';
	import { localDay, type CalendarResult, type Range } from './calendar';
	let {
		events,
		headquarters,
		eventsRange,
		now: initialNow
	}: {
		events: CalendarResult;
		headquarters: CalendarResult;
		eventsRange: Range;
		now: string;
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
	<details class="calendars" open>
		<summary>Calendare</summary>
		<div class="calendar-grid">
			<UpcomingAgenda
				initial={events}
				initialRange={eventsRange}
				{now}
				{expire}
			/><HeadquartersCalendar initial={headquarters} today={currentDay} {expire} />
		</div>
	</details>
{/if}

<style>
	.calendars > summary {
		cursor: pointer;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 14px 16px;
		min-height: 48px;
		font-weight: 650;
	}
	.calendar-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		margin-top: 18px;
		align-items: start;
	}
	.calendars :global(.calendar-widget) {
		min-width: 0;
		border: 1px solid var(--sc-border);
		border-radius: 12px;
		background: var(--sc-surface);
		overflow: hidden;
		color: var(--sc-ink);
	}
	.calendars :global(header) {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		align-items: center;
		justify-content: space-between;
		padding: 18px 20px;
		border-bottom: 1px solid var(--sc-border);
	}
	.calendars :global(h2) {
		font-size: 1.05rem;
		line-height: 1.4;
		margin: 3px 0 0;
	}
	.calendars :global(.eyebrow) {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--sc-muted);
		margin: 0;
	}
	.calendars :global(header a) {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--sc-accent);
		font-size: 0.8rem;
		text-underline-offset: 4px;
	}
	.calendars :global(.calendar-body) {
		padding: 18px 20px;
	}
	.calendars :global(.agenda-day) {
		margin-bottom: 20px;
	}
	.calendars :global(h3) {
		font-size: 0.8rem;
		font-weight: 650;
		margin: 0 0 10px;
		text-transform: capitalize;
	}
	.calendars :global(.bookings) {
		display: grid;
		gap: 8px;
	}
	.calendars :global(.range),
	.calendars :global(.progress) {
		color: var(--sc-muted);
		font-size: 0.75rem;
		line-height: 1.6;
		margin: 0 0 18px;
	}
	.calendars :global(.progress) {
		margin: 10px 0 0;
	}
	.calendars :global(.empty) {
		color: var(--sc-muted);
		font-size: 0.85rem;
		padding: 12px 0;
		margin: 0;
		line-height: 1.6;
	}
	.calendars :global(button) {
		min-height: 44px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 8px 12px;
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.calendars :global(button:hover:not(:disabled)) {
		background: var(--sc-canvas);
	}
	.calendars :global(button:disabled) {
		cursor: wait;
		opacity: 0.65;
	}
	.calendars :global(.load-more) {
		width: 100%;
		margin-top: 12px;
		color: var(--sc-accent);
		font-weight: 650;
	}
	.calendars :global(.notice) {
		font-size: 0.85rem;
		line-height: 1.6;
		background: #fff7e6;
		color: #795817;
		border: 1px solid #e7d7ad;
		padding: 12px;
		border-radius: 8px;
	}
	.calendars :global(.error) {
		background: #fff1ef;
		color: #96392f;
		border-color: #edc9c3;
	}
	.calendars > summary:focus-visible,
	.calendars :global(button:focus-visible),
	.calendars :global(a:focus-visible) {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	@media (min-width: 1100px) {
		.calendar-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
		}
	}
	@media (max-width: 480px) {
		.calendars :global(header),
		.calendars :global(.calendar-body) {
			padding: 14px;
		}
	}
</style>
