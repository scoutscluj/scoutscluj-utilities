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

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value));

	const mealsFor = (dayId: number, slot: keyof typeof slotLabels) =>
		data.overview.meals.filter((meal) => meal.kitchenDayId === dayId && meal.slot === slot);
</script>

<section class="meals-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<section class="panel">
		<h2>Adaugă masă</h2>
		<form class="inline-form" method="POST" action="?/createMeal">
			<label>
				<span>Zi</span>
				<select name="kitchenDayId" required>
					{#each data.overview.days as day (day.id)}
						<option value={day.id}>{formatDate(day.date)}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>Slot</span>
				<select name="slot" required>
					{#each slotEntries as [value, label]}
						<option value={value}>{label}</option>
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
			<button type="submit">Adaugă</button>
		</form>
	</section>

	{#each data.overview.days as day (day.id)}
		<section class="day-panel">
			<h2>{formatDate(day.date)}</h2>
			<div class="slot-grid">
				{#each slotEntries as [slot, label]}
					<div class="slot">
						<h3>{label}</h3>
						{#if mealsFor(day.id, slot).length}
							{#each mealsFor(day.id, slot) as meal (meal.id)}
								<article class="meal-card">
									<div class="meal-title">
										<div>
											<h4>{meal.name ?? meal.context ?? label}</h4>
											<p>{meal.context ?? 'fără context'} · {meal.attendanceTotal} participanți</p>
										</div>
										<form method="POST" action="?/deleteMeal">
											<input type="hidden" name="mealId" value={meal.id} />
											<button class="danger" type="submit">Șterge</button>
										</form>
									</div>

									<div class="recipe-list">
										{#each meal.recipes as recipe (recipe.id)}
											<div class="recipe-row">
												<span>{recipe.recipeName}</span>
												<form method="POST" action="?/deleteMealRecipe">
													<input type="hidden" name="mealRecipeId" value={recipe.id} />
													<button class="link-button" type="submit">Elimină</button>
												</form>
											</div>
										{/each}
									</div>

									<form class="compact-form" method="POST" action="?/assignRecipe">
										<input type="hidden" name="mealId" value={meal.id} />
										<select name="recipeId" required>
											<option value="">Rețetă</option>
											{#each data.recipes as recipe (recipe.id)}
												<option value={recipe.id}>{recipe.name}</option>
											{/each}
										</select>
										<input name="servingOverride" type="number" min="1" step="0.1" placeholder="porții" />
										<select name="scalingMode">
											<option value="proportional">Proporțional</option>
											<option value="whole_batch">Batch întreg</option>
										</select>
										<button type="submit">Atașează</button>
									</form>

									<form class="compact-form" method="POST" action="?/attendance">
										<input type="hidden" name="mealId" value={meal.id} />
										<textarea
											name="rows"
											rows="2"
											placeholder="Lupișori: 24&#10;Adulți: 6"
										></textarea>
										<button type="submit">Prezență</button>
									</form>

									<form class="compact-form" method="POST" action="?/adjustment">
										<input type="hidden" name="mealId" value={meal.id} />
										<select name="ingredientId" required>
											<option value="">Ingredient</option>
											{#each data.ingredients as ingredient (ingredient.id)}
												<option value={ingredient.id}>{ingredient.name}</option>
											{/each}
										</select>
										<input name="quantityDelta" type="number" step="0.01" placeholder="+/- cantitate" />
										<input name="unit" placeholder="KG" />
										<input name="notes" placeholder="notițe" />
										<button type="submit">Ajustează</button>
									</form>
									{#if meal.adjustments.length}
										<div class="adjustment-list">
											{#each meal.adjustments as adjustment (adjustment.id)}
												<form class="adjustment-row" method="POST" action="?/deleteAdjustment">
													<input type="hidden" name="adjustmentId" value={adjustment.id} />
													<span>
														{adjustment.ingredientName}: {adjustment.quantityDelta} {adjustment.unit}
													</span>
													<button class="link-button" type="submit">EliminÄƒ</button>
												</form>
											{/each}
										</div>
									{/if}
								</article>
							{/each}
						{:else}
							<p class="muted">Nicio masă.</p>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}
</section>

<style>
	.meals-page,
	.panel,
	.day-panel,
	.meal-card,
	.recipe-list,
	.adjustment-list {
		display: grid;
		gap: 14px;
	}

	.panel,
	.day-panel,
	.meal-card {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 16px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.slot-grid {
		display: grid;
		grid-template-columns: repeat(5, minmax(180px, 1fr));
		gap: 10px;
		overflow-x: auto;
	}

	.slot {
		display: grid;
		align-content: start;
		gap: 10px;
		min-width: 180px;
	}

	.inline-form,
	.compact-form {
		display: grid;
		grid-template-columns: repeat(5, minmax(120px, 1fr));
		gap: 10px;
		align-items: end;
	}

	.compact-form {
		grid-template-columns: minmax(140px, 1fr) minmax(80px, 110px) minmax(120px, 150px) auto;
	}

	.compact-form:has(textarea) {
		grid-template-columns: 1fr auto;
	}

	.meal-title,
	.recipe-row,
	.adjustment-row {
		display: flex;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	h2,
	h3,
	h4,
	p {
		margin: 0;
	}

	h2,
	h3,
	h4 {
		color: #0f172a;
	}

	.muted,
	.meal-title p {
		color: #64748b;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.85rem;
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

	.danger,
	.link-button {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #991b1b;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
		padding: 12px 14px;
		color: #1e3a8a;
	}

	@media (max-width: 900px) {
		.inline-form,
		.compact-form,
		.compact-form:has(textarea) {
			grid-template-columns: 1fr;
		}
	}
</style>
