<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { fetchCalendar } from './client';
	import EventCard from './EventCard.svelte';
	import DateBadge from './DateBadge.svelte';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import {
		addDays,
		pageMetadata,
		dayLabel,
		eventEnd,
		localDay,
		nextWindow,
		shortDate,
		sorted,
		type CalendarEvent,
		type CalendarResult,
		type Range
	} from './calendar';
	let {
		initial,
		initialRange,
		now,
		expire
	}: { initial: CalendarResult; initialRange: Range; now: number; expire: () => void } = $props();
	let result = $state(untrack(() => initial));
	let range = $state(untrack(() => initialRange));
	let items = $state(untrack(() => initial.page?.items ?? []));
	let loadedThrough = $state(untrack(() => (initial.page ? initialRange.to : null)));
	let busy = $state(false);
	let failedRange = $state<Range | null>(null);
	const visible = $derived(sorted(items).filter((event) => eventEnd(event) > now));
	const groups = $derived.by(() => {
		const grouped: { day: string; endDay: string; events: CalendarEvent[] }[] = [];
		for (const event of visible) {
			const day = event.allDay ? event.start : localDay(event.start);
			const endDay = event.allDay ? addDays(event.end, -1) : localDay(event.end);
			const previous = grouped.at(-1);
			if (previous?.day === day && previous.endDay === endDay) previous.events.push(event);
			else grouped.push({ day, endDay, events: [event] });
		}
		return grouped;
	});
	async function load() {
		if (busy) return;
		busy = true;
		const target =
			failedRange ?? (result.page && !result.page.nextCursor ? nextWindow(range) : range);
		const next = await fetchCalendar(
			'events',
			target,
			expire,
			failedRange ? undefined : result.page?.nextCursor
		);
		if (next.page) {
			items = sorted([...items, ...next.page.items]);
			range = target;
			loadedThrough = target.to;
			result = { ...next, page: pageMetadata(result.page, next.page) };
			failedRange = null;
		} else {
			if (!result.page?.nextCursor) failedRange = target;
			result = { ...result, error: next.error };
		}
		busy = false;
	}
</script>

<section class="calendar-widget events-widget" aria-labelledby="events-heading" aria-busy={busy}>
	<header class="widget-header">
		<div class="widget-title">
			<span class="widget-icon events-icon"><CalendarDays size={21} aria-hidden="true" /></span>
			<h2 id="events-heading">Următoarele evenimente</h2>
			<span class="count-badge" aria-label={`${visible.length} evenimente`}>{visible.length}</span>
		</div>
		<a
			href={resolve('/info/calendar')}
			class="calendar-link"
			title="Calendarul complet de evenimente"
			><span>Calendar complet</span><ExternalLink size={14} aria-hidden="true" /></a
		>
	</header>
	<div class="calendar-body">
		{#if loadedThrough}<p class="coverage">
				<CalendarRange size={15} aria-hidden="true" />Până la {shortDate(
					localDay(new Date(Date.parse(loadedThrough) - 1))
				)}
			</p>{/if}
		{#if result.page?.stale}<div class="notice" role="status">
				<CircleAlert size={17} aria-hidden="true" />
				<div>
					Date neactualizate · ultima actualizare: {new Date(result.page.fetchedAt).toLocaleString(
						'ro-RO',
						{ timeZone: 'Europe/Bucharest' }
					)}.<button class="notice-action" onclick={() => window.location.reload()}
						>Reîncearcă actualizarea</button
					>
				</div>
			</div>{/if}
		{#if result.error}<p class="notice error" role="alert">
				<CircleAlert size={17} aria-hidden="true" />{result.error}
			</p>{/if}
		<div class="events-agenda">
			{#each groups as { day, endDay, events } (events[0].id)}
				{@const dateLabel =
					day === endDay ? dayLabel(day) : `${dayLabel(day)} – ${dayLabel(endDay)}`}
				<section class="agenda-day timeline-day" aria-label={dateLabel}>
					<DateBadge
						{day}
						{endDay}
						year={day.slice(0, 4) !== localDay(now).slice(0, 4) ? day.slice(0, 4) : undefined}
					/>
					<div class="day-content">
						<h3 class="sr-only">{dateLabel}</h3>
						<div class="bookings">
							{#each events as event (event.id)}<EventCard {event} {now} datesInRail />{/each}
						</div>
					</div>
				</section>
			{/each}
		</div>
		{#if !visible.length && result.page && !result.error}<div class="empty-state">
				<CalendarDays size={24} aria-hidden="true" />
				<p>Nu sunt evenimente în această perioadă.</p>
				<span>Poți explora perioada următoare.</span>
			</div>{/if}
		<footer class="agenda-footer">
			<button class="load-more" onclick={load} disabled={busy}
				>{#if result.error}<RefreshCw size={16} aria-hidden="true" />{:else}<ChevronDown
						size={16}
						aria-hidden="true"
					/>{/if}{busy ? 'Se încarcă…' : result.error ? 'Reîncearcă' : 'Încarcă mai multe'}</button
			>{#if result.page?.nextCursor}<p class="more-hint">
					Mai sunt evenimente în această perioadă.
				</p>{/if}
		</footer>
		<p class="sr-only" aria-live="polite">
			{busy ? 'Se încarcă evenimentele.' : `${visible.length} evenimente încărcate.`}
		</p>
	</div>
</section>

<style>
	.coverage {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 12px;
		color: #667085;
		font-size: 0.75rem;
	}
	.events-agenda {
		display: grid;
		gap: 12px;
	}
	.agenda-day .day-content {
		align-self: stretch;
		display: flex;
		flex-direction: column;
	}
	.agenda-day .bookings {
		flex: 1;
	}
	.agenda-day :global(.event-card) {
		align-content: center;
	}
	.agenda-footer {
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--sc-border);
	}
	.more-hint {
		margin: 9px 0 0;
		text-align: center;
		font-size: 0.72rem;
		color: #667085;
	}
	.empty-state {
		padding: 24px 12px;
		text-align: center;
		color: #667085;
	}
	.empty-state :global(svg) {
		color: #5278a8;
	}
	.empty-state p {
		color: #344054;
		font-size: 0.88rem;
		margin: 10px 0 5px;
	}
	.empty-state span {
		font-size: 0.78rem;
	}
</style>
