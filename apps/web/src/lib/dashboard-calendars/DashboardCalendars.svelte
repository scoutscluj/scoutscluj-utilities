<script lang="ts">
	import CalendarFrame from './CalendarFrame.svelte';
	import HeadquartersCalendar from './HeadquartersCalendar.svelte';
	import UpcomingAgenda from './UpcomingAgenda.svelte';
	import type { CalendarResult, Range } from './calendar';
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
</script>

<CalendarFrame now={initialNow}>
	{#snippet children({ now, today, expire })}
		<div class="calendar-grid">
			<UpcomingAgenda initial={events} initialRange={eventsRange} {now} {expire} />
			<HeadquartersCalendar initial={headquarters} {today} {now} {expire} />
		</div>
	{/snippet}
</CalendarFrame>

<style>
	.calendar-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	@media (min-width: 1100px) {
		.calendar-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		}
	}
</style>
