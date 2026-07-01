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
				<div class="item-row">
					<form class="item-form" method="POST" action="?/updateItem">
						<input type="hidden" name="itemId" value={item.id} />
						<select name="ingredientId" aria-label="Ingredient">
							{#each ingredients as ingredient (ingredient.id)}
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
			{#each ingredients as ingredient (ingredient.id)}
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

	.danger {
		border: 1px solid #fecaca;
		background: #ffffff;
		color: #991b1b;
	}

	.compact {
		min-width: 82px;
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

	h3,
	p {
		margin: 0;
	}

	h3 {
		color: #0f172a;
	}

	.muted {
		color: #64748b;
	}

	@media (max-width: 1100px) {
		.item-form,
		.item-row {
			grid-template-columns: 1fr;
		}
	}
</style>
