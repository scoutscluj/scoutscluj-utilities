<script lang="ts">
	import { IframeEmbed } from '$lib';

	const feedbackFormUrl =
		'https://docs.google.com/forms/d/e/1FAIpQLSezJ8U10e04ZcZLBejBS8vqT8RTQXgHQ2ByzIBfvDoGE1tAtQ/viewform?embedded=true';
</script>

<svelte:head>
	<title>Feedback | Scouts Cluj Utilities</title>
</svelte:head>

<section class="external-page">
	<header>
		<h1>Feedback</h1>
		<a href={feedbackFormUrl} target="_blank" rel="noopener noreferrer"
			>Deschide într-o filă nouă ↗</a
		>
	</header>
	<p>Conținut extern găzduit pe Google Forms.</p>
	<div class="external-frame">
		<IframeEmbed url={feedbackFormUrl} title="Feedback" height="100%" />
	</div>
</section>

<style>
	.external-page {
		display: flex;
		flex-direction: column;
		gap: 12px;
		height: calc(100dvh - 64px - 48px);
		min-height: 440px;
		min-width: 0;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
	}
	h1 {
		margin: 0;
		font-size: clamp(24px, 3vw, 30px);
		line-height: 1.2;
		color: var(--sc-ink);
	}
	p {
		margin: 0;
		font-size: 13px;
		color: var(--sc-muted);
	}
	a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		color: var(--sc-link);
	}
	a:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 3px;
	}
	.external-frame {
		flex: 1;
		min-height: 0;
		min-width: 0;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	@media (max-width: 620px) {
		.external-page {
			height: calc(100dvh - 64px - 32px);
		}
	}
</style>
