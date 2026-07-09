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
	const visibleStatusOptions = statusOptions.filter(
		([value]) => value !== 'ready_to_send' || document.status === 'ready_to_send'
	);
	const manuallySendableStatuses = new Set<FinancialDocumentStatus>([
		'uploaded',
		'in_review',
		'ready_to_send'
	]);

	const confirmDelete = (event: SubmitEvent) => {
		if (!window.confirm(`Ștergi documentul "${document.originalFilename}"?`)) {
			event.preventDefault();
		}
	};
</script>

<article class="document-row" class:manager={isFinanceManager}>
	<DocumentPreview
		documentId={document.id}
		filename={document.originalFilename}
		contentType={document.contentType}
		compact
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
		{#if document.lastHandoffError}
			<p class="handoff-error">{document.lastHandoffError}</p>
		{/if}
	</div>

	{#if isFinanceManager}
		<form class="review-form" method="POST" action="?/updateStatus">
			<input type="hidden" name="documentId" value={document.id} />
			<label>
				<span>Stare</span>
				<select name="status">
					{#each visibleStatusOptions as [value, label] (value)}
						<option {value} selected={value === document.status}>{label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Observații</span>
				<textarea name="reviewerNotes" rows="2">{document.reviewerNotes ?? ''}</textarea>
			</label>
			<button class="primary-action" type="submit">Actualizează</button>
		</form>
	{/if}

	<div class="actions-area" aria-label="Acțiuni document">
		<p>Acțiuni</p>

		{#if isFinanceManager}
			{#if document.status === 'send_failed'}
				<form method="POST" action="?/sendDocument">
					<input type="hidden" name="documentId" value={document.id} />
					<input type="hidden" name="handoffAction" value="retry" />
					<button class="primary-action" type="submit">Reîncearcă trimiterea</button>
				</form>
			{:else if document.status === 'sent'}
				<form method="POST" action="?/sendDocument">
					<input type="hidden" name="documentId" value={document.id} />
					<input type="hidden" name="handoffAction" value="resend" />
					<button class="primary-action" type="submit">Retrimite la contabilitate</button>
				</form>
			{:else if manuallySendableStatuses.has(document.status)}
				<form method="POST" action="?/sendDocument">
					<input type="hidden" name="documentId" value={document.id} />
					<input type="hidden" name="handoffAction" value="send" />
					<button class="primary-action" type="submit">Trimite la contabilitate</button>
				</form>
			{/if}
		{/if}

		<a class="secondary-action" href={resolve(`/finance/documents/${document.id}/file`)}>
			Descarcă
		</a>

		{#if isFinanceManager}
			<form method="POST" action="?/deleteDocument" onsubmit={confirmDelete}>
				<input type="hidden" name="documentId" value={document.id} />
				<button class="danger-action" type="submit">Șterge</button>
			</form>
		{/if}
	</div>
</article>

<style>
	.document-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) minmax(160px, 190px);
		gap: 12px;
		align-items: start;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 12px;
	}

	.manager {
		grid-template-columns: auto minmax(0, 1fr) minmax(220px, 280px) minmax(170px, 210px);
	}

	.document-main,
	.review-form,
	.actions-area {
		min-width: 0;
		display: grid;
		gap: 8px;
	}

	.document-title-line {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		min-width: 0;
		overflow-wrap: anywhere;
		color: #0f172a;
		font-size: 0.98rem;
		line-height: 1.3;
	}

	.status {
		flex: 0 0 auto;
		border-radius: 999px;
		padding: 3px 8px;
		font-size: 0.72rem;
		font-weight: 900;
		line-height: 1.2;
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

	.send_failed {
		background: #fef2f2;
		color: #b91c1c;
	}

	.archived {
		background: #f1f5f9;
		color: #475569;
	}

	.meta-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		color: #64748b;
		font-size: 0.82rem;
		font-weight: 750;
	}

	.meta-grid span,
	.meta-grid a {
		border-right: 1px solid #cbd5e1;
		padding-right: 7px;
	}

	.meta-grid a {
		color: #2563eb;
		font-weight: 750;
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
		font-size: 0.86rem;
		line-height: 1.45;
	}

	.reviewer-notes {
		border-left: 3px solid #0f766e;
		padding-left: 9px;
	}

	.handoff-error {
		border-left: 3px solid #dc2626;
		background: #fef2f2;
		padding: 8px 10px;
		color: #991b1b;
		font-size: 0.88rem;
		font-weight: 800;
	}

	.review-form {
		border-left: 1px solid #e2e8f0;
		padding-left: 12px;
	}

	label {
		display: grid;
		gap: 4px;
		font-weight: 800;
	}

	label span,
	.actions-area p {
		color: #334155;
		font-size: 0.76rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 8px 10px;
		color: #17202a;
		font-size: 0.88rem;
	}

	textarea {
		min-height: 58px;
		resize: vertical;
	}

	.actions-area {
		align-content: start;
		border-left: 1px solid #e2e8f0;
		padding-left: 12px;
	}

	.actions-area form,
	.actions-area a {
		min-width: 0;
	}

	button,
	.secondary-action {
		width: 100%;
		min-height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0 10px;
		font-size: 0.86rem;
		font-weight: 900;
		text-align: center;
		text-decoration: none;
	}

	button {
		border: 0;
		cursor: pointer;
	}

	.primary-action {
		background: #c81e1e;
		color: #ffffff;
	}

	.primary-action:hover {
		background: #991b1b;
	}

	.secondary-action {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.secondary-action:hover {
		border-color: #94a3b8;
		background: #f8fafc;
	}

	.danger-action {
		border: 1px solid #fecaca;
		background: #fff1f2;
		color: #b91c1c;
	}

	.danger-action:hover {
		background: #fee2e2;
	}

	@media (max-width: 1080px) {
		.manager,
		.document-row {
			grid-template-columns: auto minmax(0, 1fr) minmax(180px, 220px);
		}

		.review-form,
		.actions-area {
			grid-column: 2 / -1;
			border-left: 0;
			border-top: 1px solid #e2e8f0;
			padding: 10px 0 0;
		}
	}

	@media (max-width: 620px) {
		.document-row,
		.manager,
		.document-title-line {
			grid-template-columns: 1fr;
			display: grid;
			align-items: start;
			justify-content: stretch;
		}

		.review-form,
		.actions-area {
			grid-column: auto;
		}
	}
</style>
