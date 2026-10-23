<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { fetchCalendar } from './client';
	import EventCard from './EventCard.svelte';
	import {
		pageMetadata,
		dayLabel,
		eventEnd,
		eventStart,
		localDay,
		nextWindow,
		shortDate,
		sorted,
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
	const groups = $derived([
		...new Set(visible.map((event) => (event.allDay ? event.start : localDay(event.start))))
	]);
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

<section class="calendar-widget" aria-labelledby="events-heading" aria-busy={busy}>
	<header>
		<div>
			<p class="eyebrow">Agenda centrului local</p>
			<h2 id="events-heading">Următoarele evenimente</h2>
		</div>
		<a href={resolve('/info/calendar')}>Calendar complet ↗</a>
	</header>
	<div class="calendar-body">
		{#if loadedThrough}<p class="range">
				Perioada încărcată: {shortDate(localDay(initialRange.from))} – {shortDate(
					localDay(new Date(Date.parse(loadedThrough) - 1))
				)}
			</p>{/if}
		{#if result.page?.stale}<p class="notice" role="status">
				Date neactualizate · ultima actualizare: {new Date(result.page.fetchedAt).toLocaleString(
					'ro-RO',
					{ timeZone: 'Europe/Bucharest' }
				)}.
			</p>{/if}
		{#if result.page?.stale}<button onclick={() => window.location.reload()}
				>Reîncearcă actualizarea</button
			>{/if}
		{#if result.error}<p class="notice error" role="alert">{result.error}</p>{/if}
		{#each groups as day (day)}
			<section class="agenda-day" aria-label={dayLabel(day)}>
				<h3>{dayLabel(day)}</h3>
				<div class="bookings">
					{#each visible.filter((event) => (event.allDay ? event.start : localDay(event.start)) === day) as event (event.id)}<EventCard
							{event}
							ongoing={eventStart(event) <= now}
						/>{/each}
				</div>
			</section>
		{/each}
		{#if !visible.length && result.page && !result.error}<p class="empty">
				Nu sunt evenimente în perioada încărcată. Poți căuta în perioada următoare.
			</p>{/if}
		<button class="load-more" onclick={load} disabled={busy}
			>{busy ? 'Se încarcă…' : result.error ? 'Reîncearcă' : 'Încarcă mai multe'}</button
		>
		<p class="progress" aria-live="polite">
			{busy
				? 'Se încarcă evenimentele.'
				: `${visible.length} ${visible.length === 1 ? 'eveniment încărcat' : 'evenimente încărcate'}${result.page?.nextCursor ? ' · Mai sunt evenimente în această perioadă.' : '.'}`}
		</p>
	</div>
</section>
