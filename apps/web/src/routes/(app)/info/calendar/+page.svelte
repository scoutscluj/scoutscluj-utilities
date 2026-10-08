<script lang="ts">
	import { IframeEmbed } from '$lib';
	import { eventsCalendarUrl } from '$lib/calendars';
</script>

<svelte:head>
	<title>Calendar Eventos | Scouts Cluj Utilities</title>
</svelte:head>

<IframeEmbed url={eventsCalendarUrl} title="Calendar Eventos" height="calc(100vh - 112px)" />
