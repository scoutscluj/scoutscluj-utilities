<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value));

	const totalEstimatedCost = $derived(
		data.overview.ingredientNeeds.reduce((sum, item) => sum + item.estimatedCost, 0)
	);
</script>

<section class="kitchen-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	{#if !data.overview.plan.hasCompleteActivityDates}
		<section class="panel warning">
			<h2>Date necesare</h2>
			<p>Planificarea meselor are nevoie de data de început și data de final a activității.</p>
		</section>
	{/if}

	<form class="panel setup-form" method="POST" action="?/setup">
		<div>
			<p class="panel-title">Setări plan bucătărie</p>
			<p class="muted">Numărul implicit este folosit pentru mesele fără prezență personalizată.</p>
		</div>
		<label>
			<span>Participanți impliciți</span>
			<input
				name="defaultParticipantCount"
				type="number"
				min="0"
				value={data.overview.plan.defaultParticipantCount}
			/>
		</label>
		<button type="submit">Salvează</button>
	</form>

	<form method="POST" action="?/syncDays">
		<button class="secondary" type="submit">Sincronizează zilele</button>
	</form>

	<div class="metric-grid">
		<div class="metric">
			<span>{data.overview.days.length}</span>
			<p>Zile</p>
		</div>
		<div class="metric">
			<span>{data.overview.meals.length}</span>
			<p>Mese</p>
		</div>
		<div class="metric">
			<span>{data.overview.ingredientNeeds.length}</span>
			<p>Ingrediente necesare</p>
		</div>
		<div class="metric">
			<span>{totalEstimatedCost.toFixed(0)} lei</span>
			<p>Cost estimat</p>
		</div>
	</div>

	<section class="panel">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Calendar</p>
				<h2>Zile de bucătărie</h2>
			</div>
			<a href={resolve(`/activities/${data.activity.id}/kitchen/meals`)}>Deschide mesele</a>
		</div>
		{#if data.overview.days.length}
			<div class="day-list">
				{#each data.overview.days as day (day.id)}
					<span class:outside={day.dateStatus === 'outside_activity_dates'}>{formatDate(day.date)}</span>
				{/each}
			</div>
		{:else}
			<p class="muted">Nu există zile generate încă.</p>
		{/if}
	</section>
</section>

<style>
	.kitchen-page,
	.setup-form,
	.panel {
		display: grid;
		gap: 16px;
	}

	.section-heading a,
	button {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 800;
		text-decoration: none;
	}

	.section-heading a,
	.secondary {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
	}

	button {
		border: 0;
		background: #0f766e;
		color: #ffffff;
		padding: 0 14px;
		cursor: pointer;
	}

	.panel,
	.metric {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.warning {
		border-color: #fbbf24;
		background: #fffbeb;
	}

	.metric-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}

	.metric span {
		color: #0f766e;
		font-size: 1.6rem;
		font-weight: 900;
	}

	h2,
	p {
		margin: 0;
	}

	.panel-title,
	h2 {
		color: #0f172a;
		font-weight: 900;
	}

	.muted,
	.metric p {
		color: #64748b;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	label {
		display: grid;
		gap: 7px;
		color: #334155;
		font-size: 0.88rem;
		font-weight: 700;
	}

	input {
		width: 100%;
		max-width: 220px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 10px 11px;
		font: inherit;
	}

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.day-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.day-list span {
		border-radius: 8px;
		background: #f8fafc;
		padding: 8px 10px;
		font-weight: 800;
	}

	.day-list span.outside {
		background: #fef3c7;
		color: #92400e;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
		padding: 12px 14px;
		color: #1e3a8a;
	}

	@media (max-width: 900px) {
		.metric-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.metric-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
