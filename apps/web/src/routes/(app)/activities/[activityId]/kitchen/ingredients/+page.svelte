<script lang="ts">
	let { data, form } = $props();

	const formatQuantity = (value: number) =>
		new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);
</script>

<section class="ingredients-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<section class="panel">
		<h2>Ingredient nou</h2>
		<form class="ingredient-form" method="POST" action="?/create">
			<label>
				<span>Nume</span>
				<input name="name" required />
			</label>
			<label>
				<span>Categorie</span>
				<input name="category" required />
			</label>
			<label>
				<span>Unitate</span>
				<input name="defaultUnit" placeholder="KG" required />
			</label>
			<label>
				<span>Preț estimat/unitate</span>
				<input name="defaultPricePerUnit" type="number" min="0.01" step="0.01" required />
			</label>
			<button type="submit">Adaugă</button>
		</form>
	</section>

	<section class="panel">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Necesar</p>
				<h2>Ingrediente pentru plan</h2>
			</div>
			<span>{data.overview.ingredientNeeds.length} poziții</span>
		</div>

		{#if data.overview.ingredientNeeds.length}
			<div class="need-cards">
				{#each data.overview.ingredientNeeds as need (need.ingredientId)}
					<article>
						<h3>{need.ingredientName}</h3>
						<p>{need.category}</p>
						<strong>{formatQuantity(need.remainingQuantity)} {need.unit}</strong>
						<span>{formatQuantity(need.coveragePercent)}% acoperit</span>
					</article>
				{/each}
			</div>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Ingredient</th>
							<th>Categorie</th>
							<th>Necesar</th>
							<th>Aprovizionat</th>
							<th>Rămas</th>
							<th>Cost estimat</th>
						</tr>
					</thead>
					<tbody>
						{#each data.overview.ingredientNeeds as need (need.ingredientId)}
							<tr>
								<td>{need.ingredientName}</td>
								<td>{need.category}</td>
								<td>{formatQuantity(need.neededQuantity)} {need.unit}</td>
								<td>{formatQuantity(need.procuredQuantity)} {need.unit}</td>
								<td>{formatQuantity(need.remainingQuantity)} {need.unit}</td>
								<td>{formatQuantity(need.estimatedCost)} lei</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="muted">Nu există ingrediente calculate încă.</p>
		{/if}
	</section>

	<section class="panel">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Catalog</p>
				<h2>Ingrediente</h2>
			</div>
			<span>{data.ingredients.length} ingrediente</span>
		</div>

		<div class="catalog-list">
			{#each data.ingredients as ingredient (ingredient.id)}
				<form class="ingredient-row" method="POST" action="?/update">
					<input type="hidden" name="ingredientId" value={ingredient.id} />
					<label>
						<span>Nume</span>
						<input name="name" value={ingredient.name} required />
					</label>
					<label>
						<span>Categorie</span>
						<input name="category" value={ingredient.category} required />
					</label>
					<label>
						<span>Unitate</span>
						<input name="defaultUnit" value={ingredient.defaultUnit} required />
					</label>
					<label>
						<span>Preț/unitate</span>
						<input
							name="defaultPricePerUnit"
							type="number"
							min="0.01"
							step="0.01"
							value={ingredient.defaultPricePerUnit}
							required
						/>
					</label>
					<button type="submit">Salvează</button>
				</form>
			{/each}
		</div>
	</section>
</section>

<style>
	.ingredients-page,
	.panel,
	.catalog-list {
		display: grid;
		gap: 16px;
	}

	.panel,
	.need-cards article,
	.ingredient-row {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.panel {
		padding: 18px;
	}

	.ingredient-form,
	.ingredient-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(120px, 1fr)) auto;
		gap: 10px;
		align-items: end;
	}

	.ingredient-row {
		padding: 14px;
		box-shadow: none;
	}

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.section-heading span {
		color: #64748b;
		font-weight: 800;
	}

	.need-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 10px;
	}

	.need-cards article {
		display: grid;
		gap: 5px;
		padding: 14px;
	}

	.need-cards strong {
		color: #0f766e;
		font-size: 1.2rem;
	}

	.need-cards span,
	.need-cards p,
	.muted {
		color: #64748b;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		border-bottom: 1px solid #e2e8f0;
		padding: 10px;
		text-align: left;
	}

	th {
		color: #475569;
		font-size: 0.78rem;
		text-transform: uppercase;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
	}

	input {
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

	h2,
	h3,
	p {
		margin: 0;
	}

	h2,
	h3 {
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

	@media (max-width: 960px) {
		.ingredient-form,
		.ingredient-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 620px) {
		.ingredient-form,
		.ingredient-row {
			grid-template-columns: 1fr;
		}
	}
</style>
