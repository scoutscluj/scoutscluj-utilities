<script lang="ts">
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePageSize from '$lib/components/ui/TablePageSize.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import { enhance } from '$app/forms';
	import { Dialog, DropdownMenu } from 'bits-ui';
	import { toast } from 'svelte-sonner';
	import { formatRole } from '$lib/auth/roles';
	import type { UserRole } from '$lib/auth/types';

	let { data } = $props();
	let search = $state('');
	let roleFilter = $state('');
	let sortDescending = $state(false);
	let currentPage = $state(0);
	let pageSize = $state(25);
	const filteredUsers = $derived(
		data.users
			.filter(
				(user) =>
					(!search ||
						`${user.displayName} ${user.email ?? ''} ${getOrgoHint(user)}`
							.toLocaleLowerCase('ro')
							.includes(search.toLocaleLowerCase('ro'))) &&
					(!roleFilter || user.roles.includes(roleFilter as UserRole))
			)
			.sort((a, b) => (sortDescending ? -1 : 1) * a.displayName.localeCompare(b.displayName, 'ro'))
	);
	const pageCount = $derived(
		Math.max(1, Math.ceil(filteredUsers.length / (pageSize || Math.max(1, filteredUsers.length))))
	);
	const activePage = $derived(Math.min(currentPage, pageCount - 1));
	const visibleUsers = $derived(
		filteredUsers.slice(
			activePage * (pageSize || filteredUsers.length),
			(activePage + 1) * (pageSize || filteredUsers.length)
		)
	);
	let roleDialogOpen = $state(false);
	let selectedUserId = $state<number | null>(null);

	const selectedUser = $derived(data.users.find((user) => user.id === selectedUserId));

	const formatDate = (value?: string) => {
		if (!value) {
			return '-';
		}

		return new Intl.DateTimeFormat('ro-RO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	};

	const getOrgoHint = (user: (typeof data.users)[number]) => {
		const connection = user.orgoConnection;
		if (!connection) {
			return 'Fără Orgo';
		}

		return connection.cardId ?? connection.email ?? connection.orgoUserId?.toString() ?? 'Conectat';
	};

	const getPrimaryRole = (roles: UserRole[]) => {
		if (roles.includes('super_admin')) {
			return 'super_admin';
		}

		if (roles.includes('admin')) {
			return 'admin';
		}

		if (roles.includes('finance_manager')) {
			return 'finance_manager';
		}

		return roles[0];
	};

	const openRoleDialog = (userId: number) => {
		selectedUserId = userId;
		roleDialogOpen = true;
	};

	const copyText = async (value: string, label: string) => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} a fost copiat.`);
		} catch {
			toast.error(`${label} nu a putut fi copiat.`);
		}
	};

	const handleRoleSubmit = () => {
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: { message?: string; success?: boolean } };
			update: () => Promise<void>;
		}) => {
			await update();

			if (result.type !== 'success' && result.type !== 'failure') {
				return;
			}

			const message = result.data?.message ?? 'Operațiunea nu a reușit.';
			if (result.data?.success === false || result.type === 'failure') {
				toast.error(message);
				return;
			}

			toast.success(message);
			roleDialogOpen = false;
		};
	};
</script>

<svelte:head>
	<title>Utilizatori | Scouts Cluj Utilities</title>
</svelte:head>

<section class="users-page">
	<div class="page-heading">
		<div>
			<p class="eyebrow">Admin</p>
			<h1>Utilizatori</h1>
			<p>Roluri pentru utilizatorii care există deja în baza de date.</p>
		</div>
		<div class="count-pill">{data.users.length} utilizatori</div>
	</div>

	<TableToolbar>
		{#snippet filters()}
			<label
				>Caută utilizator<input
					bind:value={search}
					oninput={() => (currentPage = 0)}
					placeholder="Nume, email sau ID Orgo"
				/></label
			>
			<label
				>Rol<select bind:value={roleFilter} onchange={() => (currentPage = 0)}
					><option value="">Toate rolurile</option>{#each data.roleOrder as role (role)}<option
							value={role}>{formatRole(role)}</option
						>{/each}</select
				></label
			>
		{/snippet}
		<TablePageSize
			bind:value={pageSize}
			total={filteredUsers.length}
			onchange={() => (currentPage = 0)}
		/>
	</TableToolbar>
	{#if filteredUsers.length}
		<div class="user-table" role="table" aria-label="Utilizatori">
			<div class="table-header" role="row">
				<span role="columnheader" aria-sort={sortDescending ? 'descending' : 'ascending'}
					><button
						type="button"
						class="sort-button"
						onclick={() => (sortDescending = !sortDescending)}
						>Utilizator {sortDescending ? '↓' : '↑'}</button
					></span
				>
				<span role="columnheader">Orgo</span>
				<span role="columnheader">Roluri</span>
				<span role="columnheader">Notificări</span>
				<span role="columnheader">Ultima autentificare</span>
				<span role="columnheader" class="actions-heading">Acțiuni</span>
			</div>

			<div class="user-list" role="rowgroup">
				{#each visibleUsers as user (user.id)}
					<div class="user-row" role="row">
						<div class="identity" role="cell">
							<div class="avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
							<div class="identity-main">
								<div class="title-line">
									<h2>{user.displayName}</h2>
									<span>ID {user.id}</span>
								</div>
								<span class="email">{user.email ?? 'Fără email'}</span>
							</div>
						</div>

						<div class="muted-cell" role="cell">{getOrgoHint(user)}</div>

						<div class="role-cell" role="cell">
							{#if getPrimaryRole(user.roles)}
								<span class="role-chip primary-role">{formatRole(getPrimaryRole(user.roles))}</span>
								{#if user.roles.length > 1}
									<span class="role-chip extra-role">+{user.roles.length - 1}</span>
								{/if}
							{:else}
								<span class="role-chip">Membru</span>
							{/if}
						</div>

						<div class="notification-cell" role="cell">
							<span
								class:enabled={user.notificationsEnabled}
								class="notification-chip"
								aria-label={`Notificări ${user.notificationsEnabled ? 'activate' : 'dezactivate'}`}
							>
								<span class="status-dot" aria-hidden="true"></span>
								{user.notificationsEnabled ? 'Active' : 'Inactive'}
							</span>
						</div>

						<div class="muted-cell" role="cell">{formatDate(user.lastLoginAt)}</div>

						<div class="actions-cell" role="cell">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger
									class="icon-button"
									aria-label={`Acțiuni pentru ${user.displayName}`}
								>
									<span aria-hidden="true">...</span>
								</DropdownMenu.Trigger>
								<DropdownMenu.Portal>
									<DropdownMenu.Content class="menu-content" sideOffset={6} align="end">
										<DropdownMenu.Item class="menu-item" onclick={() => openRoleDialog(user.id)}>
											Schimbă rolurile
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="menu-item"
											disabled={!user.email}
											onclick={() => user.email && copyText(user.email, 'Emailul')}
										>
											Copiază emailul
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="menu-item"
											disabled={!user.orgoConnection?.orgoUserId}
											onclick={() =>
												user.orgoConnection?.orgoUserId &&
												copyText(user.orgoConnection.orgoUserId.toString(), 'ID-ul Orgo')}
										>
											Copiază ID-ul Orgo
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="empty-state">
			<h2>
				{data.users.length
					? 'Niciun utilizator pentru filtrele alese.'
					: 'Nu există utilizatori încă.'}
			</h2>
			<p>
				{data.users.length
					? 'Modifică termenul de căutare sau filtrul de rol.'
					: 'Utilizatorii apar aici după prima autentificare prin Orgo.'}
			</p>
		</div>
	{/if}
	<TablePagination
		bind:page={currentPage}
		{pageSize}
		total={filteredUsers.length}
		loadedTotal={data.users.length}
		label="Paginile utilizatorilor"
	/>
</section>

<Dialog.Root bind:open={roleDialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="dialog-overlay" />
		<Dialog.Content class="dialog-content">
			{#if selectedUser}
				<div class="dialog-heading">
					<div>
						<Dialog.Title class="dialog-title"
							>Roluri pentru {selectedUser.displayName}</Dialog.Title
						>
						<Dialog.Description class="dialog-description">
							ID {selectedUser.id} · {selectedUser.email ?? getOrgoHint(selectedUser)}
						</Dialog.Description>
					</div>
					<Dialog.Close class="close-button" aria-label="Închide dialogul">×</Dialog.Close>
				</div>

				<form
					class="dialog-form"
					method="POST"
					action="?/updateRoles"
					use:enhance={handleRoleSubmit}
				>
					<input type="hidden" name="userId" value={selectedUser.id} />
					<fieldset>
						<legend>Roluri</legend>
						<div class="role-options">
							{#each data.roleOrder as role (role)}
								<label>
									<input
										type="checkbox"
										name="roles"
										value={role}
										checked={selectedUser.roles.includes(role)}
									/>
									<span>{formatRole(role)}</span>
								</label>
							{/each}
						</div>
					</fieldset>

					<div class="dialog-actions">
						<Dialog.Close class="secondary-button" type="button">Anulează</Dialog.Close>
						<button type="submit">Salvează rolurile</button>
					</div>
				</form>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	.sort-button {
		padding: 0;
		border: 0;
		font-size: inherit;
		text-transform: inherit;
	}

	.users-page {
		display: grid;
		gap: 18px;
	}

	.page-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
	}

	.eyebrow,
	h1,
	h2,
	p {
		margin: 0;
	}

	.eyebrow {
		color: var(--sc-muted);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin-top: 6px;
		font-size: 2rem;
	}

	h2 {
		min-width: 0;
		overflow-wrap: anywhere;
		font-size: 0.96rem;
	}

	.page-heading p:not(.eyebrow),
	.email,
	.muted-cell,
	.empty-state p {
		color: var(--sc-muted);
	}

	.count-pill {
		min-height: 34px;
		display: inline-flex;
		align-items: center;
		border: 1px solid var(--sc-border);
		border-radius: 999px;
		background: var(--sc-surface);
		padding: 0 12px;
		color: var(--sc-ink);
		font-size: 0.9rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.user-table,
	.empty-state {
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
	}

	.table-header,
	.user-row {
		display: grid;
		grid-template-columns:
			minmax(240px, 1.5fr) minmax(110px, 0.65fr) minmax(130px, 0.75fr) minmax(110px, 0.6fr)
			minmax(175px, 0.85fr) 48px;
		align-items: center;
		gap: 12px;
	}

	.table-header {
		min-height: 38px;
		border-bottom: 1px solid var(--sc-border);
		padding: 0 12px;
		color: var(--sc-muted);
		font-size: 0.76rem;
		font-weight: 600;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.actions-heading {
		text-align: right;
	}

	.user-list {
		display: grid;
	}

	.user-row {
		min-height: 70px;
		padding: 10px 12px;
		border-bottom: 1px solid var(--sc-border);
		transition:
			background-color 160ms ease,
			box-shadow 160ms ease;
	}

	.user-row:last-child {
		border-bottom: 0;
	}

	.user-row:hover {
		background: var(--sc-canvas);
		box-shadow: inset 3px 0 0 var(--sc-accent);
	}

	.identity {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.avatar {
		width: 36px;
		height: 36px;
		flex: 0 0 auto;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--sc-accent);
		color: var(--sc-surface);
		font-weight: 600;
	}

	.identity-main {
		min-width: 0;
		display: grid;
		gap: 2px;
	}

	.title-line {
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
	}

	.title-line span {
		color: var(--sc-muted);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.email,
	.muted-cell {
		min-width: 0;
		overflow: hidden;
		font-size: 0.9rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.role-cell {
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.role-chip {
		min-height: 24px;
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		background: var(--sc-inset);
		padding: 0 9px;
		color: var(--sc-ink);
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.primary-role {
		background: var(--sc-accent-soft);
		color: var(--sc-accent-hover);
	}

	.extra-role {
		background: #eef2ff;
		color: #3730a3;
	}

	.notification-chip {
		min-height: 24px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border-radius: 999px;
		background: var(--sc-inset);
		padding: 0 9px;
		color: var(--sc-muted);
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.notification-chip.enabled {
		background: #ecfdf5;
		color: #166534;
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: #94a3b8;
	}

	.notification-chip.enabled .status-dot {
		background: #16a34a;
	}

	.actions-cell {
		display: flex;
		justify-content: flex-end;
	}

	button,
	:global(.icon-button),
	:global(.close-button),
	:global(.secondary-button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	:global(.icon-button) {
		width: 34px;
		height: 34px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--sc-ink);
		font-size: 1.1rem;
		line-height: 1;
	}

	:global(.icon-button:hover),
	:global(.icon-button[data-state='open']) {
		border-color: var(--sc-border);
		background: var(--sc-canvas);
	}

	button:focus-visible,
	:global(.icon-button:focus-visible),
	:global(.menu-item:focus-visible),
	:global(.close-button:focus-visible),
	:global(.secondary-button:focus-visible) {
		outline: 3px solid rgb(200 30 30 / 0.24);
		outline-offset: 2px;
	}

	:global(.menu-content) {
		z-index: 60;
		min-width: 180px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 5px;
		box-shadow: 0 16px 40px rgb(15 23 42 / 0.14);
	}

	:global(.menu-item) {
		min-height: 34px;
		display: flex;
		align-items: center;
		border-radius: 6px;
		padding: 0 9px;
		color: var(--sc-ink);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	:global(.menu-item:hover),
	:global(.menu-item[data-highlighted]) {
		background: var(--sc-accent-soft);
		color: var(--sc-accent-hover);
	}

	:global(.menu-item[data-disabled]) {
		color: #94a3b8;
		cursor: not-allowed;
	}

	:global(.dialog-overlay) {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgb(15 23 42 / 0.38);
	}

	:global(.dialog-content) {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 60;
		width: min(460px, calc(100vw - 32px));
		max-height: calc(100dvh - 48px);
		overflow: auto;
		display: grid;
		gap: 18px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 18px;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.22);
		transform: translate(-50%, -50%);
	}

	.dialog-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	:global(.dialog-title) {
		margin: 0;
		font-size: 1.12rem;
		font-weight: 600;
	}

	:global(.dialog-description) {
		margin-top: 4px;
		color: var(--sc-muted);
		font-size: 0.92rem;
	}

	:global(.close-button) {
		width: 32px;
		height: 32px;
		border: 1px solid transparent;
		background: var(--sc-surface);
		color: var(--sc-muted);
		font-size: 1.35rem;
		line-height: 1;
	}

	:global(.close-button:hover) {
		border-color: var(--sc-border);
		background: var(--sc-canvas);
	}

	.dialog-form {
		display: grid;
		gap: 16px;
	}

	fieldset {
		min-width: 0;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		padding: 12px;
	}

	legend {
		padding: 0 4px;
		color: var(--sc-ink);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.role-options {
		display: grid;
		gap: 10px;
	}

	label {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--sc-ink);
		font-size: 0.95rem;
		font-weight: 600;
	}

	input[type='checkbox'] {
		width: 17px;
		height: 17px;
		accent-color: var(--sc-accent);
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	button,
	:global(.secondary-button) {
		min-height: 38px;
		border: 0;
		padding: 0 14px;
	}

	button {
		background: var(--sc-accent);
		color: var(--sc-surface);
	}

	:global(.secondary-button) {
		border: 1px solid var(--sc-border);
		background: var(--sc-surface);
		color: var(--sc-ink);
	}

	.empty-state {
		padding: 22px;
	}

	.empty-state p {
		margin-top: 6px;
	}

	@media (max-width: 960px) {
		.table-header {
			display: none;
		}

		.user-row {
			grid-template-columns: minmax(0, 1fr) 42px;
			gap: 10px;
		}

		.identity {
			grid-column: 1;
		}

		.muted-cell,
		.notification-cell,
		.role-cell {
			grid-column: 1;
			margin-left: 46px;
		}

		.actions-cell {
			grid-column: 2;
			grid-row: 1;
		}
	}

	@media (max-width: 680px) {
		.page-heading {
			display: grid;
			align-items: start;
		}

		.user-row {
			min-height: 0;
			padding: 12px;
		}

		.dialog-actions {
			display: grid;
		}

		button,
		:global(.secondary-button) {
			width: 100%;
		}
	}
</style>
