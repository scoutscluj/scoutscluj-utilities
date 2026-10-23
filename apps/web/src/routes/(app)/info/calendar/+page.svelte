<script lang="ts">
	import type { PageData } from './$types';
	import CalendarFrame from '$lib/dashboard-calendars/CalendarFrame.svelte';
	import UpcomingAgenda from '$lib/dashboard-calendars/UpcomingAgenda.svelte';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Calendar Evenimente | Scouts Cluj Utilities</title></svelte:head>

{#key data.now}
	<CalendarFrame now={data.now}>
		{#snippet children({ now, expire })}
			<UpcomingAgenda
				initial={data.calendar}
				initialRange={data.range}
				{now}
				{expire}
				showCalendarLink={false}
			/>
		{/snippet}
	</CalendarFrame>
{/key}
