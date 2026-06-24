<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	const cards = $derived([
		{ label: 'Documente totale', value: data.summary.totalDocuments },
		{ label: 'Deschise', value: data.summary.openDocuments },
		{ label: 'Necesită clarificări', value: data.summary.needsClarification },
		{ label: 'Trimise', value: data.summary.sentDocuments }
	]);

	const handoffLabel = $derived(
		data.settings.keezHandoffMode === 'direct_to_keez'
			? 'Trimitere directă către Keez'
			: 'Verificare internă înainte de Keez'
	);
</script>

<svelte:head>
	<title>Panou financiar | Scouts Cluj Utilities</title>
</svelte:head>

<section class="finance-dashboard">
	<div class="page-heading">
		<div>
			<p class="eyebrow">Financiar</p>
			<h1>Panou financiar</h1>
			<p>Privire rapidă peste documentele care trebuie gestionate.</p>
		</div>
		<a href={resolve('/finance/documents')}>Documente financiare</a>
	</div>

	<div class="stats-grid">
		{#each cards as card (card.label)}
			<article class="stat-card">
				<span>{card.label}</span>
				<strong>{card.value}</strong>
			</article>
		{/each}
	</div>

	<section class="settings-band">
		<div>
			<p class="eyebrow">Keez</p>
			<h2>{handoffLabel}</h2>
			<p>
				{data.settings.keezConfigured
					? 'Credentialele sunt configurate.'
					: 'Credentialele nu sunt configurate.'}
				{data.settings.keezDocumentUploadAvailable
					? ' Încărcarea automată este disponibilă.'
					: ' Încărcarea automată a documentelor este în așteptare.'}
			</p>
		</div>
		<a href={resolve('/finance/documents')}>Setări Keez</a>
	</section>
</section>

<style>
	.finance-dashboard {
		display: grid;
		gap: 22px;
	}

	.page-heading,
	.settings-band {
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
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin-top: 6px;
		font-size: 2rem;
	}

	h2 {
		margin-top: 4px;
		font-size: 1.2rem;
	}

	.page-heading p:not(.eyebrow),
	.settings-band p,
	.stat-card span {
		color: #52616f;
	}

	.page-heading a,
	.settings-band a {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 12px;
		font-weight: 900;
		text-decoration: none;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.stat-card,
	.settings-band {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
	}

	.stat-card {
		display: grid;
		gap: 10px;
	}

	.stat-card span {
		font-weight: 850;
	}

	.stat-card strong {
		font-size: 2rem;
	}

	@media (min-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@media (max-width: 620px) {
		.page-heading,
		.settings-band {
			display: grid;
			align-items: start;
		}

		.stats-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.page-heading a,
		.settings-band a {
			width: 100%;
		}
	}
</style>
