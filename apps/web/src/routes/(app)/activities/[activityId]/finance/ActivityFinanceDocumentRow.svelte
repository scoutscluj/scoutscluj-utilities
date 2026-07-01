<script lang="ts">
	import { resolve } from '$app/paths';
	import DocumentPreview from '$lib/components/finance/DocumentPreview.svelte';
	import { financialStatusLabels, formatBytes, formatDateTime } from '$lib/finance/document-format';
	import type { FinancialDocument } from './+page.server';

	type Props = {
		document: FinancialDocument;
	};

	let { document }: Props = $props();
</script>

<article class="document-row">
	<DocumentPreview
		documentId={document.id}
		filename={document.originalFilename}
		contentType={document.contentType}
	/>

	<div>
		<div class="document-title-line">
			<h3>{document.originalFilename}</h3>
			<span class={`status ${document.status}`}>{financialStatusLabels[document.status]}</span>
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

	<a class="download-link" href={resolve(`/finance/documents/${document.id}/file`)}>Descarcă</a>
</article>

<style>
	.document-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 14px;
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 16px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.document-title-line,
	.document-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		color: #0f172a;
	}

	.document-meta,
	.notes {
		color: #64748b;
	}

	.status {
		border-radius: 999px;
		background: #eef2ff;
		padding: 5px 9px;
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

	.download-link {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
		font-weight: 800;
		text-decoration: none;
	}

	@media (max-width: 640px) {
		.document-row {
			grid-template-columns: 1fr;
		}

		.download-link {
			width: 100%;
		}
	}
</style>
