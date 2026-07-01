<script lang="ts">
	import { page } from '$app/state';
	import AppSidebar from './AppSidebar.svelte';
	import AppTopbar from './AppTopbar.svelte';
	import type { SidebarActivity } from '$lib/activities/sidebar-activity';

	let { data, children } = $props();
	let mobileOpen = $state(false);

	const currentActivity = $derived(page.data.activity as SidebarActivity | undefined);
	const closeMobile = () => {
		mobileOpen = false;
	};
</script>

<div class="app-shell">
	{#if mobileOpen}
		<button class="scrim" type="button" aria-label="Închide meniul" onclick={closeMobile}></button>
	{/if}

	<AppSidebar
		user={data.user}
		sidebarActivities={data.sidebarActivities}
		pathname={page.url.pathname}
		{mobileOpen}
		{closeMobile}
	/>

	<div class="workspace">
		<AppTopbar
			user={data.user}
			{currentActivity}
			pathname={page.url.pathname}
			{mobileOpen}
			openMobile={() => (mobileOpen = true)}
		/>

		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 10;
		border: 0;
		background: rgb(15 23 42 / 0.36);
	}

	.workspace {
		width: 100%;
		min-width: 0;
	}

	.content {
		padding: 24px;
	}

	@media (min-width: 900px) {
		.scrim {
			display: none;
		}

		.workspace {
			width: calc(100% - 260px);
		}
	}

	@media (max-width: 620px) {
		.content {
			padding: 16px;
		}
	}
</style>
