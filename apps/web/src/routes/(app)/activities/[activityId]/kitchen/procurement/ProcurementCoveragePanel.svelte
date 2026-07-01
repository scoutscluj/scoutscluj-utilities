<script lang="ts">
	import type { KitchenOverview } from '../kitchen-api';

	let { overview }: { overview: KitchenOverview } = $props();

	const coverageLabels = {
		uncovered: 'neacoperit',
		partial: 'parțial',
		covered: 'acoperit'
	};
</script>

<section class="panel">
	<div class="section-heading">
		<div>
			<p class="eyebrow">Acoperire</p>
			<h2>Următoarele mese</h2>
		</div>
		<span>{overview.mealCoverage.length} mese</span>
	</div>
	<div class="coverage-list">
		{#each overview.mealCoverage as meal (meal.mealId)}
			<article>
				<h3>{meal.date} · {meal.mealLabel}</h3>
				<div class="coverage-items">
					{#each meal.items as item (`${meal.mealId}-${item.ingredientId}`)}
						<span class={item.state}>
							{item.ingredientName}: {item.coveredQuantity}/{item.neededQuantity}
							{item.unit}
							<small>{coverageLabels[item.state]}</small>
						</span>
					{/each}
				</div>
				{#if meal.condiments.length}
					<p class="muted">Condimente: {meal.condiments.join(', ')}</p>
				{/if}
			</article>
		{/each}
	</div>
	{#if overview.condimentReminders.length}
		<div class="condiments">
			<strong>Condimente de verificat</strong>
			<span>{overview.condimentReminders.join(', ')}</span>
		</div>
	{/if}
</section>

<style>
	.panel,
	.coverage-list {
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

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	.coverage-list article {
		display: grid;
		gap: 8px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
	}

	.coverage-items,
	.condiments {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.coverage-items span,
	.condiments {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #f8fafc;
		padding: 7px 9px;
		font-weight: 800;
	}

	.coverage-items small {
		margin-left: 4px;
		color: #64748b;
	}

	.coverage-items .covered {
		border-color: #bbf7d0;
		background: #f0fdf4;
		color: #166534;
	}

	.coverage-items .partial {
		border-color: #fde68a;
		background: #fffbeb;
		color: #92400e;
	}

	.coverage-items .uncovered {
		border-color: #fecaca;
		background: #fef2f2;
		color: #991b1b;
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
</style>
