<script lang="ts">
	let { data, form } = $props();

	let newRecipeRows = $state(1);
	let extraRowsByRecipe = $state<Record<number, number>>({});

	const blankRows = (count: number) => Array.from({ length: count }, (_, index) => index);
	const addRecipeRow = (recipeId: number) => {
		extraRowsByRecipe[recipeId] = (extraRowsByRecipe[recipeId] ?? 0) + 1;
	};
</script>

<section class="recipes-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<section class="panel">
		<h2>Rețetă nouă</h2>
		<form class="recipe-form" method="POST" action="?/create">
			<div class="recipe-fields">
				<label>
					<span>Nume</span>
					<input name="name" required />
				</label>
				<label>
					<span>Porții</span>
					<input name="servings" type="number" min="1" step="0.1" required />
				</label>
				<label class="wide">
					<span>Descriere</span>
					<input name="description" />
				</label>
			</div>
			<div class="ingredient-editor">
				{#each blankRows(newRecipeRows) as index (index)}
					<div class="ingredient-line">
						<select name="ingredientId" aria-label={`Ingredient ${index + 1}`}>
							<option value="">Ingredient</option>
							{#each data.ingredients as ingredient (ingredient.id)}
								<option value={ingredient.id}>{ingredient.name}</option>
							{/each}
						</select>
						<input name="quantity" type="number" min="0.01" step="0.01" placeholder="cantitate" />
						<input name="unit" placeholder="unitate" />
					</div>
				{/each}
			</div>
			<div class="form-actions">
				<button type="button" class="secondary-button" onclick={() => (newRecipeRows += 1)}>
					Adaugă ingredient
				</button>
				<button type="submit">Adaugă rețeta</button>
			</div>
		</form>
	</section>

	<section class="recipe-list">
		{#each data.recipes as recipe (recipe.id)}
			<form class="panel recipe-form" method="POST" action="?/update">
				<input type="hidden" name="recipeId" value={recipe.id} />
				<div class="recipe-title">
					<div>
						<p class="eyebrow">Rețetă</p>
						<h2>{recipe.name}</h2>
					</div>
					<span>{recipe.ingredients.length} ingrediente</span>
				</div>
				<div class="recipe-fields">
					<label>
						<span>Nume</span>
						<input name="name" value={recipe.name} required />
					</label>
					<label>
						<span>Porții</span>
						<input
							name="servings"
							type="number"
							min="1"
							step="0.1"
							value={recipe.servings}
							required
						/>
					</label>
					<label class="wide">
						<span>Descriere</span>
						<input name="description" value={recipe.description ?? ''} />
					</label>
				</div>
				<div class="ingredient-editor">
					{#each recipe.ingredients as row, index (row.id)}
						<div class="ingredient-line">
							<select name="ingredientId" aria-label={`Ingredient ${index + 1}`}>
								<option value="">Ingredient</option>
								{#each data.ingredients as ingredient (ingredient.id)}
									<option value={ingredient.id} selected={row?.ingredientId === ingredient.id}>
										{ingredient.name}
									</option>
								{/each}
							</select>
							<input
								name="quantity"
								type="number"
								min="0.01"
								step="0.01"
								value={row?.quantity ?? ''}
								placeholder="cantitate"
							/>
							<input name="unit" value={row?.unit ?? ''} placeholder="unitate" />
						</div>
					{/each}
					{#each blankRows(extraRowsByRecipe[recipe.id] ?? 0) as index (index)}
						<div class="ingredient-line">
							<select name="ingredientId" aria-label={`Ingredient nou ${index + 1}`}>
								<option value="">Ingredient</option>
								{#each data.ingredients as ingredient (ingredient.id)}
									<option value={ingredient.id}>{ingredient.name}</option>
								{/each}
							</select>
							<input name="quantity" type="number" min="0.01" step="0.01" placeholder="cantitate" />
							<input name="unit" placeholder="unitate" />
						</div>
					{/each}
				</div>
				<div class="form-actions">
					<button type="button" class="secondary-button" onclick={() => addRecipeRow(recipe.id)}>
						Adaugă ingredient
					</button>
					<button type="submit">Salvează</button>
				</div>
			</form>
		{/each}
	</section>
</section>

<style>
	.recipes-page,
	.recipe-list,
	.panel,
	.recipe-form {
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

	.recipe-fields {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(100px, 140px) minmax(220px, 2fr);
		gap: 10px;
	}

	.ingredient-editor {
		display: grid;
		gap: 8px;
	}

	.ingredient-line {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(100px, 140px) minmax(100px, 140px);
		gap: 8px;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.recipe-title {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.recipe-title span {
		color: #64748b;
		font-weight: 800;
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

	button {
		justify-self: start;
		min-height: 40px;
		border: 0;
		border-radius: 8px;
		background: #0f766e;
		color: #ffffff;
		padding: 0 14px;
		font-weight: 800;
		cursor: pointer;
	}

	button.secondary-button {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #0f172a;
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		color: #0f172a;
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

	@media (max-width: 760px) {
		.recipe-fields,
		.ingredient-line {
			grid-template-columns: 1fr;
		}
	}
</style>
