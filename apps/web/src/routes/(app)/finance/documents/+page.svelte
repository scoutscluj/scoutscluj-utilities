<script lang="ts">
	import { resolve } from '$app/paths';
	import FinanceSettingsForm from './FinanceSettingsForm.svelte';
	import FinancialDocumentUploadForm from './FinancialDocumentUploadForm.svelte';
	import FinancialDocumentRegistryRow from './FinancialDocumentRegistryRow.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Documente financiare | Scouts Cluj Utilities</title>
</svelte:head>

<section class="finance-documents">
	<div class="page-heading">
		<p class="eyebrow">Financiar</p>
		<h1>Documente financiare</h1>
		<p>Bonuri, facturi și dovezi de plată pentru responsabilul financiar.</p>
	</div>

	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<div class="top-grid">
		<FinancialDocumentUploadForm
			activities={data.activities}
			handoffMode={data.handoffGuidance.keezHandoffMode}
		/>

		{#if data.isFinanceManager && data.settings}
			<FinanceSettingsForm settings={data.settings} />
		{/if}
	</div>

	<section class="documents-section">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Registru</p>
				<h2>{data.isFinanceManager ? 'Toate documentele' : 'Documentele mele'}</h2>
			</div>
			{#if data.isFinanceManager}
				<a href={resolve('/finance')}>Panou financiar</a>
			{/if}
		</div>

		{#if data.documents.length}
			<div class="document-list">
				{#each data.documents as document (document.id)}
					<FinancialDocumentRegistryRow {document} isFinanceManager={data.isFinanceManager} />
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<h3>Nu există documente încă.</h3>
				<p>Primul document încărcat va apărea aici.</p>
			</div>
		{/if}
	</section>
</section>

<style>
	.finance-documents,
	.documents-section,
	.document-list {
		display: grid;
		gap: 22px;
	}

	.page-heading,
	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
	}

	.page-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.eyebrow,
	h1,
	h2,
	h3,
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
		font-size: clamp(1.75rem, 2rem, 2.25rem);
	}

	h2 {
		margin-top: 4px;
		font-size: 1.35rem;
	}

	.page-heading p:not(.eyebrow),
	.empty-state p {
		color: #52616f;
	}

	.form-message {
		border: 1px solid #badbcc;
		border-radius: 8px;
		background: #f0fdf4;
		padding: 12px 14px;
		color: #166534;
		font-weight: 800;
	}

	.top-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}

	.empty-state {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
	}

	.section-heading a {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 900;
		text-decoration: none;
	}

	.section-heading a {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
	}

	.empty-state {
		padding: 22px;
	}

	@media (min-width: 820px) {
		.top-grid {
			grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
		}
	}

	@media (max-width: 620px) {
		.page-heading,
		.section-heading {
			display: grid;
			align-items: start;
			justify-content: stretch;
		}

		.section-heading a {
			width: 100%;
		}
	}
</style>
