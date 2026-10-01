<script lang="ts">
	import { menuItems } from '$lib/auth/menu';
	import type { CurrentUser, MenuItem } from '$lib/auth/types';
	import ActivityMenuGroup from './ActivityMenuGroup.svelte';
	import type { SidebarActivity } from '$lib/activities/sidebar-activity';
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

{#snippet menuChildren(items: MenuItem[], parentKey: string)}
	{#each items as child (child.label)}
		{#if child.children}
			{@const key = `${parentKey}/${child.label}`}
			{@const active =
				Boolean(child.href && isPathActive(menuHref(child.href), pathname)) ||
				groupHasActiveChild(child, user, pathname)}
			<section class="menu-group">
				{#if child.href}
					<div class="group-heading" class:active>
						<a
							href={menuHref(child.href)}
							onclick={closeMobile}
							aria-current={pathname === menuHref(child.href) ? 'page' : undefined}>{child.label}</a
						>
						<button
							type="button"
							class="group-button group-toggle"
							onclick={() => toggleGroup(key, active)}
							aria-label={`Submeniul ${child.label}`}
							aria-expanded={isGroupOpen(key, active)}
						>
							<span aria-hidden="true">{isGroupOpen(key, active) ? '-' : '+'}</span>
						</button>
					</div>
				{:else}
					<button
						type="button"
						class="group-button"
						class:active
						onclick={() => toggleGroup(key, active)}
						aria-expanded={isGroupOpen(key, active)}
					>
						<span>{child.label}</span>
						<span aria-hidden="true">{isGroupOpen(key, active) ? '-' : '+'}</span>
					</button>
				{/if}
				{#if isGroupOpen(key, active)}
					<div class="group-items">{@render menuChildren(visibleChildren(child, user), key)}</div>
				{/if}
			</section>
		{:else if child.href && !child.disabled}
			{@const href = menuHref(child.href)}
			{@const active =
				child.href === '/admin/finance' ? pathname === href : isPathActive(href, pathname)}
			<a {href} class:active onclick={closeMobile} aria-current={active ? 'page' : undefined}
				>{child.label}</a
			>
		{:else}
			<span class="disabled">{child.label}</span>
		{/if}
	{/each}
{/snippet}

<aside class:open={mobileOpen} class="sidebar" aria-label="Meniu principal">
	<div class="brand">
		<img
			class="brand-mark"
			src="/branding/scouts-cluj.png"
			alt="Centrul Local Scouts Cluj"
			width="40"
			height="43"
		/>
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
							{@render menuChildren(visibleChildren(item, user), item.label)}
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
	<img
		class="oncr-logo"
		src="/branding/oncr.png"
		alt="Organizația Națională Cercetașii României"
		width="190"
		height="61"
	/>
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
		height: auto;
		object-fit: contain;
		flex-shrink: 0;
	}

	.brand p,
	.brand span {
		margin: 0;
	}
	.oncr-logo {
		width: 190px;
		height: auto;
		object-fit: contain;
		align-self: center;
		margin-top: auto;
		padding-top: 12px;
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
	.group-heading {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 38px;
		border-radius: 8px;
	}
	.group-heading a {
		color: inherit;
	}
	.group-toggle {
		justify-content: center;
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
