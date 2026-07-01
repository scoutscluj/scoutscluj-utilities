<script lang="ts">
	import { resolve } from '$app/paths';
	import DocumentPreview from '$lib/components/finance/DocumentPreview.svelte';
	import { financialStatusLabels, formatBytes, formatDateTime } from '$lib/finance/document-format';
	import type { FinancialDocument, FinancialDocumentStatus } from './+page.server';

	type Props = {
		document: FinancialDocument;
		isFinanceManager: boolean;
	};

	let { document, isFinanceManager }: Props = $props();

	const statusOptions = Object.entries(financialStatusLabels) as [
		FinancialDocumentStatus,
		string
	][];
</script>

<article class="document-row" class:manager={isFinanceManager}>
	<DocumentPreview
		documentId={document.id}
		filename={document.originalFilename}
		contentType={document.contentType}
	/>

	<div class="document-main">
		<div class="document-title-line">
			<h3>{document.originalFilename}</h3>
			<span class={`status ${document.status}`}>{financialStatusLabels[document.status]}</span>
		</div>
		<div class="meta-grid">
			<span>{formatDateTime(document.createdAt)}</span>
			<span>{formatBytes(document.fileSize)}</span>
			<span>{document.uploaderName}</span>
			{#if document.activityId && document.activityTitle}
				<a href={resolve(`/activities/${document.activityId}`)}>{document.activityTitle}</a>
			{:else if document.activityName}
				<span>{document.activityName}</span>
			{/if}
		</div>
		{#if document.notes}
			<p class="notes">{document.notes}</p>
		{/if}
		{#if document.reviewerNotes}
			<p class="reviewer-notes">{document.reviewerNotes}</p>
		{/if}
		<a class="download-link" href={resolve(`/finance/documents/${document.id}/file`)}>
			Descarcă documentul
		</a>
	</div>

	{#if isFinanceManager}
		<form class="status-form" method="POST" action="?/updateStatus">
			<input type="hidden" name="documentId" value={document.id} />
			<label>
				<span>Stare</span>
				<select name="status">
					{#each statusOptions as [value, label] (value)}
						<option {value} selected={value === document.status}>{label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Observații</span>
				<textarea name="reviewerNotes" rows="3">{document.reviewerNotes ?? ''}</textarea>
			</label>
			<button type="submit">Actualizează</button>
		</form>
	{/if}
</article>

<style>
	.document-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 16px;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 16px;
	}

	.document-main,
	.status-form {
		display: grid;
		gap: 14px;
	}

	.document-title-line {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		min-width: 0;
		overflow-wrap: anywhere;
		color: #0f172a;
		font-size: 1rem;
	}

	.status {
		flex: 0 0 auto;
		border-radius: 999px;
		padding: 4px 9px;
		font-size: 0.78rem;
		font-weight: 900;
		white-space: nowrap;
	}

	.uploaded,
	.in_review {
		background: #eef2ff;
		color: #3730a3;
	}

	.ready_to_send {
		background: #ecfeff;
		color: #155e75;
	}

	.sent {
		background: #dcfce7;
		color: #166534;
	}

	.needs_clarification {
		background: #fffbeb;
		color: #92400e;
	}

	.rejected {
		background: #fee2e2;
		color: #991b1b;
	}

	.archived {
		background: #f1f5f9;
		color: #475569;
	}

	.meta-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		color: #64748b;
		font-size: 0.88rem;
		font-weight: 750;
	}

	.meta-grid span,
	.meta-grid a {
		border-right: 1px solid #cbd5e1;
		padding-right: 8px;
	}

	.meta-grid a {
		color: #2563eb;
		font-weight: 700;
	}

	.meta-grid span:last-child,
	.meta-grid a:last-child {
		border-right: 0;
		padding-right: 0;
	}

	.notes,
	.reviewer-notes {
		overflow-wrap: anywhere;
		color: #52616f;
		line-height: 1.5;
	}

	.reviewer-notes {
		border-left: 3px solid #0f766e;
		padding-left: 10px;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}

	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 10px 12px;
		color: #17202a;
	}

	textarea {
		resize: vertical;
	}

	button,
	.download-link {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 900;
		text-decoration: none;
	}

	button {
		border: 0;
		background: #c81e1e;
		padding: 0 14px;
		color: #ffffff;
		cursor: pointer;
	}

	button:hover {
		background: #991b1b;
	}

	.download-link {
		justify-self: start;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
	}

	@media (min-width: 900px) {
		.manager {
			grid-template-columns: auto minmax(0, 1fr) minmax(280px, 340px);
		}
	}

	@media (max-width: 620px) {
		.document-row,
		.document-title-line {
			grid-template-columns: 1fr;
			display: grid;
			align-items: start;
			justify-content: stretch;
		}

		button,
		.download-link {
			width: 100%;
		}
	}
</style>
