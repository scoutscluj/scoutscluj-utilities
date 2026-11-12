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
		<span
			>{overview.mealCoverage.length} {overview.mealCoverage.length === 1 ? 'masă' : 'mese'}</span
		>
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
		border: 1px solid var(--sc-border);
		background: var(--sc-surface);
		border-radius: 8px;
		padding: 18px;
		box-shadow: var(--sc-shadow);
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
		border: 1px solid var(--sc-border);
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
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-canvas);
		padding: 7px 9px;
		font-weight: 600;
	}

	.coverage-items small {
		margin-left: 4px;
		color: var(--sc-muted);
	}

	.coverage-items .covered {
		border-color: var(--sc-border);
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}

	.coverage-items .partial {
		border-color: var(--sc-warning);
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
	}

	.coverage-items .uncovered {
		border-color: var(--sc-border-strong);
		background: var(--sc-accent-soft);
		color: var(--sc-link);
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	h2,
	h3 {
		color: var(--sc-ink);
	}

	.muted {
		color: var(--sc-muted);
	}

	.eyebrow {
		margin: 0 0 8px;
		color: var(--sc-muted);
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0;
	}
</style>
