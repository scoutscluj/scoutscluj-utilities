<script lang="ts">
	import { IframeEmbed } from '$lib';
	import { headquartersCalendarUrl } from '$lib/calendars';
</script>

<svelte:head>
	<title>Calendar Sediu | Scouts Cluj Utilities</title>
</svelte:head>

<IframeEmbed url={headquartersCalendarUrl} title="Google Calendar" height="calc(100vh - 112px)" />
