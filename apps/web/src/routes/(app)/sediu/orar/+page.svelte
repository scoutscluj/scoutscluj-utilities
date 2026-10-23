<script lang="ts">
	import type { PageData } from './$types';
	import CalendarFrame from '$lib/dashboard-calendars/CalendarFrame.svelte';
	import HeadquartersCalendar from '$lib/dashboard-calendars/HeadquartersCalendar.svelte';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Calendar Sediu | Scouts Cluj Utilities</title></svelte:head>

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
