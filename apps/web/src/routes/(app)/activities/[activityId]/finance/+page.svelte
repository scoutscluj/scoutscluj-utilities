<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FinancialDocumentStatus } from './+page.server';

	let { data, form } = $props();

	const statusLabels: Record<FinancialDocumentStatus, string> = {
		uploaded: 'Încărcat',
		in_review: 'În verificare',
		ready_to_send: 'Gata de trimis',
		sent: 'Trimis',
		needs_clarification: 'Necesită clarificări',
		rejected: 'Respins',
		archived: 'Arhivat'
	};

	const formatBytes = (value: number) =>
		value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

	const formatDateTime = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
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
						<article class="document-row">
							<div>
								<div class="document-title-line">
									<h3>{document.originalFilename}</h3>
									<span class={`status ${document.status}`}>{statusLabels[document.status]}</span>
								</div>
								<div class="document-meta">
									<span>{formatDateTime(document.createdAt)}</span>
									<span>{formatBytes(document.fileSize)}</span>
									<span>{document.uploaderName}</span>
								</div>
								{#if document.notes}
									<p class="notes">{document.notes}</p>
								{/if}
								{#if document.reviewerNotes}
									<p class="reviewer-notes">{document.reviewerNotes}</p>
								{/if}
							</div>
							<a class="download-link" href={resolve(`/finance/documents/${document.id}/file`)}>
								Descarcă
							</a>
						</article>
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
	.document-row,
	.empty-state,
	.summary-grid div {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
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
		text-transform: uppercase;
		letter-spacing: 0;
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
	.notes,
	.empty-state p,
	.document-meta,
	.summary-grid p {
		color: #64748b;
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
	.section-heading a,
	.download-link {
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

	.section-heading,
	.document-title-line,
	.document-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.section-heading a,
	.download-link {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
	}

	.document-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px;
		padding: 16px;
	}

	.status {
		border-radius: 999px;
		padding: 5px 9px;
		background: #eef2ff;
		color: #3730a3;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.status.sent {
		background: #dcfce7;
		color: #166534;
	}

	.status.needs_clarification {
		background: #fef3c7;
		color: #92400e;
	}

	.status.rejected {
		background: #fee2e2;
		color: #991b1b;
	}

	.status.archived {
		background: #f1f5f9;
		color: #475569;
	}

	.reviewer-notes {
		margin-top: 10px;
		border-left: 3px solid #f59e0b;
		padding-left: 10px;
		color: #92400e;
	}

	.empty-state {
		min-height: 180px;
		align-content: center;
		text-align: center;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
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

		.document-row {
			grid-template-columns: 1fr;
		}

		button,
		.section-heading a,
		.download-link {
			width: 100%;
		}
	}
</style>
