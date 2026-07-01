<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();

	const slotLabels = {
		breakfast: 'Mic dejun',
		snack_1: 'Gustare 1',
		lunch: 'Prânz',
		snack_2: 'Gustare 2',
		dinner: 'Cină'
	};

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value));

	const formatQuantity = (value: number) =>
		new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);

	const mealsForDay = (dayId: number) =>
		data.overview.meals
			.filter((meal) => meal.kitchenDayId === dayId)
			.sort((left, right) => left.sortOrder - right.sortOrder);

	const coverageLabel = {
		uncovered: 'neacoperit',
		partial: 'parțial acoperit',
		covered: 'acoperit'
	};
</script>

<section class="reports-page">
	<div class="report-actions">
		<a href={resolve(`/activities/${data.activityId}/kitchen/reports/ingredients.csv`)}>
			CSV necesar ingrediente
		</a>
		<a href={resolve(`/activities/${data.activityId}/kitchen/reports/procurement.csv`)}>
			CSV aprovizionare
		</a>
		<button type="button" onclick={() => window.print()}>Tipărește</button>
	</div>

	<section class="report-sheet">
		<div class="report-heading">
			<p class="eyebrow">Plan mese</p>
			<h2>Calendarul meselor</h2>
		</div>
		{#each data.overview.days as day (day.id)}
			<article class="day-report">
				<h3>{formatDate(day.date)}</h3>
				<div class="meal-list">
					{#each mealsForDay(day.id) as meal (meal.id)}
						<div>
							<strong>{slotLabels[meal.slot]}</strong>
							<span
								>{meal.name ?? meal.context ?? 'masă'} · {meal.attendanceTotal} participanți</span
							>
							{#if meal.recipes.length}
								<p>{meal.recipes.map((recipe) => recipe.recipeName).join(', ')}</p>
							{/if}
							{#if meal.recipes.flatMap((recipe) => recipe.condiments).length}
								<p>Condimente: {meal.recipes.flatMap((recipe) => recipe.condiments).join(', ')}</p>
							{/if}
						</div>
					{:else}
						<p class="muted">Nu sunt mese planificate.</p>
					{/each}
				</div>
			</article>
		{/each}
	</section>

	<section class="report-sheet">
		<div class="report-heading">
			<p class="eyebrow">Necesar ingrediente</p>
			<h2>Totaluri calculate</h2>
		</div>
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
	</section>

	<section class="report-sheet">
		<div class="report-heading">
			<p class="eyebrow">Acoperire</p>
			<h2>Nevoi pentru următoarele mese</h2>
		</div>
		{#each data.overview.mealCoverage as meal (meal.mealId)}
			<article class="day-report">
				<h3>{meal.date} · {meal.mealLabel}</h3>
				<table>
					<thead>
						<tr>
							<th>Ingredient</th>
							<th>Necesar</th>
							<th>Acoperit</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each meal.items as item (`${meal.mealId}-${item.ingredientId}`)}
							<tr>
								<td>{item.ingredientName}</td>
								<td>{formatQuantity(item.neededQuantity)} {item.unit}</td>
								<td>{formatQuantity(item.coveredQuantity)} {item.unit}</td>
								<td>{coverageLabel[item.state]}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if meal.condiments.length}
					<p>Condimente: {meal.condiments.join(', ')}</p>
				{/if}
			</article>
		{/each}
	</section>

	<section class="report-sheet">
		<div class="report-heading">
			<p class="eyebrow">Listă aprovizionare</p>
			<h2>Evenimente și poziții</h2>
		</div>
		{#each data.procurement as event (event.id)}
			<article class="procurement-report">
				<h3>{event.name}</h3>
				<p>
					{event.supplier ?? 'Fără furnizor'} · {event.ownerName ?? 'fără responsabil'} · {event.status}
				</p>
				<table>
					<thead>
						<tr>
							<th>Ingredient</th>
							<th>Cantitate</th>
							<th>Estimare</th>
							<th>Real</th>
						</tr>
					</thead>
					<tbody>
						{#each event.items as item (item.id)}
							<tr>
								<td>{item.ingredientName}</td>
								<td>{formatQuantity(item.quantity)} {item.unit}</td>
								<td
									>{item.estimatedTotalCost
										? `${formatQuantity(item.estimatedTotalCost)} lei`
										: '-'}</td
								>
								<td>{item.realTotalCost ? `${formatQuantity(item.realTotalCost)} lei` : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</article>
		{/each}
	</section>

	<section class="report-sheet">
		<div class="report-heading">
			<p class="eyebrow">Condimente</p>
			<h2>Reminder necantitativ</h2>
		</div>
		{#if data.overview.condimentReminders.length}
			<p>{data.overview.condimentReminders.join(', ')}</p>
		{:else}
			<p class="muted">Nu sunt condimente în plan.</p>
		{/if}
	</section>
</section>

<style>
	.reports-page,
	.report-sheet,
	.day-report,
	.procurement-report,
	.meal-list {
		display: grid;
		gap: 16px;
	}

	.report-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.report-actions a,
	.report-actions button {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0 12px;
		font-weight: 800;
		text-decoration: none;
	}

	.report-actions a {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.report-actions button {
		border: 0;
		background: #0f766e;
		color: #ffffff;
		cursor: pointer;
	}

	.report-sheet {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.day-report,
	.procurement-report {
		border-top: 1px solid #e2e8f0;
		padding-top: 14px;
	}

	.meal-list div {
		display: grid;
		gap: 3px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
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

	h2,
	h3,
	p {
		margin: 0;
	}

	h2,
	h3,
	strong {
		color: #0f172a;
	}

	span,
	.muted,
	.procurement-report p {
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

	@media print {
		.report-actions {
			display: none;
		}

		.report-sheet {
			break-inside: avoid;
			box-shadow: none;
		}
	}
</style>
