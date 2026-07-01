<script lang="ts">
	import { resolve } from '$app/paths';
	import { DropdownMenu } from 'bits-ui';
	import { pwa } from '$lib/pwa/pwa.svelte';
	import type { CurrentUser } from '$lib/auth/types';

	type Props = {
		user: CurrentUser;
	};

	let { user }: Props = $props();

	const userInitial = $derived(user.displayName.slice(0, 1).toUpperCase());
	const statusLabel = $derived(pwa.isOffline ? 'Offline' : 'Online');
	const statusTitle = $derived(
		pwa.isOffline ? 'Conexiunea nu este disponibilă' : 'Conexiune activă'
	);
</script>

<div class="profile-menu">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="profile-trigger"
			aria-label={`Deschide meniul profilului pentru ${user.displayName}`}
		>
			<span class="avatar" aria-hidden="true">{userInitial}</span>
			<span class="profile-status-dot" class:offline={pwa.isOffline} aria-hidden="true"></span>
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content class="profile-menu-content" sideOffset={8} align="end">
				<div class="profile-menu-heading">
					<span class="profile-heading-main">
						<span class="avatar large-avatar" aria-hidden="true">{userInitial}</span>
						<span class="profile-identity">
							<strong>{user.displayName}</strong>
							<span>{user.email ?? 'Cont Scouts Cluj'}</span>
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

<style>
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
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #c81e1e;
		color: #ffffff;
		font-size: 0.8rem;
		font-weight: 900;
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
</style>
