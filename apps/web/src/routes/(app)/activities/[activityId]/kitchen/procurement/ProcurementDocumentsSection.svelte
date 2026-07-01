<script lang="ts">
	import type { FinancialDocument, KitchenProcurementEvent } from '../kitchen-api';

	let {
		documents,
		event
	}: {
		documents: FinancialDocument[];
		event: KitchenProcurementEvent;
	} = $props();

	const documentName = (documentId: number) =>
		documents.find((document) => document.id === documentId)?.originalFilename ??
		`Document #${documentId}`;
</script>

<section class="document-section">
	<h3>Facturi și bonuri</h3>
	<div class="document-list">
		{#each event.documents as document (document.id)}
			<span>{documentName(document.financialDocumentId)}</span>
		{/each}
		{#if !event.documents.length}
			<span class="muted">Niciun document atașat.</span>
		{/if}
	</div>

	<div class="document-actions">
		<form method="POST" action="?/linkDocument">
			<input type="hidden" name="eventId" value={event.id} />
			<select name="financialDocumentId" required>
				<option value="">Document existent</option>
				{#each documents as document (document.id)}
					<option value={document.id}>{document.originalFilename}</option>
				{/each}
			</select>
			<button class="secondary" type="submit">Leagă</button>
		</form>

		<form method="POST" action="?/uploadDocument" enctype="multipart/form-data">
			<input type="hidden" name="eventId" value={event.id} />
			<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" required />
			<input name="notes" placeholder="notițe" />
			<button type="submit">Încarcă</button>
		</form>
	</div>
</section>

<style>
	.document-section,
	.document-actions,
	.document-actions form {
		display: grid;
		gap: 16px;
	}

	.document-actions {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.document-actions form {
		grid-template-columns: minmax(160px, 1fr) minmax(120px, 1fr) auto;
		gap: 10px;
		align-items: end;
	}

	.document-actions form:first-child {
		grid-template-columns: minmax(160px, 1fr) auto;
	}

	.document-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 8px;
		background: #0f766e;
		color: #ffffff;
		padding: 0 12px;
		font-weight: 800;
		cursor: pointer;
	}

	.secondary {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	input,
	select {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 9px 10px;
		font: inherit;
	}

	h3 {
		margin: 0;
		color: #0f172a;
	}

	.muted {
		color: #64748b;
	}

	@media (max-width: 1100px) {
		.document-actions,
		.document-actions form,
		.document-actions form:first-child {
			grid-template-columns: 1fr;
		}
	}
</style>
