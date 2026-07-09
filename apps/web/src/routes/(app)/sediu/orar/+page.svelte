<script lang="ts">
	import { IframeEmbed } from '$lib';

	const calendarUrl =
		'https://calendar.google.com/calendar/embed?src=c_456e2c5db77124a1f42e417621e5fb1f70aec044fff06ae072c4ed54fe53675e%40group.calendar.google.com&ctz=Europe%2FBucharest';
</script>

<svelte:head>
	<title>Calendar Sediu | Scouts Cluj Utilities</title>
</svelte:head>

<IframeEmbed url={calendarUrl} title="Google Calendar" height="calc(100vh - 112px)" />
