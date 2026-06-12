<script lang="ts">
	import { formatRole } from '$lib/auth/roles';

	let { data } = $props();

	const user = $derived(data.user);
	const connection = $derived(user.orgoConnection);
	const roles = $derived(user.roles);
</script>

<svelte:head>
	<title>Profil | Scouts Cluj Utilities</title>
</svelte:head>

<section class="profile-header">
	<div class="avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
	<div>
		<p class="eyebrow">Profil</p>
		<h1>{user.displayName}</h1>
		<p>{user.email ?? 'Email indisponibil'}</p>
	</div>
</section>

<section class="profile-grid" aria-label="Detalii profil">
	<article>
		<h2>Roluri</h2>
		{#if roles.length}
			<div class="chips">
				{#each roles as role (role)}
					<span>{formatRole(role)}</span>
				{/each}
			</div>
		{:else}
			<p>Membru autentificat fara rol administrativ.</p>
		{/if}
	</article>

	<article>
		<h2>Conexiune Orgo</h2>
		<dl>
			<div>
				<dt>Status</dt>
				<dd>Conectat</dd>
			</div>
			<div>
				<dt>Card ID</dt>
				<dd>{connection?.cardId ?? '-'}</dd>
			</div>
			<div>
				<dt>Orgo ID</dt>
				<dd>{connection?.orgoUserId ?? '-'}</dd>
			</div>
			<div>
				<dt>Ultimul login</dt>
				<dd>{connection?.lastLoginAt ?? '-'}</dd>
			</div>
		</dl>
	</article>
</section>

<form method="POST" action="/auth/logout" class="logout-form">
	<button type="submit">Logout</button>
</form>

<style>
	.profile-header {
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.avatar {
		width: 64px;
		height: 64px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #c81e1e;
		color: #ffffff;
		font-size: 1.6rem;
		font-weight: 900;
	}

	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1,
	.profile-header p {
		margin: 0;
	}

	h1 {
		margin-top: 6px;
		font-size: 2rem;
	}

	.profile-header p:not(.eyebrow) {
		margin-top: 4px;
		color: #64748b;
	}

	.profile-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin-top: 28px;
	}

	article {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
	}

	h2 {
		margin: 0 0 14px;
		font-size: 1.05rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chips span {
		border-radius: 999px;
		background: #fef2f2;
		color: #991b1b;
		padding: 8px 12px;
		font-weight: 800;
	}

	dl,
	dd {
		margin: 0;
	}

	dl {
		display: grid;
		gap: 12px;
	}

	dl div {
		display: flex;
		justify-content: space-between;
		gap: 18px;
		border-bottom: 1px solid #edf1f5;
		padding-bottom: 10px;
	}

	dt {
		color: #64748b;
		font-weight: 750;
	}

	dd {
		font-weight: 850;
		text-align: right;
		overflow-wrap: anywhere;
	}

	.logout-form {
		margin-top: 18px;
	}

	.logout-form button {
		min-height: 40px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 14px;
		color: #334155;
		font-weight: 800;
		cursor: pointer;
	}

	.logout-form button:hover {
		border-color: #991b1b;
		color: #991b1b;
	}

	@media (max-width: 760px) {
		.profile-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
