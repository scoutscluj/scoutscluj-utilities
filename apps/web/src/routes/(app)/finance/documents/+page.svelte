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

	const statusOptions = Object.entries(statusLabels) as [FinancialDocumentStatus, string][];
	const handoffLabels = {
		review_first: 'Verificare internă înainte de Keez',
		direct_to_keez: 'Trimitere directă către Keez'
	};

	const formatBytes = (value: number) => {
		if (value < 1024 * 1024) {
			return `${Math.ceil(value / 1024)} KB`;
		}

		return `${(value / 1024 / 1024).toFixed(1)} MB`;
	};

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
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
		<form class="panel upload-panel" method="POST" action="?/upload" enctype="multipart/form-data">
			<div>
				<p class="panel-title">Încărcare document</p>
				<p class="panel-subtitle">PDF, imagine sau poză din telefon, maxim 15 MB.</p>
			</div>

			<label>
				<span>Document</span>
				<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" required />
			</label>

			<label>
				<span>Activitate</span>
				<input name="activityName" type="text" maxlength="255" placeholder="Opțional" />
			</label>

			<label>
				<span>Notițe</span>
				<textarea name="notes" rows="4" placeholder="Opțional"></textarea>
			</label>

			<button type="submit">Trimite documentul</button>
		</form>

		{#if data.isFinanceManager && data.settings}
			<form class="panel settings-panel" method="POST" action="?/updateSettings">
				<div>
					<p class="panel-title">Keez</p>
					<p class="panel-subtitle">
						{data.settings.keezConfigured ? 'Configurat' : 'Neconfigurat'} ·
						{data.settings.keezEnvironment}
					</p>
				</div>

				<label>
					<span>Flux documente</span>
					<select name="keezHandoffMode">
						<option
							value="review_first"
							selected={data.settings.keezHandoffMode === 'review_first'}
						>
							{handoffLabels.review_first}
						</option>
						<option
							value="direct_to_keez"
							selected={data.settings.keezHandoffMode === 'direct_to_keez'}
							disabled={!data.settings.keezDocumentUploadAvailable}
						>
							{handoffLabels.direct_to_keez}
						</option>
					</select>
				</label>

				{#if !data.settings.keezDocumentUploadAvailable}
					<p class="notice">API-ul Keez pentru încărcare documente nu este confirmat încă.</p>
				{/if}

				<button type="submit">Salvează setarea</button>
			</form>
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
					<article class="document-row">
						<div class="document-main">
							<div class="document-title-line">
								<h3>{document.originalFilename}</h3>
								<span class={`status ${document.status}`}>{statusLabels[document.status]}</span>
							</div>
							<div class="meta-grid">
								<span>{formatDate(document.createdAt)}</span>
								<span>{formatBytes(document.fileSize)}</span>
								<span>{document.uploaderName}</span>
								{#if document.activityName}
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

						{#if data.isFinanceManager}
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
	.finance-documents {
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
	.panel-title,
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

	h3 {
		min-width: 0;
		overflow-wrap: anywhere;
		font-size: 1rem;
	}

	.page-heading p:not(.eyebrow),
	.panel-subtitle,
	.notes,
	.reviewer-notes,
	.notice,
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

	.panel,
	.document-row,
	.empty-state {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
	}

	.panel {
		display: grid;
		align-content: start;
		gap: 14px;
		padding: 18px;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 900;
	}

	.panel-subtitle {
		margin-top: 4px;
		font-size: 0.92rem;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}

	input,
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
	.section-heading a,
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

	.section-heading a,
	.download-link {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
	}

	.download-link {
		justify-self: start;
	}

	.notice {
		border-left: 3px solid #d97706;
		background: #fffbeb;
		padding: 10px 12px;
		font-weight: 750;
	}

	.documents-section,
	.document-list,
	.document-main,
	.status-form {
		display: grid;
		gap: 14px;
	}

	.document-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
		padding: 16px;
	}

	.document-title-line {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
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

	.meta-grid span {
		border-right: 1px solid #cbd5e1;
		padding-right: 8px;
	}

	.meta-grid span:last-child {
		border-right: 0;
		padding-right: 0;
	}

	.notes,
	.reviewer-notes {
		overflow-wrap: anywhere;
		line-height: 1.5;
	}

	.reviewer-notes {
		border-left: 3px solid #0f766e;
		padding-left: 10px;
	}

	.empty-state {
		padding: 22px;
	}

	@media (min-width: 820px) {
		.top-grid {
			grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
		}

		.document-row {
			grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
		}
	}

	@media (max-width: 620px) {
		.page-heading,
		.section-heading,
		.document-title-line {
			display: grid;
			align-items: start;
			justify-content: stretch;
		}

		button,
		.section-heading a,
		.download-link {
			width: 100%;
		}
	}
</style>
