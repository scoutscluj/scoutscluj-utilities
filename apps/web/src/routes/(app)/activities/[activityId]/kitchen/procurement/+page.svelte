<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	const methodLabels = {
		self_purchase: 'Cumpărare directă',
		delivery: 'Livrare'
	};

	const statusLabels = {
		planned: 'Planificat',
		in_progress: 'În lucru',
		completed: 'Finalizat'
	};

	const formatMoney = (value?: number) =>
		value === undefined || value === null
			? '-'
			: `${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value)} lei`;

	const formatDate = (value?: string) =>
		value
			? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value))
			: 'Fără dată';

	const dateValue = (value?: string) => value?.slice(0, 10) ?? '';
	const documentName = (documentId: number) =>
		data.documents.find((document) => document.id === documentId)?.originalFilename ??
		`Document #${documentId}`;
</script>

<section class="procurement-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<section class="panel">
		<h2>Aprovizionare nouă</h2>
		<form class="event-form" method="POST" action="?/createEvent">
			<label>
				<span>Nume</span>
				<input name="name" required />
			</label>
			<label>
				<span>Furnizor</span>
				<input name="supplier" />
			</label>
			<label>
				<span>Dată</span>
				<input name="date" type="date" />
			</label>
			<label>
				<span>Metodă</span>
				<select name="method">
					<option value="self_purchase">Cumpărare directă</option>
					<option value="delivery">Livrare</option>
				</select>
			</label>
			<label>
				<span>Status</span>
				<select name="status">
					<option value="planned">Planificat</option>
					<option value="in_progress">În lucru</option>
					<option value="completed">Finalizat</option>
				</select>
			</label>
			<label class="wide">
				<span>Notițe</span>
				<input name="notes" />
			</label>
			<button type="submit">Adaugă</button>
		</form>
	</section>

	{#each data.events as event (event.id)}
		<article class="panel event-card">
			<div class="event-heading">
				<div>
					<p class="eyebrow">Aprovizionare</p>
					<h2>{event.name}</h2>
					<p class="muted">
						{event.supplier ?? 'Fără furnizor'} · {formatDate(event.date)} · {methodLabels[event.method]}
					</p>
				</div>
				<div class={`status ${event.status}`}>{statusLabels[event.status]}</div>
			</div>

			<form class="event-form" method="POST" action="?/updateEvent">
				<input type="hidden" name="eventId" value={event.id} />
				<label>
					<span>Nume</span>
					<input name="name" value={event.name} required />
				</label>
				<label>
					<span>Furnizor</span>
					<input name="supplier" value={event.supplier ?? ''} />
				</label>
				<label>
					<span>Dată</span>
					<input name="date" type="date" value={dateValue(event.date)} />
				</label>
				<label>
					<span>Metodă</span>
					<select name="method">
						<option value="self_purchase" selected={event.method === 'self_purchase'}>Cumpărare directă</option>
						<option value="delivery" selected={event.method === 'delivery'}>Livrare</option>
					</select>
				</label>
				<label>
					<span>Status</span>
					<select name="status">
						<option value="planned" selected={event.status === 'planned'}>Planificat</option>
						<option value="in_progress" selected={event.status === 'in_progress'}>În lucru</option>
						<option value="completed" selected={event.status === 'completed'}>Finalizat</option>
					</select>
				</label>
				<label class="wide">
					<span>Notițe</span>
					<input name="notes" value={event.notes ?? ''} />
				</label>
				<button type="submit">Salvează</button>
			</form>

			<div class="event-actions">
				<form method="POST" action="?/addRemaining">
					<input type="hidden" name="eventId" value={event.id} />
					<button class="secondary" type="submit">Adaugă rămasul</button>
				</form>
				<a href={resolve(`/activities/${data.activityId}/kitchen/procurement/${event.id}/export.csv`)}>
					Export CSV
				</a>
				<form method="POST" action="?/deleteEvent">
					<input type="hidden" name="eventId" value={event.id} />
					<button class="danger" type="submit">Șterge</button>
				</form>
			</div>

			<section class="item-section">
				<h3>Lista de cumpărături</h3>
				{#if event.items.length}
					<div class="item-list">
						{#each event.items as item (item.id)}
							<div class="item-row">
								<form class="item-form" method="POST" action="?/updateItem">
									<input type="hidden" name="itemId" value={item.id} />
									<select name="ingredientId" aria-label="Ingredient">
										{#each data.ingredients as ingredient (ingredient.id)}
											<option value={ingredient.id} selected={item.ingredientId === ingredient.id}>
												{ingredient.name}
											</option>
										{/each}
									</select>
									<input name="quantity" type="number" min="0.01" step="0.01" value={item.quantity} />
									<input name="unit" value={item.unit} />
									<input
										name="estimatedTotalCost"
										type="number"
										min="0"
										step="0.01"
										value={item.estimatedTotalCost ?? ''}
										placeholder="estimat"
									/>
									<input
										name="realTotalCost"
										type="number"
										min="0"
										step="0.01"
										value={item.realTotalCost ?? ''}
										placeholder="real"
									/>
									<input name="notes" value={item.notes ?? ''} placeholder="notițe" />
									<button type="submit">Salvează</button>
								</form>
								<form method="POST" action="?/deleteItem">
									<input type="hidden" name="itemId" value={item.id} />
									<button class="danger compact" type="submit">Șterge</button>
								</form>
							</div>
						{/each}
					</div>
				{:else}
					<p class="muted">Nu sunt poziții adăugate.</p>
				{/if}

				<form class="item-form add" method="POST" action="?/addItem">
					<input type="hidden" name="eventId" value={event.id} />
					<select name="ingredientId" required aria-label="Ingredient">
						<option value="">Ingredient</option>
						{#each data.ingredients as ingredient (ingredient.id)}
							<option value={ingredient.id}>{ingredient.name}</option>
						{/each}
					</select>
					<input name="quantity" type="number" min="0.01" step="0.01" placeholder="cantitate" required />
					<input name="unit" placeholder="unitate" required />
					<input name="estimatedTotalCost" type="number" min="0" step="0.01" placeholder="estimat" />
					<input name="realTotalCost" type="number" min="0" step="0.01" placeholder="real" />
					<input name="notes" placeholder="notițe" />
					<button type="submit">Adaugă</button>
				</form>
			</section>

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
							{#each data.documents as document (document.id)}
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
		</article>
	{/each}
</section>

<style>
	.procurement-page,
	.panel,
	.event-card,
	.item-section,
	.document-section,
	.item-list {
		display: grid;
		gap: 16px;
	}

	.panel {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.event-form,
	.item-form,
	.document-actions,
	.document-actions form {
		display: grid;
		gap: 10px;
		align-items: end;
	}

	.event-form {
		grid-template-columns: repeat(5, minmax(120px, 1fr));
	}

	.event-form .wide {
		grid-column: span 4;
	}

	.item-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 8px;
		align-items: end;
	}

	.item-form {
		grid-template-columns:
			minmax(150px, 1.5fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr)
			minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(130px, 1fr) auto;
	}

	.document-actions {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.document-actions form {
		grid-template-columns: minmax(160px, 1fr) minmax(120px, 1fr) auto;
	}

	.document-actions form:first-child {
		grid-template-columns: minmax(160px, 1fr) auto;
	}

	.event-heading,
	.event-actions,
	.document-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	.event-actions {
		justify-content: flex-start;
	}

	.event-actions a,
	button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0 12px;
		font-weight: 800;
		text-decoration: none;
	}

	button {
		border: 0;
		background: #0f766e;
		color: #ffffff;
		cursor: pointer;
	}

	.event-actions a,
	.secondary {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.danger {
		border: 1px solid #fecaca;
		background: #ffffff;
		color: #991b1b;
	}

	.compact {
		min-width: 82px;
	}

	.status {
		border-radius: 999px;
		padding: 6px 10px;
		background: #eef2ff;
		color: #3730a3;
		font-size: 0.8rem;
		font-weight: 900;
	}

	.status.completed {
		background: #dcfce7;
		color: #166534;
	}

	.status.in_progress {
		background: #fef3c7;
		color: #92400e;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
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

	h2,
	h3,
	p {
		margin: 0;
	}

	h2,
	h3 {
		color: #0f172a;
	}

	.muted {
		color: #64748b;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
		padding: 12px 14px;
		color: #1e3a8a;
	}

	@media (max-width: 1100px) {
		.event-form,
		.item-form,
		.item-row,
		.document-actions,
		.document-actions form,
		.document-actions form:first-child {
			grid-template-columns: 1fr;
		}

		.event-form .wide {
			grid-column: auto;
		}
	}
</style>
