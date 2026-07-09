<script lang="ts">
	import { resolve } from '$app/paths';
	import { Settings, Upload, X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import FinanceSettingsForm from './FinanceSettingsForm.svelte';
	import FinancialDocumentUploadForm from './FinancialDocumentUploadForm.svelte';
	import FinancialDocumentRegistryRow from './FinancialDocumentRegistryRow.svelte';

	let { data, form } = $props();
	let uploadDialogOpen = $state(false);
	let settingsDialogOpen = $state(false);
</script>

<svelte:head>
	<title>Documente financiare | Scouts Cluj Utilities</title>
</svelte:head>

<section class="finance-documents">
	<div class="page-heading">
		<div>
			<p class="eyebrow">Financiar</p>
			<h1>Documente financiare</h1>
			<p>Bonuri, facturi și dovezi de plată pentru responsabilul financiar.</p>
		</div>
		<div class="page-actions">
			{#if data.isFinanceManager && data.settings}
				<button class="secondary-button" type="button" onclick={() => (settingsDialogOpen = true)}>
					<Settings size={16} strokeWidth={2.4} aria-hidden="true" />
					Keez
				</button>
			{/if}
			<button class="add-document-button" type="button" onclick={() => (uploadDialogOpen = true)}>
				<Upload size={16} strokeWidth={2.4} aria-hidden="true" />
				Adaugă document
			</button>
		</div>
	</div>

	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<Dialog.Root bind:open={uploadDialogOpen}>
		<Dialog.Portal>
			<Dialog.Overlay class="upload-dialog-overlay" />
			<Dialog.Content class="upload-dialog-content">
				<div class="dialog-heading">
					<div>
						<Dialog.Title class="dialog-title">Adaugă document</Dialog.Title>
						<Dialog.Description class="dialog-description">
							PDF sau imagine convertită automat în PDF, maxim 15 MB.
						</Dialog.Description>
					</div>
					<Dialog.Close class="dialog-icon-button" aria-label="Închide dialogul">
						<X size={18} strokeWidth={2.4} aria-hidden="true" />
					</Dialog.Close>
				</div>

				<FinancialDocumentUploadForm
					activities={data.activities}
					handoffMode={data.handoffGuidance.keezHandoffMode}
					showHeader={false}
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
		gap: 18px;
	}

	.document-list {
		gap: 10px;
	}

	.page-heading,
	.section-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
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

	.empty-state {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
	}

	.add-document-button,
	.secondary-button,
	.section-heading a {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border-radius: 8px;
		font-weight: 900;
		text-decoration: none;
	}

	.page-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
	}

	.add-document-button {
		flex: 0 0 auto;
		border: 0;
		background: #c81e1e;
		padding: 0 14px;
		color: #ffffff;
		cursor: pointer;
	}

	.secondary-button {
		flex: 0 0 auto;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
		cursor: pointer;
	}

	.add-document-button:hover {
		background: #991b1b;
	}

	.secondary-button:hover {
		background: #f8fafc;
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

	:global(.upload-dialog-overlay) {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgb(15 23 42 / 0.4);
	}

	:global(.upload-dialog-content) {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 60;
		width: min(560px, calc(100vw - 32px));
		max-height: calc(100vh - 32px);
		display: grid;
		gap: 18px;
		overflow: auto;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.22);
		transform: translate(-50%, -50%);
	}

	:global(.settings-dialog-content) {
		position: fixed;
		top: 50%;
		left: 50%;
		z-index: 60;
		width: min(480px, calc(100vw - 32px));
		max-height: calc(100vh - 32px);
		display: grid;
		gap: 18px;
		overflow: auto;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.22);
		transform: translate(-50%, -50%);
	}

	.dialog-heading {
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
		margin-top: 4px;
		color: #52616f;
		font-size: 0.92rem;
	}

	:global(.dialog-icon-button) {
		width: 34px;
		height: 34px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		color: #334155;
		cursor: pointer;
	}

	:global(.dialog-icon-button:hover) {
		background: #f8fafc;
	}

	.add-document-button:focus-visible,
	.secondary-button:focus-visible,
	:global(.dialog-icon-button:focus-visible) {
		outline: 3px solid rgb(200 30 30 / 0.24);
		outline-offset: 2px;
	}

	@media (max-width: 620px) {
		.page-heading,
		.section-heading {
			display: grid;
			align-items: start;
			justify-content: stretch;
		}

		.add-document-button,
		.secondary-button,
		.section-heading a {
			width: 100%;
		}

		.page-actions {
			display: grid;
			justify-content: stretch;
		}
	}
</style>
