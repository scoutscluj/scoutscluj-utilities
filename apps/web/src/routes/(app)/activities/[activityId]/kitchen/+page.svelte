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
			<p class="eyebrow">Plan bucătărie</p>
			<h1>{data.activity.title}</h1>
			<p>
				{formatDate(data.activity.startDate)} - {formatDate(data.activity.endDate)} ·
				{data.overview.plan.defaultParticipantCount} participanți impliciți
			</p>
		</div>
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
			<p>mese planificate</p>
		</a>
		<a href={resolve(`/activities/${data.activity.id}/kitchen/procurement`)}>
			<span>{coverageGaps.length}</span>
			<p>poziții neacoperite</p>
		</a>
		<a href={resolve(`/activities/${data.activity.id}/kitchen/reports`)}>
			<span>{formatMoney(totalEstimatedCost)}</span>
			<p>estimare plan</p>
		</a>
	</section>

	<section class="work-grid">
		<article>
			<h2>Atenție</h2>
			<ul>
				<li class:ok={emptyDays === 0}>{emptyDays} zile fără mese planificate</li>
				<li class:ok={staleRecipes === 0}>{staleRecipes} rețete atribuite diferă de catalog</li>
				<li class:ok={coverageGaps.length === 0}>
					{coverageGaps.length} nevoi neacoperite complet
				</li>
			</ul>
		</article>

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
	}

	.summary-band {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: end;
		justify-content: space-between;
		border-bottom: 1px solid #dbe3ef;
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
		grid-template-columns: 0.9fr 1.4fr 1fr;
	}

	.overview-grid a,
	.work-grid article,
	.notice,
	.form-message {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 14px;
		text-decoration: none;
	}

	.overview-grid span {
		color: #0f766e;
		font-size: 1.25rem;
		font-weight: 900;
	}

	.notice {
		display: flex;
		gap: 10px;
		background: #fffbeb;
		border-color: #fbbf24;
	}

	.gap-list div,
	li {
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 8px;
	}

	li.ok {
		color: #047857;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chips span {
		border: 1px solid #dbe3ef;
		border-radius: 999px;
		padding: 5px 9px;
		background: #f8fafc;
		font-weight: 800;
	}

	h1,
	h2,
	p,
	ul {
		margin: 0;
	}

	h1 {
		color: #0f172a;
		font-size: 1.5rem;
	}

	h2 {
		color: #0f172a;
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
		color: #64748b;
	}

	.eyebrow {
		color: #2563eb;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	label {
		display: grid;
		gap: 5px;
		color: #334155;
		font-size: 0.82rem;
		font-weight: 800;
	}

	input {
		width: 120px;
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

	.secondary {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
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
</style>
