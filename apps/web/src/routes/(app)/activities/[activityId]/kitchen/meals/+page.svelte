<script lang="ts">
	let { data, form } = $props();

	const slotLabels = {
		breakfast: 'Mic dejun',
		snack_1: 'Gustare 1',
		lunch: 'Prânz',
		snack_2: 'Gustare 2',
		dinner: 'Cină'
	};
	const slotEntries = Object.entries(slotLabels) as Array<[keyof typeof slotLabels, string]>;

	let selectedDayId = $state(0);
	let creatingMeal = $state(false);
	let assigningMeal = $state<(typeof data.overview.meals)[number] | null>(null);

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', { weekday: 'short', day: '2-digit', month: 'short' }).format(
			new Date(value)
		);

	const selectedDay = $derived(
		data.overview.days.find((day) => day.id === selectedDayId) ?? data.overview.days[0]
	);

	const mealsFor = (slot: keyof typeof slotLabels) =>
		data.overview.meals.filter(
			(meal) => meal.kitchenDayId === selectedDay?.id && meal.slot === slot
		);

	const closeModals = () => {
		creatingMeal = false;
		assigningMeal = null;
	};
</script>

<section class="meals-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<header class="page-heading">
		<div>
			<p class="eyebrow">Plan</p>
			<h1>Mese</h1>
		</div>
		<button type="button" onclick={() => (creatingMeal = true)}>Masă nouă</button>
	</header>

	<nav class="day-tabs" aria-label="Zile de bucătărie">
		{#each data.overview.days as day (day.id)}
			<button
				type="button"
				class:active={selectedDay?.id === day.id}
				class:outside={day.dateStatus === 'outside_activity_dates'}
				onclick={() => (selectedDayId = day.id)}
			>
				{formatDate(day.date)}
			</button>
		{/each}
	</nav>

	{#if selectedDay}
		<section class="slot-grid">
			{#each slotEntries as [slot, label] (slot)}
				<article class="slot">
					<h2>{label}</h2>
					{#if mealsFor(slot).length}
						{#each mealsFor(slot) as meal (meal.id)}
							<div class="meal-card">
								<div class="meal-heading">
									<div>
										<h3>{meal.name ?? meal.context ?? label}</h3>
										<p>{meal.context ?? 'fără context'} · {meal.attendanceTotal} participanți</p>
									</div>
									<form method="POST" action="?/deleteMeal">
										<input type="hidden" name="mealId" value={meal.id} />
										<button class="danger" type="submit">Șterge</button>
									</form>
								</div>

								<div class="recipe-list">
									{#each meal.recipes as recipe (recipe.id)}
										<div class="recipe-row" class:stale={recipe.isStale}>
											<div>
												<strong>{recipe.recipeName}</strong>
												<small>
													{recipe.servingOverride ?? recipe.servings} porții · {recipe.scalingMode}
												</small>
												{#if recipe.condiments.length}
													<small>Condimente: {recipe.condiments.join(', ')}</small>
												{/if}
												{#if recipe.isStale}
													<small class="warning">Catalogul are o versiune mai nouă.</small>
												{/if}
											</div>
											<div class="row-actions">
												{#if recipe.isStale}
													<form method="POST" action="?/refreshMealRecipe">
														<input type="hidden" name="mealRecipeId" value={recipe.id} />
														<button class="secondary" type="submit">Actualizează</button>
													</form>
												{/if}
												<form method="POST" action="?/deleteMealRecipe">
													<input type="hidden" name="mealRecipeId" value={recipe.id} />
													<button class="secondary danger-text" type="submit">Elimină</button>
												</form>
											</div>
										</div>
									{/each}
								</div>

								<button class="secondary" type="button" onclick={() => (assigningMeal = meal)}>
									Adaugă rețetă
								</button>

								<details>
									<summary>Prezență și ajustări</summary>
									<form class="compact-form" method="POST" action="?/attendance">
										<input type="hidden" name="mealId" value={meal.id} />
										<textarea name="rows" rows="2" placeholder="Lupișori: 24&#10;Adulți: 6"
										></textarea>
										<button type="submit">Salvează prezența</button>
									</form>
									<form class="compact-form" method="POST" action="?/adjustment">
										<input type="hidden" name="mealId" value={meal.id} />
										<select name="ingredientId" required>
											<option value="">Ingredient</option>
											{#each data.ingredients as ingredient (ingredient.id)}
												<option value={ingredient.id}>{ingredient.name}</option>
											{/each}
										</select>
										<input
											name="quantityDelta"
											type="number"
											step="0.01"
											placeholder="+/- cantitate"
										/>
										<input name="unit" placeholder="KG" />
										<input name="notes" placeholder="notițe" />
										<button type="submit">Ajustează</button>
									</form>
								</details>
							</div>
						{/each}
					{:else}
						<p class="muted">Nicio masă.</p>
					{/if}
				</article>
			{/each}
		</section>
	{:else}
		<p class="muted">Nu există zile generate încă.</p>
	{/if}

	{#if creatingMeal}
		<div class="modal-backdrop" role="presentation">
			<button class="backdrop-button" type="button" aria-label="Închide" onclick={closeModals}
			></button>
			<section class="modal" role="dialog" aria-modal="true" tabindex="-1">
				<div class="modal-heading">
					<h2>Masă nouă</h2>
					<button class="ghost" type="button" onclick={closeModals} aria-label="Închide">×</button>
				</div>
				<form class="modal-form" method="POST" action="?/createMeal">
					<label>
						<span>Zi</span>
						<select name="kitchenDayId" required>
							{#each data.overview.days as day (day.id)}
								<option value={day.id} selected={selectedDay?.id === day.id}
									>{formatDate(day.date)}</option
								>
							{/each}
						</select>
					</label>
					<label>
						<span>Slot</span>
						<select name="slot" required>
							{#each slotEntries as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Context</span>
						<input name="context" placeholder="tabără, drumeție" />
					</label>
					<label>
						<span>Nume</span>
						<input name="name" placeholder="grup principal" />
					</label>
					<button type="submit">Adaugă masa</button>
				</form>
			</section>
		</div>
	{/if}

	{#if assigningMeal}
		<div class="modal-backdrop" role="presentation">
			<button class="backdrop-button" type="button" aria-label="Închide" onclick={closeModals}
			></button>
			<section class="modal" role="dialog" aria-modal="true" tabindex="-1">
				<div class="modal-heading">
					<h2>Adaugă rețetă</h2>
					<button class="ghost" type="button" onclick={closeModals} aria-label="Închide">×</button>
				</div>
				<form class="modal-form" method="POST" action="?/assignRecipe">
					<input type="hidden" name="mealId" value={assigningMeal.id} />
					<label>
						<span>Rețetă</span>
						<select name="recipeId" required>
							<option value="">Alege rețeta</option>
							{#each data.recipes as recipe (recipe.id)}
								<option value={recipe.id}>{recipe.name}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Porții</span>
						<input name="servingOverride" type="number" min="1" step="0.1" placeholder="implicit" />
					</label>
					<label>
						<span>Scalare</span>
						<select name="scalingMode">
							<option value="proportional">Proporțional</option>
							<option value="whole_batch">Batch întreg</option>
						</select>
					</label>
					<button type="submit">Atașează</button>
				</form>
			</section>
		</div>
	{/if}
</section>

<style>
	.meals-page,
	.slot,
	.meal-card,
	.recipe-list,
	.modal-form,
	.compact-form {
		display: grid;
		gap: 12px;
	}

	.page-heading,
	.meal-heading,
	.recipe-row,
	.modal-heading,
	.row-actions {
		display: flex;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	.day-tabs {
		display: flex;
		gap: 6px;
		overflow-x: auto;
	}

	.slot-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(190px, 1fr));
		gap: 10px;
		overflow-x: auto;
	}

	.slot,
	.meal-card,
	.form-message {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 12px;
	}

	.recipe-row {
		align-items: flex-start;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px;
	}

	.recipe-row.stale {
		border-color: #f59e0b;
		background: #fffbeb;
	}

	.recipe-row div:first-child {
		display: grid;
		gap: 3px;
	}

	.compact-form {
		margin-top: 10px;
		grid-template-columns: 1fr auto;
	}

	.compact-form:not(:has(textarea)) {
		grid-template-columns: minmax(140px, 1fr) 110px 90px minmax(120px, 1fr) auto;
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
		width: min(560px, 100%);
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
		min-height: 36px;
		border: 0;
		border-radius: 8px;
		background: #0f766e;
		color: #ffffff;
		padding: 0 11px;
		font-weight: 800;
		cursor: pointer;
	}

	.backdrop-button {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
	}

	.day-tabs button,
	.secondary,
	.ghost {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.day-tabs button.active {
		border-color: #0f766e;
		color: #0f766e;
	}

	.day-tabs button.outside {
		border-color: #fbbf24;
		background: #fffbeb;
	}

	.danger {
		border: 1px solid #fecaca;
		background: #ffffff;
		color: #991b1b;
	}

	.danger-text,
	.warning {
		color: #92400e;
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
	small,
	.meal-heading p {
		color: #64748b;
	}

	.eyebrow {
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	@media (max-width: 900px) {
		.compact-form,
		.compact-form:not(:has(textarea)) {
			grid-template-columns: 1fr;
		}
	}
</style>
