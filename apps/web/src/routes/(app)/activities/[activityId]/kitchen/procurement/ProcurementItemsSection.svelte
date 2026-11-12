<script lang="ts">
	import type { KitchenIngredient, KitchenProcurementEvent } from '../kitchen-api';

	let {
		event,
		ingredients
	}: {
		event: KitchenProcurementEvent;
		ingredients: KitchenIngredient[];
	} = $props();
</script>

<section class="item-section">
	<h3>Lista de cumpărături</h3>
	{#if event.items.length}
		<div class="item-list">
			{#each event.items as item (item.id)}
				<details class="item-editor">
					<summary
						>{item.ingredientName} · {item.quantity} {item.unit} <span>Modifică</span></summary
					>
					<div class="item-row">
						<form class="item-form" method="POST" action="?/updateItem">
							<input type="hidden" name="itemId" value={item.id} />
							<label
								><span>Ingredient</span><select name="ingredientId" aria-label="Ingredient">
									{#each ingredients as ingredient (ingredient.id)}
										<option value={ingredient.id} selected={item.ingredientId === ingredient.id}>
											{ingredient.name}
										</option>
									{/each}
								</select></label
							>
							<label
								><span>Cantitate</span><input
									name="quantity"
									type="number"
									min="0.01"
									step="0.01"
									value={item.quantity}
								/></label
							>
							<label><span>Unitate</span><input name="unit" value={item.unit} /></label>
							<label
								><span>Cost estimat (lei)</span><input
									name="estimatedTotalCost"
									type="number"
									min="0"
									step="0.01"
									value={item.estimatedTotalCost ?? ''}
									placeholder="estimat"
								/></label
							>
							<label
								><span>Cost real (lei)</span><input
									name="realTotalCost"
									type="number"
									min="0"
									step="0.01"
									value={item.realTotalCost ?? ''}
									placeholder="real"
								/></label
							>
							<label
								><span>Notițe</span><input
									name="notes"
									value={item.notes ?? ''}
									placeholder="notițe"
								/></label
							>
							<button type="submit">Salvează</button>
						</form>
						<form method="POST" action="?/deleteItem">
							<input type="hidden" name="itemId" value={item.id} />
							<button class="danger compact" type="submit">Șterge</button>
						</form>
					</div>
				</details>
			{/each}
		</div>
	{:else}
		<p class="muted">Nu sunt poziții adăugate.</p>
	{/if}

	<details class="item-editor">
		<summary>Adaugă ingredient</summary>
		<form class="item-form add" method="POST" action="?/addItem">
			<input type="hidden" name="eventId" value={event.id} />
			<label
				><span>Ingredient</span><select name="ingredientId" required aria-label="Ingredient">
					<option value="">Ingredient</option>
					{#each ingredients as ingredient (ingredient.id)}
						<option value={ingredient.id}>{ingredient.name}</option>
					{/each}
				</select></label
			>
			<label
				><span>Cantitate</span><input
					name="quantity"
					type="number"
					min="0.01"
					step="0.01"
					placeholder="cantitate"
					required
				/></label
			>
			<label><span>Unitate</span><input name="unit" placeholder="unitate" required /></label>
			<label
				><span>Cost estimat (lei)</span><input
					name="estimatedTotalCost"
					type="number"
					min="0"
					step="0.01"
					placeholder="estimat"
				/></label
			>
			<label
				><span>Cost real (lei)</span><input
					name="realTotalCost"
					type="number"
					min="0"
					step="0.01"
					placeholder="real"
				/></label
			>
			<label><span>Notițe</span><input name="notes" placeholder="notițe" /></label>
			<button type="submit">Adaugă</button>
		</form>
	</details>
</section>

<style>
	.item-section,
	.item-list {
		display: grid;
		gap: 16px;
	}

	.item-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 8px;
		align-items: end;
	}

	.item-form {
		display: grid;
		grid-template-columns:
			minmax(150px, 1.5fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr)
			minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(130px, 1fr) auto;
		gap: 10px;
		align-items: end;
	}

	button {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 8px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		padding: 0 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.danger {
		border: 1px solid var(--sc-border-strong);
		background: var(--sc-surface);
		color: var(--sc-link);
	}

	.compact {
		min-width: 82px;
	}

	input,
	select {
		width: 100%;
		min-width: 0;
		border: 1px solid var(--sc-border-strong);
		border-radius: 8px;
		padding: 9px 10px;
		font: inherit;
	}

	h3,
	p {
		margin: 0;
	}

	h3 {
		color: var(--sc-ink);
	}

	.muted {
		color: var(--sc-muted);
	}

	@media (max-width: 1100px) {
		.item-form,
		.item-row {
			grid-template-columns: 1fr;
		}
	}

	input:not([type='hidden']):not([type='checkbox']):not([type='radio']),
	select {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}

	label {
		display: grid;
		gap: 6px;
		min-width: 0;
		color: var(--sc-ink);
		font-size: 13px;
	}
	summary {
		min-height: 44px;
		align-content: center;
		cursor: pointer;
		color: var(--sc-ink);
	}
	summary span {
		color: var(--sc-link);
		font-size: 13px;
		margin-left: 8px;
	}
	.item-editor[open] summary {
		margin-bottom: 12px;
	}
</style>
