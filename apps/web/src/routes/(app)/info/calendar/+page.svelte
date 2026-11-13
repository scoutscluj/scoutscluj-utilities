<script lang="ts">
	import type { PageData } from './$types';
	import CalendarFrame from '$lib/dashboard-calendars/CalendarFrame.svelte';
	import UpcomingAgenda from '$lib/dashboard-calendars/UpcomingAgenda.svelte';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Calendar Evenimente | Scouts Cluj Utilities</title></svelte:head>

<h1>Calendarul evenimentelor</h1>

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
