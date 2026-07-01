<script lang="ts">
	import { menuItems } from '$lib/auth/menu';
	import type { CurrentUser } from '$lib/auth/types';
	import ActivityMenuGroup from './ActivityMenuGroup.svelte';
	import type { SidebarActivity } from './+layout.server';
	import {
		activitiesGroupKey,
		canSee,
		groupHasActiveChild,
		isPathActive,
		menuHref,
		visibleChildren
	} from './app-shell';

	type Props = {
		user: CurrentUser;
		sidebarActivities: SidebarActivity[];
		pathname: string;
		mobileOpen: boolean;
		closeMobile: () => void;
	};

	let { user, sidebarActivities, pathname, mobileOpen, closeMobile }: Props = $props();
	let openGroups = $state<Record<string, boolean | undefined>>({});

	const visibleItems = $derived(
		menuItems.filter((item) => {
			if (!canSee(item, user)) return false;
			return item.children ? visibleChildren(item, user).length > 0 : true;
		})
	);
	const activitiesAreActive = $derived(isPathActive(menuHref('/activities'), pathname));

	const isGroupOpen = (label: string, defaultOpen = false) => openGroups[label] ?? defaultOpen;
	const toggleGroup = (label: string, defaultOpen = false) => {
		openGroups[label] = !(openGroups[label] ?? defaultOpen);
	};
</script>

<aside class:open={mobileOpen} class="sidebar" aria-label="Meniu principal">
	<div class="brand">
		<div class="brand-mark" aria-hidden="true">SC</div>
		<div>
			<p>Scouts Cluj</p>
			<span>Utilities</span>
		</div>
	</div>

	<nav>
		{#each visibleItems as item (item.label)}
			{#if item.href === '/activities'}
				<ActivityMenuGroup
					label={item.label}
					{user}
					activities={sidebarActivities}
					{pathname}
					open={isGroupOpen(activitiesGroupKey, activitiesAreActive)}
					active={activitiesAreActive}
					toggle={() => toggleGroup(activitiesGroupKey, activitiesAreActive)}
					{closeMobile}
				/>
			{:else if item.children}
				{@const groupActive = groupHasActiveChild(item, user, pathname)}
				<section class="menu-group">
					<button
						type="button"
						class="group-button"
						onclick={() => toggleGroup(item.label, groupActive)}
						aria-expanded={isGroupOpen(item.label, groupActive)}
					>
						<span>{item.label}</span>
						<span aria-hidden="true">{isGroupOpen(item.label, groupActive) ? '-' : '+'}</span>
					</button>
					{#if isGroupOpen(item.label, groupActive)}
						<div class="group-items">
							{#each visibleChildren(item, user) as child (child.label)}
								{#if child.href && !child.disabled}
									<a
										href={menuHref(child.href)}
										class:active={isPathActive(menuHref(child.href), pathname)}
										onclick={closeMobile}
										aria-current={isPathActive(menuHref(child.href), pathname) ? 'page' : undefined}
									>
										{child.label}
									</a>
								{:else}
									<span class="disabled">{child.label}</span>
								{/if}
							{/each}
						</div>
					{/if}
				</section>
			{:else if item.href && !item.disabled}
				<a
					href={menuHref(item.href)}
					class="nav-link"
					class:active={isPathActive(menuHref(item.href), pathname)}
					onclick={closeMobile}
					aria-current={isPathActive(menuHref(item.href), pathname) ? 'page' : undefined}
				>
					{item.label}
				</a>
			{:else}
				<span class="nav-link disabled">{item.label}</span>
			{/if}
		{/each}
	</nav>
</aside>

<style>
	.sidebar {
		position: fixed;
		inset: 0 auto 0 0;
		z-index: 20;
		width: 260px;
		display: flex;
		flex-direction: column;
		gap: 18px;
		border-right: 1px solid #d8dee6;
		background: #ffffff;
		padding: 18px 14px;
		overflow-y: auto;
		transform: translateX(-100%);
		transition: transform 160ms ease;
	}

	.sidebar.open {
		transform: translateX(0);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 8px 14px;
		border-bottom: 1px solid #edf1f5;
	}

	.brand-mark {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #c81e1e;
		color: #ffffff;
		font-weight: 900;
	}

	.brand p,
	.brand span {
		margin: 0;
	}

	.brand p {
		font-weight: 900;
	}

	.brand span {
		color: #64748b;
		font-size: 0.82rem;
	}

	nav,
	.menu-group,
	.group-items {
		display: grid;
		gap: 4px;
	}

	.nav-link,
	.group-button,
	.group-items a,
	.disabled {
		min-height: 38px;
		display: flex;
		align-items: center;
		border-radius: 8px;
		padding: 0 12px;
		color: #334155;
		text-decoration: none;
		font-size: 0.94rem;
		font-weight: 750;
	}

	.group-button {
		width: 100%;
		justify-content: space-between;
		border: 0;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}

	.nav-link:hover,
	.group-button:hover,
	.group-items a:hover,
	.active {
		background: #fef2f2;
		color: #991b1b;
	}

	.group-items {
		margin-left: 10px;
		padding-left: 8px;
		border-left: 1px solid #e2e8f0;
	}

	.disabled {
		color: #94a3b8;
		cursor: not-allowed;
	}

	@media (min-width: 900px) {
		.sidebar {
			position: sticky;
			transform: none;
		}
	}
</style>
