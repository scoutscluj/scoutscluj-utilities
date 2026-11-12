<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	const formatDate = (value?: string) =>
		value
			? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value))
			: 'Fără dată';

	const formatMoney = (value: number) =>
		`${new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(value)} lei`;

	const plannedMeals = $derived(data.overview.meals.length);
	const emptyDays = $derived(
		data.overview.days.filter(
			(day) => !data.overview.meals.some((meal) => meal.kitchenDayId === day.id)
		).length
	);
	const staleRecipes = $derived(
		data.overview.meals.flatMap((meal) => meal.recipes).filter((recipe) => recipe.isStale).length
	);
	const coverageGaps = $derived(
		data.overview.mealCoverage.flatMap((meal) =>
			meal.items.filter((item) => item.state !== 'covered').map((item) => ({ meal, item }))
		)
	);
	const totalEstimatedCost = $derived(
		data.overview.ingredientNeeds.reduce((sum, item) => sum + item.estimatedCost, 0)
	);
</script>

<section class="kitchen-overview">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<section class="summary-band">
		<div>
			<h1>Bucătărie</h1>
			<p>
				{formatDate(data.activity.startDate)} - {formatDate(data.activity.endDate)}
			</p>
		</div>
		<details class="plan-settings">
			<summary>{data.overview.plan.defaultParticipantCount} participanți · modifică</summary>
			<form class="setup-form" method="POST" action="?/setup">
				<label>
					<span>Participanți</span>
					<input
						name="defaultParticipantCount"
						type="number"
						min="0"
						value={data.overview.plan.defaultParticipantCount}
					/>
				</label>
				<button type="submit">Salvează</button>
			</form>
		</details>
	</section>

	{#if !data.overview.plan.hasCompleteActivityDates}
		<section class="notice warning">
			<strong>Date necesare</strong>
			<span>Planificarea meselor are nevoie de data de început și data de final a activității.</span
			>
		</section>
	{/if}

	<section class="overview-grid">
		<a href={resolve(`/activities/${data.activity.id}/kitchen/ingredients`)}>
			<span>{data.overview.ingredientNeeds.length}</span>
			<p>ingrediente calculate</p>
		</a>
		<a href={resolve(`/activities/${data.activity.id}/kitchen/meals`)}>
			<span>{plannedMeals}</span>
			<p>{plannedMeals === 1 ? 'masă planificată' : 'mese planificate'}</p>
		</a>
		<a href={resolve(`/activities/${data.activity.id}/kitchen/procurement`)}>
			<span>{coverageGaps.length}</span>
			<p>{coverageGaps.length === 1 ? 'poziție neacoperită' : 'poziții neacoperite'}</p>
		</a>
		<a href={resolve(`/activities/${data.activity.id}/kitchen/reports`)}>
			<span>{formatMoney(totalEstimatedCost)}</span>
			<p>estimare plan</p>
		</a>
	</section>

	<section class="work-grid">
		{#if emptyDays || staleRecipes || coverageGaps.length}<article>
				<h2>Atenție</h2>
				<ul>
					{#if emptyDays > 0}<li>
							{emptyDays}
							{emptyDays === 1 ? 'zi fără mese planificate' : 'zile fără mese planificate'}
						</li>{/if}
					{#if staleRecipes > 0}<li>
							{staleRecipes}
							{staleRecipes === 1
								? 'rețetă atribuită diferă de catalog'
								: 'rețete atribuite diferă de catalog'}
						</li>{/if}
					{#if coverageGaps.length > 0}<li>
							{coverageGaps.length}
							{coverageGaps.length === 1
								? 'nevoie neacoperită complet'
								: 'nevoi neacoperite complet'}
						</li>{/if}
				</ul>
			</article>{/if}

		<article>
			<h2>Următoarele lipsuri</h2>
			{#if coverageGaps.length}
				<div class="gap-list">
					{#each coverageGaps.slice(0, 8) as gap (`${gap.meal.mealId}-${gap.item.ingredientId}`)}
						<div>
							<strong>{gap.item.ingredientName}</strong>
							<span>{gap.meal.date} · {gap.meal.mealLabel}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="muted">Tot ce este planificat apare acoperit.</p>
			{/if}
		</article>

		<article>
			<h2>Condimente</h2>
			{#if data.overview.condimentReminders.length}
				<div class="chips">
					{#each data.overview.condimentReminders as condiment (condiment)}
						<span>{condiment}</span>
					{/each}
				</div>
			{:else}
				<p class="muted">Nu sunt condimente în rețetele atribuite.</p>
			{/if}
		</article>
	</section>

	<form method="POST" action="?/syncDays">
		<button class="secondary" type="submit">Sincronizează zilele</button>
	</form>
</section>

<style>
	.kitchen-overview,
	.work-grid article,
	.gap-list {
		display: grid;
		gap: 14px;
		align-content: start;
	}

	.summary-band {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: end;
		justify-content: space-between;
		border-bottom: 1px solid var(--sc-border);
		padding-bottom: 14px;
	}

	.setup-form {
		display: flex;
		gap: 8px;
		align-items: end;
	}

	.overview-grid,
	.work-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
	}

	.work-grid {
		align-items: start;
		grid-template-columns: 0.9fr 1.4fr 1fr;
	}

	.overview-grid a,
	.work-grid article,
	.notice,
	.form-message {
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 14px;
		text-decoration: none;
	}

	.overview-grid span {
		color: var(--sc-success);
		font-size: 1.25rem;
		font-weight: 600;
	}

	.notice {
		display: flex;
		gap: 10px;
		background: var(--sc-warning-soft);
		border-color: var(--sc-warning);
	}

	.gap-list div,
	li {
		border-bottom: 1px solid var(--sc-border);
		padding-bottom: 8px;
	}

	.chips {
		align-items: start;
		align-content: start;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chips span {
		height: fit-content;
		border: 1px solid var(--sc-border);
		border-radius: 999px;
		padding: 5px 9px;
		background: var(--sc-canvas);
		font-weight: 600;
	}

	h1,
	h2,
	p,
	ul {
		margin: 0;
	}

	h1 {
		color: var(--sc-ink);
		font-size: 1.5rem;
	}

	h2 {
		color: var(--sc-ink);
		font-size: 1rem;
	}

	ul {
		display: grid;
		gap: 8px;
		padding-left: 18px;
	}

	p,
	.muted,
	.gap-list span {
		color: var(--sc-muted);
	}

	label {
		display: grid;
		gap: 5px;
		color: var(--sc-ink);
		font-size: 0.82rem;
		font-weight: 600;
	}

	input {
		width: 120px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 8px;
		padding: 9px 10px;
		font: inherit;
	}

	button {
		min-height: 44px;
		border: 0;
		border-radius: 8px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		padding: 0 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.secondary {
		border: 1px solid var(--sc-border-strong);
		background: var(--sc-surface);
		color: var(--sc-ink);
	}

	@media (max-width: 980px) {
		.overview-grid,
		.work-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.overview-grid,
		.work-grid,
		.setup-form {
			grid-template-columns: 1fr;
			display: grid;
		}
	}

	.plan-settings summary {
		display: flex;
		align-items: center;
		min-height: 44px;
		cursor: pointer;
		color: var(--sc-link);
		font-size: 13px;
	}
	.plan-settings[open] {
		flex-basis: 100%;
	}
	.plan-settings .setup-form {
		padding: 12px 0 0;
		flex-wrap: wrap;
	}
	.plan-settings input {
		color: var(--sc-ink);
		background: var(--sc-surface);
	}
	@media (max-width: 640px) {
		.summary-band {
			gap: 4px;
			padding-bottom: 8px;
		}
		.summary-band p {
			font-size: 12px;
			line-height: 1.5;
		}
		.overview-grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.overview-grid a {
			padding: 12px;
			min-width: 0;
		}
		.overview-grid a p {
			font-size: 12px;
		}
		.overview-grid span {
			font-size: 18px;
			color: var(--sc-ink);
			font-variant-numeric: tabular-nums;
		}
		.work-grid article {
			padding: 14px;
		}
	}

	input:not([type='hidden']):not([type='checkbox']):not([type='radio']) {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}
</style>
