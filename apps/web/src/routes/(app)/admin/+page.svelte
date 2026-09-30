<script lang="ts">
	import { resolve } from '$app/paths';
	import { hasRole } from '$lib/auth/roles';

	let { data } = $props();
</script>

<svelte:head>
	<title>Administrare | Scouts Cluj Utilities</title>
</svelte:head>

<section class="admin-page">
	<p class="eyebrow">Admin</p>
	<h1>Administrare</h1>
	<p>Alege zona pe care vrei să o configurezi.</p>

	{#if hasRole(data.user, 'admin') || hasRole(data.user, 'finance_manager')}
		<div class="admin-section">
			<h2>Financiar</h2>
			<a class="module-card" href={resolve('/membership')}>
				<strong>Membri și cotizații</strong>
				<span>Registru ORGO, încasări, restanțe și transferuri naționale.</span>
			</a>
			<a class="module-card" href={resolve('/admin/finance/payment-processor')}>
				<strong>Procesator plăți</strong>
				<span>Alege NETOPIA sau Stripe și gestionează configurația securizată.</span>
			</a>
		</div>
	{/if}
</section>

<style>
	.admin-page {
		max-width: 760px;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 22px;
	}

	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin: 8px 0 0;
		font-size: 2rem;
	}

	p:not(.eyebrow) {
		margin: 10px 0 0;
		color: #52616f;
	}

	.admin-section {
		margin-top: 28px;
	}

	h2 {
		margin: 0 0 12px;
		font-size: 1.2rem;
	}

	.module-card {
		margin-bottom: 12px;
		display: grid;
		gap: 6px;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 16px;
		color: #0f172a;
		text-decoration: none;
	}

	.module-card:hover {
		border-color: #166534;
		background: #f0fdf4;
	}

	.module-card span {
		color: #52616f;
	}
</style>
