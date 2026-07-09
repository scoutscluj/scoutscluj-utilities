<script lang="ts">
	import { resolve } from '$app/paths';
	import { Download, Pencil, RefreshCcw, RotateCcw, Send, Trash2, X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import DocumentPreview from '$lib/components/finance/DocumentPreview.svelte';
	import { financialStatusLabels, formatBytes, formatDateTime } from '$lib/finance/document-format';
	import type { FinancialDocument, FinancialDocumentStatus } from './+page.server';

	type Props = {
		document: FinancialDocument;
		isFinanceManager: boolean;
	};

	let { document, isFinanceManager }: Props = $props();
	let editDialogOpen = $state(false);

	const legacyReadyStatuses = new Set<FinancialDocumentStatus>(['uploaded', 'in_review']);
	const hiddenStatusOptions = new Set<FinancialDocumentStatus>(['uploaded', 'in_review']);
	const statusOptions = Object.entries(financialStatusLabels) as [
		FinancialDocumentStatus,
		string
	][];
	const visibleStatusOptions = statusOptions.filter(([value]) => !hiddenStatusOptions.has(value));
	const manuallySendableStatuses = new Set<FinancialDocumentStatus>([
		'uploaded',
		'in_review',
		'ready_to_send'
	]);
	const displayStatus = $derived(
		legacyReadyStatuses.has(document.status) ? 'ready_to_send' : document.status
	);

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
		dense
	/>

	<div class="document-main">
		<div class="document-title-line">
			<h3>{document.originalFilename}</h3>
			<span class={`status ${displayStatus}`}>{financialStatusLabels[displayStatus]}</span>
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

		{#if document.notes || document.reviewerNotes || document.lastHandoffError}
			<div class="feedback-stack">
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
		{/if}
	</div>

	<div class="actions-area" aria-label="Acțiuni document">
		{#if isFinanceManager}
			{#if document.status === 'send_failed'}
				<form method="POST" action="?/sendDocument">
					<input type="hidden" name="documentId" value={document.id} />
					<input type="hidden" name="handoffAction" value="retry" />
					<button
						class="icon-action primary"
						type="submit"
						aria-label="Reîncearcă trimiterea"
						title="Reîncearcă trimiterea"
					>
						<RefreshCcw size={16} strokeWidth={2.4} aria-hidden="true" />
					</button>
				</form>
			{:else if document.status === 'sent'}
				<form method="POST" action="?/sendDocument">
					<input type="hidden" name="documentId" value={document.id} />
					<input type="hidden" name="handoffAction" value="resend" />
					<button
						class="icon-action primary"
						type="submit"
						aria-label="Retrimite la contabilitate"
						title="Retrimite la contabilitate"
					>
						<RotateCcw size={16} strokeWidth={2.4} aria-hidden="true" />
					</button>
				</form>
			{:else if manuallySendableStatuses.has(document.status)}
				<form method="POST" action="?/sendDocument">
					<input type="hidden" name="documentId" value={document.id} />
					<input type="hidden" name="handoffAction" value="send" />
					<button
						class="icon-action primary"
						type="submit"
						aria-label="Trimite la contabilitate"
						title="Trimite la contabilitate"
					>
						<Send size={16} strokeWidth={2.4} aria-hidden="true" />
					</button>
				</form>
			{/if}

			<button
				class="icon-action"
				type="button"
				aria-label="Editează documentul"
				title="Editează documentul"
				onclick={() => (editDialogOpen = true)}
			>
				<Pencil size={16} strokeWidth={2.4} aria-hidden="true" />
			</button>
		{/if}

		<a
			class="icon-action"
			href={resolve(`/finance/documents/${document.id}/file`)}
			aria-label="Descarcă documentul"
			title="Descarcă documentul"
		>
			<Download size={16} strokeWidth={2.4} aria-hidden="true" />
		</a>

		{#if isFinanceManager}
			<form method="POST" action="?/deleteDocument" onsubmit={confirmDelete}>
				<input type="hidden" name="documentId" value={document.id} />
				<button
					class="icon-action danger"
					type="submit"
					aria-label="Șterge documentul"
					title="Șterge documentul"
				>
					<Trash2 size={16} strokeWidth={2.4} aria-hidden="true" />
				</button>
			</form>
		{/if}
	</div>
</article>

{#if isFinanceManager}
	<Dialog.Root bind:open={editDialogOpen}>
		<Dialog.Portal>
			<Dialog.Overlay class="document-dialog-overlay" />
			<Dialog.Content class="document-dialog-content">
				<div class="dialog-heading">
					<div>
						<Dialog.Title class="dialog-title">Editează documentul</Dialog.Title>
						<Dialog.Description class="dialog-description">
							{document.originalFilename}
						</Dialog.Description>
					</div>
					<Dialog.Close class="dialog-icon-button" aria-label="Închide dialogul">
						<X size={18} strokeWidth={2.4} aria-hidden="true" />
					</Dialog.Close>
				</div>

				<form class="dialog-form" method="POST" action="?/updateStatus">
					<input type="hidden" name="documentId" value={document.id} />
					<label>
						<span>Stare</span>
						<select name="status">
							{#each visibleStatusOptions as [value, label] (value)}
								<option {value} selected={value === displayStatus}>{label}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Observații</span>
						<textarea name="reviewerNotes" rows="4">{document.reviewerNotes ?? ''}</textarea>
					</label>

					<div class="dialog-actions">
						<Dialog.Close class="secondary-action" type="button">Anulează</Dialog.Close>
						<button class="primary-action" type="submit">Salvează</button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}

<style>
	.document-row {
		display: grid;
		grid-template-columns: 48px minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 8px 10px;
	}

	.document-row:hover {
		background: #fbfcfe;
		box-shadow: inset 3px 0 0 #c81e1e;
	}

	.document-main,
	.feedback-stack {
		min-width: 0;
		display: grid;
		gap: 5px;
	}

	.document-title-line {
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		min-width: 0;
		overflow: hidden;
		color: #0f172a;
		font-size: 0.95rem;
		line-height: 1.25;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		color: #64748b;
		font-size: 0.8rem;
		font-weight: 750;
	}

	.meta-grid span,
	.meta-grid a {
		border-right: 1px solid #cbd5e1;
		padding-right: 6px;
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
		font-size: 0.83rem;
		line-height: 1.35;
	}

	.reviewer-notes {
		border-left: 3px solid #0f766e;
		padding-left: 8px;
	}

	.handoff-error {
		border-left: 3px solid #dc2626;
		background: #fef2f2;
		padding: 7px 9px;
		color: #991b1b;
		font-size: 0.84rem;
		font-weight: 800;
	}

	.actions-area {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		border-left: 1px solid #e2e8f0;
		padding-left: 10px;
	}

	.actions-area form {
		display: contents;
	}

	.icon-action,
	:global(.dialog-icon-button) {
		width: 34px;
		height: 34px;
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		color: #334155;
		text-decoration: none;
		cursor: pointer;
	}

	.icon-action:hover,
	:global(.dialog-icon-button:hover) {
		border-color: #94a3b8;
		background: #f8fafc;
	}

	.icon-action.primary {
		border-color: #c81e1e;
		background: #c81e1e;
		color: #ffffff;
	}

	.icon-action.primary:hover {
		border-color: #991b1b;
		background: #991b1b;
	}

	.icon-action.danger {
		border-color: #fecaca;
		background: #fff1f2;
		color: #b91c1c;
	}

	.icon-action.danger:hover {
		background: #fee2e2;
	}

	.icon-action:focus-visible,
	:global(.dialog-icon-button:focus-visible),
	.primary-action:focus-visible,
	:global(.secondary-action:focus-visible) {
		outline: 3px solid rgb(200 30 30 / 0.24);
		outline-offset: 2px;
	}

	:global(.document-dialog-overlay) {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgb(15 23 42 / 0.4);
	}

	:global(.document-dialog-content) {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 60;
		width: min(520px, calc(100vw - 32px));
		display: grid;
		gap: 18px;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.22);
		transform: translate(-50%, -50%);
	}

	.dialog-heading {
		min-width: 0;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	:global(.dialog-title) {
		margin: 0;
		color: #0f172a;
		font-size: 1.12rem;
		font-weight: 900;
	}

	:global(.dialog-description) {
		max-width: 380px;
		margin-top: 4px;
		overflow: hidden;
		color: #52616f;
		font-size: 0.92rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dialog-form {
		display: grid;
		gap: 14px;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.88rem;
		font-weight: 800;
	}

	label span {
		font-size: 0.78rem;
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
		padding: 9px 10px;
		color: #17202a;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.primary-action,
	:global(.secondary-action) {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0 14px;
		font-weight: 900;
		cursor: pointer;
	}

	.primary-action {
		border: 0;
		background: #c81e1e;
		color: #ffffff;
	}

	.primary-action:hover {
		background: #991b1b;
	}

	:global(.secondary-action) {
		border: 1px solid #d8dee6;
		background: #ffffff;
		color: #334155;
	}

	:global(.secondary-action:hover) {
		background: #f8fafc;
	}

	@media (max-width: 760px) {
		.document-row {
			grid-template-columns: 48px minmax(0, 1fr);
		}

		.actions-area {
			grid-column: 1 / -1;
			justify-content: flex-start;
			border-left: 0;
			border-top: 1px solid #e2e8f0;
			padding: 8px 0 0;
		}
	}

	@media (max-width: 520px) {
		.document-title-line {
			display: grid;
			align-items: start;
			justify-content: stretch;
		}

		h3 {
			white-space: normal;
		}

		.dialog-actions {
			display: grid;
		}

		.primary-action,
		:global(.secondary-action) {
			width: 100%;
		}
	}
</style>
