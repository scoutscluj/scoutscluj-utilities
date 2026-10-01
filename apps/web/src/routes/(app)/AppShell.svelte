<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import AppSidebar from './AppSidebar.svelte';
	import AppTopbar from './AppTopbar.svelte';
	import SiteFooter from '$lib/legal/SiteFooter.svelte';
	import type { CurrentUser } from '$lib/auth/types';
	import type { SidebarActivity } from '$lib/activities/sidebar-activity';

	type Props = {
		user: CurrentUser;
		sidebarActivities: SidebarActivity[];
		children: Snippet;
	};

	let { user, sidebarActivities, children }: Props = $props();
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

	<AppSidebar {user} {sidebarActivities} pathname={page.url.pathname} {mobileOpen} {closeMobile} />

	<div class="workspace">
		<AppTopbar
			{user}
			{currentActivity}
			pathname={page.url.pathname}
			{mobileOpen}
			openMobile={() => (mobileOpen = true)}
		/>

		<main class="content">
			{@render children()}
		</main>
		<SiteFooter />
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
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
	}

	.content {
		flex: 1;
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
