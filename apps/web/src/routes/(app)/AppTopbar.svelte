<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CurrentUser } from '$lib/auth/types';
	import ProfileMenu from './ProfileMenu.svelte';
	import OrgoBackgroundSync from '$lib/members/OrgoBackgroundSync.svelte';
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
	let syncOpen = $state(false);

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
		aria-controls="app-navigation"
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

	<div class="topbar-tools">
		<OrgoBackgroundSync bind:open={syncOpen} /><ProfileMenu
			{user}
			onOrgoSync={() => (syncOpen = true)}
		/>
	</div>
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
		border-bottom: 1px solid var(--sc-border);
		background: color-mix(in srgb, var(--sc-surface) 96%, transparent);
		padding: 0 18px;
		backdrop-filter: blur(10px);
	}

	.menu-button {
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		border: 1px solid var(--sc-border-strong);
		border-radius: 8px;
		background: var(--sc-surface);
		cursor: pointer;
	}

	.menu-button span {
		width: 18px;
		height: 2px;
		background: var(--sc-ink);
	}

	.topbar-back-button {
		width: 44px;
		height: 44px;
		display: inline-grid;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--sc-border-strong);
		border-radius: 8px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font-size: 1.2rem;
		font-weight: 600;
		text-decoration: none;
	}

	.topbar-back-button:hover {
		border-color: var(--sc-accent-hover);
		background: var(--sc-accent-soft);
		color: var(--sc-link);
	}

	.topbar-title {
		min-width: 0;
		flex: 1;
		display: grid;
		gap: 2px;
	}
	.topbar-tools {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}
	@media (max-width: 760px) {
		.topbar {
			min-height: 64px;
			gap: 6px;
			padding: 0 10px;
		}
		.topbar-title p {
			font-size: 14px;
		}
		.topbar-title span {
			font-size: 12px;
			font-weight: 400;
		}
		.topbar-tools {
			gap: 0;
		}
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
		color: var(--sc-ink);
		font-size: clamp(14px, 1.2vw, 16px);
		font-weight: 600;
	}

	.topbar-title span {
		color: var(--sc-muted);
		font-size: 12px;
		font-weight: 400;
	}

	@media (max-width: 360px) {
		.topbar-title span {
			display: none;
		}
		.topbar-title p {
			white-space: normal;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
			line-height: 18px;
		}
	}
	@media (min-width: 900px) {
		.menu-button {
			display: none;
		}
	}
</style>
