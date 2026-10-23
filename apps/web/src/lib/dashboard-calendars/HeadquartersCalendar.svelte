<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import EventCard from './EventCard.svelte';
	import DateBadge from './DateBadge.svelte';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import List from '@lucide/svelte/icons/list';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { fetchCalendar } from './client';
	import {
		addDays,
		pageMetadata,
		dayLabel,
		daysRange,
		localDay,
		moveMonth,
		overlapsDay,
		periodLabel,
		sorted,
		visibleDays,
		type CalendarResult
	} from './calendar';
	let {
		initial,
		today,
		now,
		expire
	}: { initial: CalendarResult; today: string; now: number; expire: () => void } = $props();
	let result = $state(untrack(() => initial));
	let selected = $state(untrack(() => today));
	let anchor = $state(untrack(() => today));
	let view = $state<'week' | 'month'>('week');
	let items = $state(untrack(() => initial.page?.items ?? []));
	let busy = $state(false);
	let requestId = 0;
	const days = $derived(visibleDays(anchor, view));
	const period = $derived(
		view === 'week'
			? periodLabel(days[0], days[6])
			: new Intl.DateTimeFormat('ro-RO', {
					month: 'long',
					year: 'numeric',
					timeZone: 'UTC'
				}).format(new Date(`${anchor}T12:00Z`))
	);
	const bookings = (day: string) => sorted(items.filter((event) => overlapsDay(event, day)));
	async function load(date = anchor, nextView = view, append = false) {
		const id = ++requestId;
		const cursor = append ? result.page?.nextCursor : undefined;
		anchor = date;
		if (!append) selected = date;
		view = nextView;
		busy = true;
		if (!append) {
			items = [];
			result = { page: null, error: null };
		}
		const next = await fetchCalendar(
			'headquarters',
			daysRange(visibleDays(date, nextView)),
			expire,
			cursor
		);
		if (id !== requestId) return;
		if (next.page) {
			items = sorted([...items, ...next.page.items]);
			result = { ...next, page: pageMetadata(result.page, next.page) };
		} else result = { ...result, error: next.error };
		busy = false;
	}
	function move(step: number) {
		void load(view === 'week' ? addDays(anchor, step * 7) : moveMonth(anchor, step));
	}
</script>

<section
	class="calendar-widget headquarters-widget"
	aria-labelledby="headquarters-heading"
	aria-busy={busy}
>
	<header class="widget-header">
		<div class="widget-title">
			<span class="widget-icon headquarters-icon"><Building2 size={21} aria-hidden="true" /></span>
			<h2 id="headquarters-heading">Calendar Sediu</h2>
			{#if result.page}<span class="count-badge" aria-label={`${items.length} rezervări`}
					>{items.length}{result.page.nextCursor ? '+' : ''}</span
				>{/if}
		</div>
		<a href={resolve('/sediu/orar')} class="calendar-link" title="Calendarul complet al sediului"
			><span>Calendar complet</span><ExternalLink size={14} aria-hidden="true" /></a
		>
	</header>
	<div class="calendar-body">
		<div class="calendar-toolbar">
			<div class="view-switch" role="group" aria-label="Vizualizare sediu">
				<button
					aria-pressed={view === 'week'}
					disabled={busy}
					onclick={() => load(selected, 'week')}
					><List size={15} aria-hidden="true" />Săptămână</button
				><button
					aria-pressed={view === 'month'}
					disabled={busy}
					onclick={() => load(selected, 'month')}
					><CalendarDays size={15} aria-hidden="true" />Lună</button
				>
			</div>
			<p class="period" aria-live="polite" aria-atomic="true">{period}</p>
			<div class="period-controls">
				<button
					class="icon-button"
					aria-label="Perioada precedentă"
					disabled={busy}
					onclick={() => move(-1)}><ChevronLeft size={18} aria-hidden="true" /></button
				><button disabled={busy} onclick={() => load(localDay())}>Astăzi</button><button
					class="icon-button"
					aria-label="Perioada următoare"
					disabled={busy}
					onclick={() => move(1)}><ChevronRight size={18} aria-hidden="true" /></button
				>
			</div>
		</div>
		{#if busy}<p class="loading-state" role="status">
				<RefreshCw size={16} aria-hidden="true" />Se încarcă rezervările…
			</p>{/if}
		{#if result.page?.stale}<div class="notice" role="status">
				<CircleAlert size={17} aria-hidden="true" />
				<div>
					Date neactualizate · ultima actualizare: {new Date(result.page.fetchedAt).toLocaleString(
						'ro-RO',
						{ timeZone: 'Europe/Bucharest' }
					)}.<button class="notice-action" disabled={busy} onclick={() => load()}
						>Reîncearcă actualizarea</button
					>
				</div>
			</div>{/if}
		{#if result.error}<div class="notice error" role="alert">
				<CircleAlert size={17} aria-hidden="true" />
				<div>
					{result.error}<button
						class="notice-action"
						disabled={busy}
						onclick={() => load(anchor, view, Boolean(result.page?.nextCursor))}>Reîncearcă</button
					>
				</div>
			</div>{/if}
		{#if result.page}
			{#if view === 'week'}
				<div class="week-agenda">
					{#each days as day (day)}
						{@const events = bookings(day)}
						<section
							class={[
								'agenda-day',
								'timeline-day',
								{ 'current-day': day === today, 'empty-day': !events.length }
							]}
							aria-label={dayLabel(day)}
						>
							<DateBadge {day} current={day === today} />
							<div class="day-content">
								<h3 class="sr-only">{dayLabel(day)}</h3>
								{#if !events.length}<span class="day-availability"
										><CircleCheck size={13} aria-hidden="true" />{result.page.nextCursor
											? 'Nicio rezervare încărcată'
											: 'Liber'}</span
									>{/if}
								<div class="bookings">
									{#each events as event (event.id)}<EventCard
											{event}
											{day}
											{now}
											variant="booking"
										/>{/each}
								</div>
							</div>
						</section>
					{/each}
				</div>
			{:else}
				<div class="month-grid" aria-label={period}>
					{#each ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'] as weekday (weekday)}<span
							class="weekday">{weekday}</span
						>{/each}
					{#each days as day (day)}
						{@const events = bookings(day)}
						<button
							class={[
								'month-day',
								{
									outside: day.slice(0, 7) !== anchor.slice(0, 7),
									chosen: day === selected,
									current: day === today
								}
							]}
							aria-label={`${dayLabel(day)} · ${events.length} rezervări`}
							aria-pressed={day === selected}
							onclick={() => {
								selected = day;
							}}
						>
							<span class="day-number">{Number(day.slice(8))}</span>{#if events.length}<span
									class="mobile-count"
									aria-hidden="true">{events.length}</span
								>{/if}
							{#each events.slice(0, 2) as event (event.id)}<span class="event-preview"
									>{event.title}</span
								>{/each}{#if events.length > 2}<span class="overflow">+{events.length - 2}</span
								>{/if}
						</button>
					{/each}
				</div>
				<section
					class="agenda-day selected-day timeline-day"
					aria-label={`Rezervări: ${dayLabel(selected)}`}
				>
					<DateBadge day={selected} current={selected === today} />
					<div class="day-content">
						<h3 class="sr-only">{dayLabel(selected)}</h3>
						<div class="bookings">
							{#each bookings(selected) as event (event.id)}<EventCard
									{event}
									day={selected}
									{now}
									variant="booking"
								/>{:else}<p class="day-availability">
									<CircleCheck size={14} aria-hidden="true" />{result.page.nextCursor
										? 'Nicio rezervare încărcată pentru această zi.'
										: 'Nicio rezervare.'}
								</p>{/each}
						</div>
					</div>
				</section>
			{/if}
			{#if result.page.nextCursor}<button
					class="load-more"
					disabled={busy}
					onclick={() => load(anchor, view, true)}>Încarcă restul rezervărilor</button
				>
				<p class="progress">Mai sunt rezervări de încărcat în această perioadă.</p>{/if}
		{/if}
	</div>
</section>

<style>
	.calendar-body {
		container-type: inline-size;
		container-name: calendar-panel;
	}
	.calendar-toolbar {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 8px;
		padding-bottom: 12px;
		margin-bottom: 12px;
		border-bottom: 1px solid var(--sc-border);
	}
	.view-switch {
		grid-column: 1;
		grid-row: 1;
	}
	.period-controls {
		grid-column: 2;
		grid-row: 1;
		justify-self: end;
	}
	.period {
		grid-column: 1 / -1;
		grid-row: 2;
	}
	@container calendar-panel (min-width: 520px) {
		.calendar-toolbar {
			grid-template-columns: auto minmax(0, 1fr) auto;
		}
		.period {
			grid-column: 2;
			grid-row: 1;
			text-align: center;
		}
		.period-controls {
			grid-column: 3;
		}
	}
	.view-switch {
		display: inline-flex;
		padding: 3px;
		background: #f3f5f7;
		border: 1px solid #e9ecf0;
		border-radius: 9px;
		gap: 2px;
	}
	.view-switch button {
		gap: 6px;
		padding: 7px 10px;
		border-color: transparent;
		background: transparent;
		color: #667085;
	}
	.view-switch button[aria-pressed='true'] {
		background: #fff;
		border-color: #d9e6e3;
		box-shadow: 0 1px 3px #1018280a;
		color: #0f766e;
		font-weight: 650;
	}
	.period-controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.period-controls button {
		border-color: transparent;
		background: transparent;
		color: #475467;
	}
	.period-controls .icon-button {
		width: 44px;
		padding: 0;
	}
	.period {
		margin: 0;
		color: #344054;
		font-size: 0.9rem;
		font-weight: 650;
	}
	.week-agenda {
		display: grid;
		gap: 8px;
	}
	.empty-day .day-content {
		min-height: 48px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}
	.day-availability {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: #667085;
		font-size: 0.7rem;
		margin: 0;
	}
	.empty-day .day-availability {
		color: #466d65;
	}
	.current-day {
		padding: 6px;
		margin: 0 -6px;
		border-radius: 12px;
		background: #f0f8f5;
	}
	.loading-state {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 0.8rem;
		color: #667085;
		padding: 16px 0;
	}
	.month-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 3px;
	}
	.weekday {
		text-align: center;
		color: #667085;
		font-size: 0.68rem;
		padding: 0 0 9px;
	}
	.month-grid .month-day {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 2px;
		min-width: 0;
		min-height: 64px;
		padding: 4px;
		text-align: left;
		border-radius: 6px;
	}
	.month-day.chosen {
		border-color: #0f766e;
		box-shadow: inset 0 0 0 1px #0f766e;
		background: #f2f9f7;
	}
	.month-day.current .day-number {
		background: #0f766e;
		color: white;
		border-radius: 50%;
	}
	.day-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: flex-start;
		width: 21px;
		height: 21px;
		font-size: 0.75rem;
	}
	.event-preview {
		display: block;
		font-size: 0.62rem;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: #32665d;
		background: #eaf4f0;
		border-left: 2px solid #4f8b7e;
		padding: 2px;
		border-radius: 0 3px 3px 0;
	}
	.mobile-count {
		display: none;
	}
	.overflow {
		font-size: 0.65rem;
		color: #0f766e;
	}
	.outside .day-number {
		color: #667085;
	}
	.selected-day {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--sc-border);
	}
	@media (max-width: 600px) {
		.month-grid .month-day {
			min-height: 60px;
			padding: 5px 2px;
		}
		.event-preview,
		.overflow {
			display: none;
		}
		.mobile-count {
			display: block;
			border-radius: 4px;
			background: #e5f2ed;
			color: #0f766e;
			font-size: 0.7rem;
			text-align: center;
			padding: 2px;
		}
	}
	@media (max-width: 420px) {
		.view-switch :global(svg) {
			display: none;
		}
		.month-grid {
			gap: 1px;
			margin: 0 -5px;
		}
		.calendar-toolbar {
			gap: 6px;
		}
		.view-switch button {
			padding: 7px;
			gap: 4px;
			font-size: 0.73rem;
		}
		.period-controls {
			gap: 0;
		}
		.period-controls .icon-button {
			width: 44px;
		}
	}
</style>
