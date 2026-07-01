<script lang="ts">
	let { data, form } = $props();

	let editing = $state<(typeof data.ingredients)[number] | null>(null);
	let creating = $state(false);

	const formatQuantity = (value: number) =>
		new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);

	const closeModal = () => {
		editing = null;
		creating = false;
	};
</script>

<section class="ingredients-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<header class="page-heading">
		<div>
			<p class="eyebrow">Catalog partajat</p>
			<h1>Ingrediente</h1>
		</div>
		<button type="button" onclick={() => (creating = true)}>Ingredient nou</button>
	</header>

	<section class="panel">
		<div class="section-heading">
			<h2>Necesar pentru plan</h2>
			<span>{data.overview.ingredientNeeds.length} poziții</span>
		</div>
		{#if data.overview.ingredientNeeds.length}
			<div class="need-list">
				{#each data.overview.ingredientNeeds as need (need.ingredientId)}
					<div>
						<strong>{need.ingredientName}</strong>
						<span>{formatQuantity(need.remainingQuantity)} {need.unit} rămas</span>
						<meter min="0" max="100" value={need.coveragePercent}></meter>
					</div>
				{/each}
			</div>
		{:else}
			<p class="muted">Nu există ingrediente calculate încă.</p>
		{/if}
	</section>

	<section class="panel">
		<div class="section-heading">
			<h2>Catalog</h2>
			<span>{data.ingredients.length} ingrediente</span>
		</div>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Nume</th>
						<th>Categorie</th>
						<th>Unitate</th>
						<th>Preț estimat</th>
					</tr>
				</thead>
				<tbody>
					{#each data.ingredients as ingredient (ingredient.id)}
						<tr onclick={() => (editing = ingredient)} tabindex="0">
							<td>{ingredient.name}</td>
							<td>{ingredient.category}</td>
							<td>{ingredient.defaultUnit}</td>
							<td>{formatQuantity(ingredient.defaultPricePerUnit)} lei</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if creating || editing}
		<div class="modal-backdrop" role="presentation">
			<button class="backdrop-button" type="button" aria-label="Închide" onclick={closeModal}
			></button>
			<section class="modal" role="dialog" aria-modal="true" tabindex="-1">
				<div class="modal-heading">
					<div>
						<p class="eyebrow">Catalog partajat</p>
						<h2>{editing ? 'Editează ingredient' : 'Ingredient nou'}</h2>
					</div>
					<button class="ghost" type="button" onclick={closeModal} aria-label="Închide">×</button>
				</div>
				<form class="modal-form" method="POST" action={editing ? '?/update' : '?/create'}>
					{#if editing}
						<input type="hidden" name="ingredientId" value={editing.id} />
					{/if}
					<label>
						<span>Nume</span>
						<input name="name" value={editing?.name ?? ''} required />
					</label>
					<label>
						<span>Categorie</span>
						<input name="category" value={editing?.category ?? ''} required />
					</label>
					<label>
						<span>Unitate implicită</span>
						<input name="defaultUnit" value={editing?.defaultUnit ?? 'KG'} required />
					</label>
					<label>
						<span>Preț estimat/unitate</span>
						<input
							name="defaultPricePerUnit"
							type="number"
							min="0.01"
							step="0.01"
							value={editing?.defaultPricePerUnit ?? ''}
							required
						/>
					</label>
					<button type="submit">Salvează</button>
				</form>
			</section>
		</div>
	{/if}
</section>

<style>
	.ingredients-page,
	.panel,
	.modal-form {
		display: grid;
		gap: 14px;
	}

	.page-heading,
	.section-heading,
	.modal-heading {
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.panel,
	.form-message {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 14px;
	}

	.need-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 8px;
	}

	.need-list div {
		display: grid;
		gap: 5px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px;
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

	tbody tr {
		cursor: pointer;
	}

	tbody tr:hover {
		background: #f8fafc;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: grid;
		place-items: center;
		background: rgba(15, 23, 42, 0.28);
		padding: 16px;
	}

	.modal {
		position: relative;
		z-index: 1;
		width: min(540px, 100%);
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
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

	.ghost {
		width: 34px;
		background: #f8fafc;
		color: #334155;
		font-size: 1.1rem;
	}

	h1,
	h2,
	p {
		margin: 0;
	}

	h1,
	h2,
	strong {
		color: #0f172a;
	}

	span,
	.muted {
		color: #64748b;
	}

	.eyebrow {
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 900;
		text-transform: uppercase;
	}
</style>
