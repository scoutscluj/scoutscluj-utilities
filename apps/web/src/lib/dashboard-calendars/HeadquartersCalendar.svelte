<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import EventCard from './EventCard.svelte';
	import { fetchCalendar } from './client';
	import {
		addDays,
		pageMetadata,
		dayLabel,
		daysRange,
		localDay,
		moveMonth,
		overlapsDay,
		shortDate,
		sorted,
		visibleDays,
		type CalendarResult
	} from './calendar';
	let { initial, today, expire }: { initial: CalendarResult; today: string; expire: () => void } =
		$props();
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
			? `${shortDate(days[0])} – ${shortDate(days[6])}`
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

<section class="calendar-widget" aria-labelledby="headquarters-heading" aria-busy={busy}>
	<header>
		<div>
			<p class="eyebrow">Rezervări și întâlniri</p>
			<h2 id="headquarters-heading">Calendar Sediu</h2>
		</div>
		<a href={resolve('/sediu/orar')}>Calendar complet ↗</a>
	</header>
	<div class="calendar-body">
		<div class="view-switch" role="group" aria-label="Vizualizare sediu">
			<button aria-pressed={view === 'week'} disabled={busy} onclick={() => load(selected, 'week')}
				>Săptămână</button
			><button
				aria-pressed={view === 'month'}
				disabled={busy}
				onclick={() => load(selected, 'month')}>Lună</button
			>
		</div>
		<div class="period-controls">
			<button aria-label="Perioada precedentă" disabled={busy} onclick={() => move(-1)}>←</button
			><button disabled={busy} onclick={() => load(localDay())}>Astăzi</button><button
				aria-label="Perioada următoare"
				disabled={busy}
				onclick={() => move(1)}>→</button
			>
		</div>
		<p class="period" aria-live="polite" aria-atomic="true">{period}</p>
		{#if busy}<p class="progress" role="status">Se încarcă rezervările…</p>{/if}
		{#if result.page?.stale}<p class="notice" role="status">
				Date neactualizate · ultima actualizare: {new Date(result.page.fetchedAt).toLocaleString(
					'ro-RO',
					{ timeZone: 'Europe/Bucharest' }
				)}.
			</p>
			<button disabled={busy} onclick={() => load()}>Reîncearcă actualizarea</button>{/if}
		{#if result.error}<p class="notice error" role="alert">{result.error}</p>
			<button disabled={busy} onclick={() => load(anchor, view, Boolean(result.page?.nextCursor))}
				>Reîncearcă</button
			>{/if}
		{#if result.page}
			{#if view === 'week'}
				<div class="week-agenda">
					{#each days as day (day)}<section class="agenda-day" aria-label={dayLabel(day)}>
							<h3>
								{dayLabel(day)}{#if day === today}<span class="today-label">Astăzi</span>{/if}
							</h3>
							<div class="bookings">
								{#each bookings(day) as event (event.id)}<EventCard {event} {day} />{:else}<p
										class="empty"
									>
										{result.page.nextCursor
											? 'Nicio rezervare încărcată pentru această zi.'
											: 'Nicio rezervare.'}
									</p>{/each}
							</div>
						</section>{/each}
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
							<span class="day-number">{Number(day.slice(8))}</span>
							{#if events.length}<span class="mobile-count" aria-hidden="true">{events.length}</span
								>{/if}
							{#each events.slice(0, 2) as event (event.id)}<span class="event-preview"
									>{event.title}</span
								>{/each}
							{#if events.length > 2}<span class="overflow">+{events.length - 2}</span>{/if}
						</button>
					{/each}
				</div>
				<section class="agenda-day selected-day" aria-label={`Rezervări: ${dayLabel(selected)}`}>
					<h3>{dayLabel(selected)}</h3>
					<div class="bookings">
						{#each bookings(selected) as event (event.id)}<EventCard
								{event}
								day={selected}
							/>{:else}<p class="empty">
								{result.page.nextCursor
									? 'Nicio rezervare încărcată pentru această zi.'
									: 'Nicio rezervare.'}
							</p>{/each}
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
	.view-switch {
		display: flex;
		padding: 4px;
		background: var(--sc-canvas);
		border-radius: 9px;
		gap: 4px;
	}
	.view-switch button {
		flex: 1;
		border-color: transparent;
		background: transparent;
	}
	.view-switch button[aria-pressed='true'] {
		background: var(--sc-surface);
		border-color: var(--sc-border);
		box-shadow: 0 1px 3px #0000000a;
		color: var(--sc-accent);
	}
	.period-controls {
		display: flex;
		gap: 8px;
		justify-content: center;
		margin-top: 16px;
	}
	.period {
		text-align: center;
		font-size: 0.95rem;
		font-weight: 650;
		text-transform: capitalize;
		margin: 12px 0 20px;
	}
	.month-grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 3px;
	}
	.weekday {
		text-align: center;
		color: var(--sc-muted);
		font-size: 0.75rem;
		padding: 6px 0;
	}
	.month-grid .month-day {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 4px;
		min-width: 0;
		min-height: 92px;
		padding: 7px 4px;
		text-align: left;
		border-radius: 5px;
	}
	.month-day.chosen {
		border-color: var(--sc-accent);
		box-shadow: inset 0 0 0 1px var(--sc-accent);
	}
	.month-day.current .day-number {
		background: var(--sc-accent);
		color: white;
		border-radius: 50%;
	}
	.day-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		align-self: flex-start;
		width: 25px;
		height: 25px;
		font-size: 0.8rem;
	}
	.event-preview {
		display: block;
		font-size: 0.65rem;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		background: var(--sc-canvas);
		border-left: 2px solid var(--sc-accent);
		padding: 3px;
	}
	.mobile-count {
		display: none;
	}
	.overflow {
		font-size: 0.65rem;
		color: var(--sc-accent);
		overflow-wrap: anywhere;
	}
	.outside {
		opacity: 0.65;
	}
	.today-label {
		margin-left: 8px;
		color: var(--sc-accent);
		font-size: 0.7rem;
	}
	.selected-day {
		margin-top: 20px;
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
			background: var(--sc-accent-soft);
			color: var(--sc-accent);
			font-size: 0.7rem;
			text-align: center;
			padding: 2px;
		}
	}
</style>
