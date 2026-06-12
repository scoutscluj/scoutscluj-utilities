<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatRole } from '$lib/auth/roles';

	let { data } = $props();

	const connection = $derived(data.user.orgoConnection);
	const roles = $derived(data.user.roles);
</script>

<svelte:head>
	<title>Dashboard | Scouts Cluj Utilities</title>
</svelte:head>

<section class="page-header">
	<p class="eyebrow">Dashboard</p>
	<h1>Bun venit, {data.user.displayName}</h1>
	<p>Ai acces la noua platforma Scouts Cluj Utilities.</p>
</section>

<section class="status-grid" aria-label="Status cont">
	<article>
		<p class="label">Sesiune</p>
		<strong>Autentificat prin Orgo</strong>
		<span>{data.user.email ?? 'Email indisponibil'}</span>
	</article>
	<article>
		<p class="label">Roluri</p>
		<strong>{roles.length ? roles.map(formatRole).join(', ') : 'Membru'}</strong>
		<span>Accesul administrativ este controlat din API.</span>
	</article>
	<article>
		<p class="label">Orgo</p>
		<strong>{connection?.cardId ?? connection?.orgoUserId ?? 'Conectat'}</strong>
		<span
			>{connection?.lastLoginAt
				? `Ultimul login: ${connection.lastLoginAt}`
				: 'Conexiune activa'}</span
		>
	</article>
</section>

<section class="module-list" aria-label="Module">
	<h2>Module disponibile</h2>
	<div>
		<a href={resolve('/profile')}>Profil utilizator</a>
		{#if roles.length}
			<a href={resolve('/admin')}>Administrare</a>
		{/if}
	</div>
</section>

<style>
	.page-header {
		max-width: 760px;
	}

	.eyebrow,
	.label {
		margin: 0;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin: 8px 0 0;
		font-size: 2.2rem;
		line-height: 1.1;
	}

	.page-header p:not(.eyebrow) {
		margin: 12px 0 0;
		color: #52616f;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 28px;
	}

	article,
	.module-list {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
	}

	article strong,
	article span {
		display: block;
	}

	article strong {
		margin-top: 10px;
		font-size: 1.1rem;
	}

	article span {
		margin-top: 6px;
		color: #64748b;
		overflow-wrap: anywhere;
	}

	.module-list {
		margin-top: 18px;
	}

	.module-list h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.module-list div {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 14px;
	}

	.module-list a {
		display: inline-flex;
		align-items: center;
		min-height: 38px;
		border-radius: 8px;
		background: #17202a;
		color: #ffffff;
		padding: 0 14px;
		text-decoration: none;
		font-weight: 800;
	}

	@media (max-width: 860px) {
		.status-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
