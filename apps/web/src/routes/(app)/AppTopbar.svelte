<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CurrentUser } from '$lib/auth/types';
	import ProfileMenu from './ProfileMenu.svelte';
	import type { SidebarActivity } from '$lib/activities/sidebar-activity';
	import { activitySubtitle, routeTitle } from './app-shell';

	type Props = {
		user: CurrentUser;
		currentActivity?: SidebarActivity;
		pathname: string;
		mobileOpen: boolean;
		openMobile: () => void;
	};

	let { user, currentActivity, pathname, mobileOpen, openMobile }: Props = $props();

	const topbarTitle = $derived(currentActivity?.title ?? routeTitle(pathname));
	const topbarSubtitle = $derived(
		currentActivity ? activitySubtitle(currentActivity, pathname) : undefined
	);
</script>

<header class="topbar">
	<button
		type="button"
		class="menu-button"
		aria-label="Deschide meniul"
		aria-expanded={mobileOpen}
		onclick={openMobile}
	>
		<span></span>
		<span></span>
		<span></span>
	</button>

	{#if currentActivity}
		<a
			class="topbar-back-button"
			href={resolve('/activities')}
			title="Înapoi la activități"
			aria-label="Înapoi la activități"
		>
			<span aria-hidden="true">←</span>
		</a>
	{/if}

	<div class="topbar-title">
		<p>{topbarTitle}</p>
		{#if topbarSubtitle}
			<span>{topbarSubtitle}</span>
		{/if}
	</div>

	<ProfileMenu {user} />
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 5;
		min-height: 64px;
		display: flex;
		align-items: center;
		gap: 16px;
		border-bottom: 1px solid #d8dee6;
		background: rgb(255 255 255 / 0.94);
		padding: 0 18px;
		backdrop-filter: blur(10px);
	}

	.menu-button {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		cursor: pointer;
	}

	.menu-button span {
		width: 18px;
		height: 2px;
		background: #17202a;
	}

	.topbar-back-button {
		width: 38px;
		height: 38px;
		display: inline-grid;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		color: #334155;
		font-size: 1.2rem;
		font-weight: 900;
		text-decoration: none;
	}

	.topbar-back-button:hover {
		border-color: #991b1b;
		background: #fef2f2;
		color: #991b1b;
	}

	.topbar-title {
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	.topbar-title p,
	.topbar-title span {
		min-width: 0;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.topbar-title p {
		color: #0f172a;
		font-size: 1rem;
		font-weight: 900;
	}

	.topbar-title span {
		color: #64748b;
		font-size: 0.82rem;
		font-weight: 750;
	}

	@media (min-width: 900px) {
		.menu-button {
			display: none;
		}
	}
</style>
