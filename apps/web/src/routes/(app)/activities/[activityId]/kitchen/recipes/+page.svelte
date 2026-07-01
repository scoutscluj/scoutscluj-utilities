<script lang="ts">
	let { data, form } = $props();

	type Recipe = (typeof data.recipes)[number];
	type IngredientRow = { ingredientId: string; quantity: string; unit: string };

	let editingRecipe = $state<Recipe | null>(null);
	let creatingRecipe = $state(false);
	let rows = $state<IngredientRow[]>([]);
	let creatingIngredient = $state(false);

	const recipeIngredients = (recipe: Recipe) =>
		recipe.ingredients.map((row) => row.ingredientName).join(', ');

	const openRecipe = (recipe?: Recipe) => {
		editingRecipe = recipe ?? null;
		creatingRecipe = !recipe;
		rows = recipe?.ingredients.map((row) => ({
			ingredientId: String(row.ingredientId),
			quantity: String(row.quantity),
			unit: row.unit
		})) ?? [{ ingredientId: '', quantity: '', unit: 'KG' }];
	};

	const closeModal = () => {
		editingRecipe = null;
		creatingRecipe = false;
		creatingIngredient = false;
		rows = [];
	};

	const addRow = () => {
		rows = [...rows, { ingredientId: '', quantity: '', unit: 'KG' }];
	};

	const removeRow = (index: number) => {
		rows = rows.filter((_, rowIndex) => rowIndex !== index);
	};
</script>

<section class="recipes-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<header class="page-heading">
		<div>
			<p class="eyebrow">Catalog partajat</p>
			<h1>Rețete</h1>
		</div>
		<button type="button" onclick={() => openRecipe()}>Rețetă nouă</button>
	</header>

	<section class="recipe-list">
		{#each data.recipes as recipe (recipe.id)}
			<button class="recipe-row" type="button" onclick={() => openRecipe(recipe)}>
				<span>
					<strong>{recipe.name}</strong>
					<small>{recipe.servings} porții · {recipe.ingredients.length} ingrediente</small>
				</span>
				<span class="muted">{recipeIngredients(recipe) || 'Fără ingrediente'}</span>
				{#if recipe.condiments.length}
					<span class="chips">
						{#each recipe.condiments as condiment (condiment)}
							<small>{condiment}</small>
						{/each}
					</span>
				{/if}
			</button>
		{/each}
	</section>

	{#if creatingRecipe || editingRecipe}
		<div class="modal-backdrop" role="presentation">
			<button class="backdrop-button" type="button" aria-label="Închide" onclick={closeModal}
			></button>
			<section class="modal" role="dialog" aria-modal="true" tabindex="-1">
				<div class="modal-heading">
					<div>
						<p class="eyebrow">Catalog partajat</p>
						<h2>{editingRecipe ? 'Editează rețetă' : 'Rețetă nouă'}</h2>
					</div>
					<button class="ghost" type="button" onclick={closeModal} aria-label="Închide">×</button>
				</div>

				<form class="recipe-form" method="POST" action={editingRecipe ? '?/update' : '?/create'}>
					{#if editingRecipe}
						<input type="hidden" name="recipeId" value={editingRecipe.id} />
					{/if}
					<div class="fields">
						<label>
							<span>Nume</span>
							<input name="name" value={editingRecipe?.name ?? ''} required />
						</label>
						<label>
							<span>Porții</span>
							<input
								name="servings"
								type="number"
								min="1"
								step="0.1"
								value={editingRecipe?.servings ?? ''}
								required
							/>
						</label>
					</div>
					<label>
						<span>Descriere</span>
						<input name="description" value={editingRecipe?.description ?? ''} />
					</label>
					<label>
						<span>Condimente</span>
						<textarea name="condiments" rows="2"
							>{editingRecipe?.condiments.join(', ') ?? ''}</textarea
						>
					</label>

					<div class="editor-heading">
						<h3>Ingrediente</h3>
						<div>
							<button class="secondary" type="button" onclick={addRow}>Adaugă rând</button>
							<button class="secondary" type="button" onclick={() => (creatingIngredient = true)}>
								Ingredient nou
							</button>
						</div>
					</div>

					<div class="ingredient-editor">
						{#each rows as row, index (index)}
							<div class="ingredient-line">
								<select name="ingredientId" bind:value={row.ingredientId} aria-label="Ingredient">
									<option value="">Ingredient</option>
									{#each data.ingredients as ingredient (ingredient.id)}
										<option value={String(ingredient.id)}>{ingredient.name}</option>
									{/each}
								</select>
								<input
									name="quantity"
									type="number"
									min="0.01"
									step="0.01"
									bind:value={row.quantity}
									placeholder="cantitate"
								/>
								<input name="unit" bind:value={row.unit} placeholder="unitate" />
								<button class="ghost" type="button" onclick={() => removeRow(index)}>×</button>
							</div>
						{/each}
					</div>
					<button type="submit">Salvează rețeta</button>
				</form>

				{#if creatingIngredient}
					<form class="nested-form" method="POST" action="?/createIngredient">
						<p class="eyebrow">Ingredient partajat nou</p>
						<div class="fields">
							<input name="ingredientName" placeholder="nume" required />
							<input name="ingredientCategory" placeholder="categorie" required />
							<input name="ingredientDefaultUnit" placeholder="KG" required />
							<input
								name="ingredientDefaultPricePerUnit"
								type="number"
								min="0.01"
								step="0.01"
								placeholder="preț/unitate"
								required
							/>
						</div>
						<button class="secondary" type="submit">Creează ingredient</button>
					</form>
				{/if}
			</section>
		</div>
	{/if}
</section>

<style>
	.recipes-page,
	.recipe-list,
	.recipe-form,
	.ingredient-editor,
	.nested-form {
		display: grid;
		gap: 14px;
	}

	.page-heading,
	.modal-heading,
	.editor-heading {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.editor-heading div,
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.recipe-row {
		display: grid;
		grid-template-columns: minmax(180px, 0.8fr) minmax(220px, 1fr) minmax(160px, 0.8fr);
		gap: 12px;
		align-items: center;
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 12px;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.recipe-row:hover {
		background: #f8fafc;
	}

	.recipe-row span:first-child {
		display: grid;
		gap: 3px;
	}

	.chips small {
		border: 1px solid #dbe3ef;
		border-radius: 999px;
		padding: 4px 8px;
		background: #f8fafc;
		font-weight: 800;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		overflow-y: auto;
		background: rgba(15, 23, 42, 0.28);
		padding: 16px;
	}

	.modal {
		position: relative;
		z-index: 1;
		width: min(900px, 100%);
		max-height: calc(100vh - 32px);
		overflow-y: auto;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
	}

	.fields,
	.ingredient-line {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.nested-form .fields {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.ingredient-line {
		grid-template-columns: minmax(180px, 1fr) 110px 110px 38px;
	}

	.nested-form {
		margin-top: 14px;
		border-top: 1px solid #e2e8f0;
		padding-top: 14px;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
	}

	input,
	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 9px 10px;
		font: inherit;
	}

	button {
		min-height: 38px;
		border: 0;
		border-radius: 8px;
		background: #0f766e;
		color: #ffffff;
		padding: 0 12px;
		font-weight: 800;
		cursor: pointer;
	}

	.backdrop-button {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
	}

	.secondary,
	.ghost {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.ghost {
		padding: 0;
		font-size: 1.1rem;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		background: #eff6ff;
		padding: 12px 14px;
		color: #1e3a8a;
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

	h1,
	h2,
	h3,
	strong {
		color: #0f172a;
	}

	.muted,
	small {
		color: #64748b;
	}

	.eyebrow {
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	@media (max-width: 760px) {
		.recipe-row,
		.fields,
		.nested-form .fields,
		.ingredient-line {
			grid-template-columns: 1fr;
		}
	}
</style>
