<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { DropdownMenu } from 'bits-ui';
	import { menuItems } from '$lib/auth/menu';
	import { hasRole } from '$lib/auth/roles';
	import { pwa } from '$lib/pwa/pwa.svelte';
	import type { AppHref, CurrentUser, MenuItem } from '$lib/auth/types';

	let { data, children } = $props();
	let mobileOpen = $state(false);
	let openGroups = $state<Record<string, boolean>>({});

	const canSee = (item: MenuItem, user: CurrentUser) =>
		!item.minRole || hasRole(user, item.minRole);
	const visibleChildren = (item: MenuItem, user: CurrentUser) =>
		item.children?.filter((child) => canSee(child, user)) ?? [];
	const visibleItems = $derived(
		menuItems.filter((item) => {
			if (!canSee(item, data.user)) {
				return false;
			}

			if (item.children) {
				return visibleChildren(item, data.user).length > 0;
			}

			return true;
		})
	);

	const isActive = (href?: string) => {
		if (!href) {
			return false;
		}

		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	};
	const userInitial = $derived(data.user.displayName.slice(0, 1).toUpperCase());
	const statusLabel = $derived(pwa.isOffline ? 'Offline' : 'Online');
	const statusTitle = $derived(
		pwa.isOffline ? 'Conexiunea nu este disponibilă' : 'Conexiune activă'
	);
	const menuHref = (href: AppHref) => {
		switch (href) {
			case '/':
				return resolve('/');
			case '/profile':
				return resolve('/profile');
			case '/admin':
				return resolve('/admin');
			case '/admin/users':
				return resolve('/admin/users');
			case '/admin/notifications':
				return resolve('/admin/notifications');
			case '/audit':
				return resolve('/audit');
			case '/activities':
				return resolve('/activities');
			case '/finance':
				return resolve('/finance');
			case '/finance/documents':
				return resolve('/finance/documents');
			case '/info/statut':
				return resolve('/info/statut');
			case '/programe/regulamente':
				return resolve('/programe/regulamente');
			case '/sediu/regulament':
				return resolve('/sediu/regulament');
		}
	};

	const toggleGroup = (label: string) => {
		openGroups[label] = !openGroups[label];
	};

	const closeMobile = () => {
		mobileOpen = false;
	};
</script>

<div class="app-shell">
	{#if mobileOpen}
		<button class="scrim" type="button" aria-label="Închide meniul" onclick={closeMobile}></button>
	{/if}

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
				{#if item.children}
					<section class="menu-group">
						<button type="button" class="group-button" onclick={() => toggleGroup(item.label)}>
							<span>{item.label}</span>
							<span aria-hidden="true">{openGroups[item.label] ? '-' : '+'}</span>
						</button>
						{#if openGroups[item.label]}
							<div class="group-items">
								{#each visibleChildren(item, data.user) as child (child.label)}
									{#if child.href && !child.disabled}
										<a
											href={menuHref(child.href)}
											class:active={isActive(child.href)}
											onclick={closeMobile}
											aria-current={isActive(child.href) ? 'page' : undefined}
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
						class:active={isActive(item.href)}
						onclick={closeMobile}
						aria-current={isActive(item.href) ? 'page' : undefined}
					>
						{item.label}
					</a>
				{:else}
					<span class="nav-link disabled">{item.label}</span>
				{/if}
			{/each}
		</nav>
	</aside>

	<div class="workspace">
		<header class="topbar">
			<button
				type="button"
				class="menu-button"
				aria-label="Deschide meniul"
				aria-expanded={mobileOpen}
				onclick={() => (mobileOpen = true)}
			>
				<span></span>
				<span></span>
				<span></span>
			</button>

			<a class="title-link" href={resolve('/')}>Resurse Scouts Cluj</a>

			<div class="profile-menu">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="profile-trigger"
						aria-label={`Deschide meniul profilului pentru ${data.user.displayName}`}
					>
						<span class="avatar" aria-hidden="true">{userInitial}</span>
						<span class="profile-status-dot" class:offline={pwa.isOffline} aria-hidden="true"
						></span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content class="profile-menu-content" sideOffset={8} align="end">
							<div class="profile-menu-heading">
								<span class="profile-heading-main">
									<span class="avatar large-avatar" aria-hidden="true">{userInitial}</span>
									<span class="profile-identity">
										<strong>{data.user.displayName}</strong>
										<span>{data.user.email ?? 'Cont Scouts Cluj'}</span>
									</span>
								</span>
								<span class="status-badge" class:offline={pwa.isOffline} title={statusTitle}>
									<span aria-hidden="true"></span>
									{statusLabel}
								</span>
							</div>

							<DropdownMenu.Separator class="profile-menu-separator" />

							<DropdownMenu.Group aria-label="Cont utilizator">
								<DropdownMenu.Item class="profile-menu-item" textValue="Profil">
									{#snippet child({ props })}
										<a {...props} href={resolve('/profile')}>Profil</a>
									{/snippet}
								</DropdownMenu.Item>
								<form method="POST" action={resolve('/auth/logout')} class="profile-logout-form">
									<DropdownMenu.Item class="profile-menu-item danger" textValue="Logout">
										{#snippet child({ props })}
											<button {...props} type="submit">Logout</button>
										{/snippet}
									</DropdownMenu.Item>
								</form>
							</DropdownMenu.Group>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>
		</header>

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
		transform: translateX(-100%);
		transition: transform 160ms ease;
	}

	.sidebar.open {
		transform: translateX(0);
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 10;
		border: 0;
		background: rgb(15 23 42 / 0.36);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 8px 14px;
		border-bottom: 1px solid #edf1f5;
	}

	.brand-mark,
	.avatar {
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #c81e1e;
		color: #ffffff;
		font-weight: 900;
	}

	.brand-mark {
		width: 40px;
		height: 40px;
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

	.workspace {
		width: 100%;
		min-width: 0;
	}

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

	.title-link {
		font-weight: 900;
		text-decoration: none;
	}

	.profile-menu {
		margin-left: auto;
		display: grid;
		place-items: center;
	}

	:global(.profile-trigger) {
		position: relative;
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border: 1px solid transparent;
		border-radius: 999px;
		background: transparent;
		padding: 0;
		cursor: pointer;
	}

	:global(.profile-trigger:hover),
	:global(.profile-trigger[data-state='open']) {
		border-color: #d8dee6;
		background: #f8fafc;
	}

	:global(.profile-trigger:focus-visible),
	:global(.profile-menu-item:focus-visible) {
		outline: 3px solid rgb(200 30 30 / 0.24);
		outline-offset: 2px;
	}

	.avatar {
		width: 32px;
		height: 32px;
		font-size: 0.8rem;
	}

	.large-avatar {
		width: 38px;
		height: 38px;
		font-size: 0.9rem;
	}

	.profile-status-dot {
		position: absolute;
		right: 5px;
		bottom: 5px;
		width: 11px;
		height: 11px;
		border: 2px solid #ffffff;
		border-radius: 999px;
		background: #16a34a;
	}

	.profile-status-dot.offline {
		background: #f59e0b;
	}

	:global(.profile-menu-content) {
		z-index: 60;
		width: min(280px, calc(100vw - 24px));
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 6px;
		box-shadow: 0 16px 40px rgb(15 23 42 / 0.14);
	}

	.profile-menu-heading {
		display: grid;
		gap: 10px;
		padding: 8px;
	}

	.profile-heading-main {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.profile-identity {
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	.profile-identity strong,
	.profile-identity span {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.profile-identity strong {
		color: #17202a;
		font-size: 0.95rem;
		font-weight: 900;
	}

	.profile-identity span {
		color: #64748b;
		font-size: 0.84rem;
		font-weight: 750;
	}

	.status-badge {
		width: fit-content;
		min-height: 28px;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		background: #ffffff;
		padding: 0 9px;
		color: #475569;
		font-size: 0.78rem;
		font-weight: 850;
		white-space: nowrap;
	}

	.status-badge span {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #16a34a;
	}

	.status-badge.offline {
		border-color: #f59e0b;
		background: #fffbeb;
		color: #92400e;
	}

	.status-badge.offline span {
		background: #f59e0b;
	}

	:global(.profile-menu-separator) {
		height: 1px;
		margin: 4px 2px;
		background: #edf1f5;
	}

	.profile-logout-form {
		margin: 0;
	}

	:global(.profile-menu-item) {
		width: 100%;
		min-height: 36px;
		display: flex;
		align-items: center;
		border: 0;
		border-radius: 6px;
		background: transparent;
		padding: 0 9px;
		color: #17202a;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 850;
		cursor: pointer;
	}

	:global(.profile-menu-item:hover),
	:global(.profile-menu-item[data-highlighted]) {
		background: #fef2f2;
		color: #991b1b;
	}

	:global(.profile-menu-item.danger) {
		color: #334155;
	}

	:global(.profile-menu-item.danger:hover),
	:global(.profile-menu-item.danger[data-highlighted]) {
		background: #fef2f2;
		color: #991b1b;
	}

	.content {
		padding: 24px;
	}

	@media (min-width: 900px) {
		.sidebar {
			position: sticky;
			transform: none;
		}

		.scrim,
		.menu-button {
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
