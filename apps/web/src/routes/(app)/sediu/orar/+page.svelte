<script lang="ts">
	import type { PageData } from './$types';
	import CalendarFrame from '$lib/dashboard-calendars/CalendarFrame.svelte';
	import HeadquartersCalendar from '$lib/dashboard-calendars/HeadquartersCalendar.svelte';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Calendar Sediu | Scouts Cluj Utilities</title></svelte:head>

<h1>Programul sediului</h1>

{#key data.now}
	<CalendarFrame now={data.now}>
		{#snippet children({ now, today, expire })}
			<HeadquartersCalendar
				initial={data.calendar}
				{today}
				{now}
				{expire}
				showCalendarLink={false}
			/>
		{/snippet}
	</CalendarFrame>
{/key}

<style>
	h1 {
		margin: 0 0 16px;
		color: var(--sc-ink);
		font-size: clamp(24px, 3vw, 30px);
		line-height: 1.2;
		letter-spacing: -0.025em;
		overflow-wrap: anywhere;
	}
</style>
