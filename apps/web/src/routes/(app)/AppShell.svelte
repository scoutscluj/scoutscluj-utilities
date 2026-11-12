<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import AppSidebar from './AppSidebar.svelte';
	import AppTopbar from './AppTopbar.svelte';
	import type { CurrentUser } from '$lib/auth/types';
	import type { SidebarActivity } from '$lib/activities/sidebar-activity';

	type Props = {
		user: CurrentUser;
		sidebarActivities: SidebarActivity[];
		children: Snippet;
	};

	let { user, sidebarActivities, children }: Props = $props();
	let mobileOpen = $state(false);
	let desktop = $state(true);
	onMount(() => {
		const media = window.matchMedia('(min-width: 900px)');
		const update = () => {
			desktop = media.matches;
			if (desktop) mobileOpen = false;
		};
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	$effect(() => {
		if (!mobileOpen || desktop) return;
		const previousOverflow = document.body.style.overflow;
		const previousFocus = document.activeElement;
		document.body.style.overflow = 'hidden';
		void tick().then(() => document.querySelector<HTMLElement>('[data-menu-close]')?.focus());
		return () => {
			document.body.style.overflow = previousOverflow;
			if (previousFocus instanceof HTMLElement) previousFocus.focus();
		};
	});
	$effect(() => {
		if (page.url.pathname) closeMobile();
	});
	const menuKeyboard = (event: KeyboardEvent) => {
		if (!mobileOpen || desktop) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			closeMobile();
			return;
		}
		if (event.key !== 'Tab') return;
		const items = [
			...document.querySelectorAll<HTMLElement>(
				'#app-navigation a[href], #app-navigation button:not([disabled])'
			)
		].filter((item) => item.getClientRects().length > 0);
		const first = items[0],
			last = items.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last?.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first?.focus();
		}
	};

	const currentActivity = $derived(page.data.activity as SidebarActivity | undefined);
	const closeMobile = () => {
		mobileOpen = false;
	};
</script>

<svelte:window onkeydown={menuKeyboard} />
<div class="app-shell">
	{#if mobileOpen}
		<button class="scrim" type="button" aria-label="Închide meniul" onclick={closeMobile}></button>
	{/if}

	<AppSidebar
		{user}
		{sidebarActivities}
		pathname={page.url.pathname}
		{mobileOpen}
		{desktop}
		{closeMobile}
	/>

	<div class="workspace" inert={mobileOpen && !desktop}>
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
			margin-left: 260px;
		}
	}

	@media (max-width: 620px) {
		.content {
			padding: 16px;
		}
	}
</style>
