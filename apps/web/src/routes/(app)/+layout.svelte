<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { menuItems } from '$lib/auth/menu';
	import { hasRole } from '$lib/auth/roles';
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
	const menuHref = (href: AppHref) => {
		switch (href) {
			case '/':
				return resolve('/');
			case '/profile':
				return resolve('/profile');
			case '/admin':
				return resolve('/admin');
			case '/finance':
				return resolve('/finance');
			case '/finance/documents':
				return resolve('/finance/documents');
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
				<a class="profile-link" href={resolve('/profile')}>
					<span class="avatar" aria-hidden="true">{data.user.displayName.slice(0, 1)}</span>
					<span class="profile-name">{data.user.displayName}</span>
				</a>
				<form method="POST" action="/auth/logout">
					<button type="submit" class="logout-button">Logout</button>
				</form>
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
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.profile-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-weight: 800;
	}

	.avatar {
		width: 32px;
		height: 32px;
		font-size: 0.8rem;
	}

	.logout-button {
		min-height: 36px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
		font-weight: 800;
		cursor: pointer;
	}

	.logout-button:hover {
		border-color: #991b1b;
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
		.profile-name {
			display: none;
		}

		.content {
			padding: 16px;
		}
	}
</style>
