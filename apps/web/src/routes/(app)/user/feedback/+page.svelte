<script lang="ts">
	import { IframeEmbed } from '$lib';

	const feedbackFormUrl =
		'https://docs.google.com/forms/d/e/1FAIpQLSezJ8U10e04ZcZLBejBS8vqT8RTQXgHQ2ByzIBfvDoGE1tAtQ/viewform?embedded=true';
</script>

<svelte:head>
	<title>Feedback | Scouts Cluj Utilities</title>
</svelte:head>

<IframeEmbed url={feedbackFormUrl} title="Formular de feedback" height="calc(100vh - 112px)" />
