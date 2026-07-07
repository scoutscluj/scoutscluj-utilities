<script lang="ts">
	import { resolve } from '$app/paths';
	import ActivityFinanceDocumentRow from './ActivityFinanceDocumentRow.svelte';

	let { data, form } = $props();
</script>

<section class="finance-tab">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<div class="summary-grid" aria-label="Sumar financiar">
		<div>
			<span>{data.activity.financeSummary.totalDocuments}</span>
			<p>Documente</p>
		</div>
		<div>
			<span>{data.activity.financeSummary.openDocuments}</span>
			<p>Deschise</p>
		</div>
		<div>
			<span>{data.activity.financeSummary.sentDocuments}</span>
			<p>Trimise</p>
		</div>
		<div>
			<span>{data.activity.financeSummary.needsClarification}</span>
			<p>Clarificări</p>
		</div>
	</div>

	<div class="content-grid">
		<form class="panel upload-panel" method="POST" action="?/upload" enctype="multipart/form-data">
			<div>
				<p class="panel-title">Document financiar</p>
				<p class="panel-subtitle">Documentul va fi legat de această activitate.</p>
			</div>

			<p class="handoff-note">
				{data.handoffGuidance.keezHandoffMode === 'direct_to_keez'
					? 'Documentul va fi trimis automat către contabilitate după încărcare.'
					: 'Documentul va fi verificat de responsabilul financiar înainte de trimiterea către contabilitate.'}
			</p>

			<label>
				<span>Document</span>
				<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" required />
			</label>

			<label>
				<span>Notițe</span>
				<textarea name="notes" rows="4"></textarea>
			</label>

			<button type="submit">Încarcă documentul</button>
		</form>

		<section class="documents-panel" aria-label="Documente financiare">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Financiar</p>
					<h2>Documente atașate</h2>
				</div>
				<a href={resolve('/finance/documents')}>Registru general</a>
			</div>

			{#if data.documents.length}
				<div class="document-list">
					{#each data.documents as document (document.id)}
						<ActivityFinanceDocumentRow {document} />
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<h3>Nu există documente atașate.</h3>
					<p>Documentele încărcate pentru această activitate vor apărea aici.</p>
				</div>
			{/if}
		</section>
	</div>
</section>

<style>
	.finance-tab,
	.upload-panel,
	.documents-panel,
	.document-list,
	.empty-state {
		display: grid;
		gap: 16px;
	}

	.content-grid {
		display: grid;
		grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
		gap: 18px;
		align-items: start;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}

	.panel,
	.documents-panel,
	.empty-state,
	.summary-grid div {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.summary-grid div {
		display: grid;
		gap: 2px;
		padding: 12px 14px;
	}

	.summary-grid span {
		color: #0f766e;
		font-size: 1.35rem;
		font-weight: 900;
	}

	.upload-panel,
	.documents-panel,
	.empty-state {
		padding: 18px;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	h2,
	h3,
	.panel-title {
		color: #0f172a;
	}

	.panel-title {
		font-weight: 800;
	}

	.panel-subtitle,
	.handoff-note,
	.empty-state p,
	.summary-grid p {
		color: #64748b;
	}

	.handoff-note {
		border-left: 3px solid #0f766e;
		background: #f0fdfa;
		padding: 10px 12px;
		font-weight: 800;
	}

	label {
		display: grid;
		gap: 7px;
		color: #334155;
		font-size: 0.88rem;
		font-weight: 700;
	}

	input,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 10px 11px;
		color: #0f172a;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	button,
	.section-heading a {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 800;
		text-decoration: none;
	}

	button {
		border: 0;
		background: #0f766e;
		color: #ffffff;
		cursor: pointer;
	}

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.section-heading a {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
	}

	.empty-state {
		min-height: 180px;
		align-content: center;
		text-align: center;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		background: #eff6ff;
		padding: 12px 14px;
		color: #1e3a8a;
	}

	@media (max-width: 980px) {
		.content-grid {
			grid-template-columns: 1fr;
		}

		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.summary-grid {
			grid-template-columns: 1fr;
		}

		button,
		.section-heading a {
			width: 100%;
		}
	}
</style>
