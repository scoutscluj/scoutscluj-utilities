<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import { Upload, X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import FinanceSettingsForm from '../../../finance/documents/FinanceSettingsForm.svelte';
	import FinancialDocumentRegistryRow from '../../../finance/documents/FinancialDocumentRegistryRow.svelte';
	import FinancialDocumentUploadForm from '../../../finance/documents/FinancialDocumentUploadForm.svelte';

	let { data, form } = $props();
	let uploadDialogOpen = $state(false);
	let settingsDialogOpen = $state(false);
</script>

<section class="finance-tab">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<div class="page-heading">
		<h1>Documente</h1>
		<div class="page-actions">
			<button
				class="add-document-button"
				type="button"
				aria-label="Adaugă document"
				onclick={() => (uploadDialogOpen = true)}
				><Upload size={18} aria-hidden="true" /><span>Adaugă document</span></button
			><ActionMenu
				label="Acțiuni documente financiare"
				items={[
					...(data.isFinanceManager && data.settings
						? [
								{
									label: 'Configurare Keez',
									action: () => {
										settingsDialogOpen = true;
									}
								}
							]
						: []),
					{
						label: 'Registru general',
						action: () => {
							void goto(resolve('/finance/documents'));
						}
					}
				]}
			/>
		</div>
	</div>

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

	<Dialog.Root bind:open={uploadDialogOpen}>
		<Dialog.Portal>
			<Dialog.Overlay class="upload-dialog-overlay" />
			<Dialog.Content class="upload-dialog-content">
				<div class="dialog-heading">
					<div>
						<Dialog.Title class="dialog-title">Adaugă document</Dialog.Title>
						<Dialog.Description class="dialog-description">
							Documentul va fi legat de această activitate. PDF sau imagine, maxim 15 MB.
						</Dialog.Description>
					</div>
					<Dialog.Close class="dialog-icon-button" aria-label="Închide dialogul">
						<X size={18} strokeWidth={2.4} aria-hidden="true" />
					</Dialog.Close>
				</div>

				<FinancialDocumentUploadForm
					handoffMode={data.handoffGuidance.keezHandoffMode}
					showHeader={false}
					fixedActivityId={data.activity.id}
					fixedActivityLabel={data.activity.title}
				/>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	{#if data.isFinanceManager && data.settings}
		<Dialog.Root bind:open={settingsDialogOpen}>
			<Dialog.Portal>
				<Dialog.Overlay class="upload-dialog-overlay" />
				<Dialog.Content class="settings-dialog-content">
					<div class="dialog-heading">
						<div>
							<Dialog.Title class="dialog-title">Configurare Keez</Dialog.Title>
							<Dialog.Description class="dialog-description">
								Fluxul de trimitere către contabilitate.
							</Dialog.Description>
						</div>
						<Dialog.Close class="dialog-icon-button" aria-label="Închide dialogul">
							<X size={18} strokeWidth={2.4} aria-hidden="true" />
						</Dialog.Close>
					</div>

					<FinanceSettingsForm settings={data.settings} />
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	{/if}

	<section class="documents-panel" aria-label="Documente financiare">
		{#if data.documents.length}
			<div class="document-list">
				{#each data.documents as document (document.id)}
					<FinancialDocumentRegistryRow {document} isFinanceManager={data.isFinanceManager} />
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<h3>Nu există documente atașate.</h3>
				<p>Documentele încărcate pentru această activitate vor apărea aici.</p>
			</div>
		{/if}
	</section>
</section>

<style>
	.finance-tab,
	.documents-panel,
	.document-list {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.document-list {
		gap: 10px;
	}
	.page-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h1 {
		margin: 0;
		font-size: clamp(24px, 3vw, 30px);
		letter-spacing: -0.025em;
	}
	.page-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.add-document-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 8px 14px;
		border: 0;
		border-radius: 7px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		cursor: pointer;
	}
	.add-document-button:hover {
		background: var(--sc-accent-hover);
	}
	.add-document-button:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	.summary-grid {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
	}
	.summary-grid div {
		display: flex;
		align-items: baseline;
		gap: 5px;
	}
	.summary-grid span {
		color: var(--sc-ink);
		font-size: 14px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.summary-grid p {
		margin: 0;
		font-size: 12px;
		color: var(--sc-muted);
	}
	.empty-state {
		display: grid;
		gap: 8px;
		padding: 32px 20px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	.empty-state h3,
	.empty-state p {
		margin: 0;
	}
	.empty-state p {
		color: var(--sc-muted);
		line-height: 1.5;
	}
	.form-message {
		padding: 12px 14px;
		margin: 0;
		border-radius: 8px;
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}
	:global(.upload-dialog-overlay) {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgb(15 23 42 / 0.45);
	}
	:global(.upload-dialog-content),
	:global(.settings-dialog-content) {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 60;
		width: min(560px, calc(100vw - 32px));
		max-height: calc(100dvh - 32px);
		overflow: auto;
		display: grid;
		gap: 18px;
		padding: 20px;
		border: 1px solid var(--sc-border);
		border-radius: 14px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		box-shadow: var(--sc-shadow);
		transform: translate(-50%, -50%);
	}
	:global(.settings-dialog-content) {
		width: min(480px, calc(100vw - 32px));
	}
	.dialog-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}
	:global(.dialog-title) {
		margin: 0;
		color: var(--sc-ink);
		font-size: 18px;
		font-weight: 600;
	}
	:global(.dialog-description) {
		margin-top: 4px;
		color: var(--sc-muted);
		font-size: 14px;
		line-height: 1.5;
	}
	:global(.dialog-icon-button) {
		display: inline-grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		color: var(--sc-ink);
		background: var(--sc-inset);
		cursor: pointer;
	}
	@media (max-width: 600px) {
		.add-document-button {
			width: 44px;
			padding: 0;
		}
		.add-document-button span {
			display: none;
		}
	}
</style>
