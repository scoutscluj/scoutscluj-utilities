<script lang="ts">
	import { page } from '$app/state';
	import { usesAuthenticatedShell } from '$lib/auth/authenticated-shell';
	import { Toaster } from '$lib/components/ui/sonner';
	import PWAStatusToasts from '$lib/components/pwa/PWAStatusToasts.svelte';
	import SiteFooter from '$lib/legal/SiteFooter.svelte';
	import AppShell from './(app)/AppShell.svelte';

	let { data, children } = $props();
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

{#if data.user && usesAuthenticatedShell(page.url.pathname, true)}
	<AppShell user={data.user} sidebarActivities={data.sidebarActivities} {children} />
{:else if page.route.id?.startsWith('/(app)')}
	{@render children()}
{:else}
	<div class="public-layout">
		<div class="public-content">{@render children()}</div>
		{#if !data.user}
			<SiteFooter />
		{/if}
	</div>
{/if}
<Toaster />
<PWAStatusToasts />

<style>
	.public-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.public-content {
		flex: 1;
	}
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
