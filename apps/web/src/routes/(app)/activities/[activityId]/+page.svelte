<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<section class="overview">
	<div class="panel">
		<p class="panel-title">Prezentare</p>
		{#if data.activity.description}
			<p>{data.activity.description}</p>
		{:else}
			<p>Activitatea nu are încă o descriere.</p>
		{/if}
	</div>

	<div class="action-grid">
		<a href={resolve(`/activities/${data.activity.id}/finance`)}>
			<span>Financiar</span>
			<p>Documente, chitanțe, facturi și registrul activității.</p>
		</a>
		<a href={resolve(`/activities/${data.activity.id}/kitchen`)}>
			<span>Bucătărie</span>
			<p>Mese, rețete, ingrediente, aprovizionare și rapoarte.</p>
		</a>
	</div>
</section>

<style>
	.overview,
	.panel,
	.action-grid {
		display: grid;
		gap: 16px;
	}

	.panel,
	.action-grid a {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.panel-title,
	.action-grid span {
		color: #0f172a;
		font-weight: 900;
	}

	p {
		margin: 0;
		color: #64748b;
	}

	.action-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.action-grid a {
		color: #334155;
		text-decoration: none;
	}

	.action-grid a:hover {
		border-color: #991b1b;
	}

	@media (max-width: 720px) {
		.action-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
