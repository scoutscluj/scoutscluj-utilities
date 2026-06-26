<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import PWAStatusToasts from '$lib/components/pwa/PWAStatusToasts.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>ScoutsCluj</title>
	<meta name="application-name" content="ScoutsCluj" />
	<meta name="apple-mobile-web-app-title" content="ScoutsCluj" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="theme-color" content="#c81e1e" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="icon" href="/favicon.ico" />
	<link rel="apple-touch-icon" href="/icons/icon-192.png" />
</svelte:head>

{@render children()}
<Toaster />
<PWAStatusToasts />

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		background: #f4f6f8;
		color: #17202a;
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}

	:global(button),
	:global(input) {
		font: inherit;
	}

	:global(a) {
		color: inherit;
	}
</style>
