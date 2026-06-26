<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActivityStatus, ActivityType } from './+page.server';

	let { data, form } = $props();

	const activityTypeLabels: Record<ActivityType, string> = {
		camp: 'Camp',
		hike: 'Drumeție',
		festival: 'Festival',
		training: 'Formare',
		meeting: 'Întâlnire',
		other: 'Alt tip'
	};

	const activityStatusLabels: Record<ActivityStatus, string> = {
		planned: 'Planificată',
		active: 'În desfășurare',
		completed: 'Încheiată',
		cancelled: 'Anulată'
	};

	const formatDate = (value?: string) =>
		value
			? new Intl.DateTimeFormat('ro-RO', {
					dateStyle: 'medium'
				}).format(new Date(value))
			: 'Fără dată';
</script>

<svelte:head>
	<title>Activități | Scouts Cluj Utilities</title>
</svelte:head>

<section class="activities-page">
	<div class="page-heading">
		<p class="eyebrow">Activități</p>
		<h1>Activități locale</h1>
		<p>Campuri, drumeții, festivaluri și alte activități cu documente financiare urmărite local.</p>
	</div>

	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<div class="content-grid">
		<form class="panel activity-form" method="POST" action="?/create">
			<div>
				<p class="panel-title">Activitate nouă</p>
				<p class="panel-subtitle">Creatorul devine coordonator.</p>
			</div>

			<label>
				<span>Titlu</span>
				<input name="title" type="text" maxlength="255" required />
			</label>

			<label>
				<span>Tip</span>
				<select name="type" required>
					<option value="camp">Camp</option>
					<option value="hike">Drumeție</option>
					<option value="festival">Festival</option>
					<option value="training">Formare</option>
					<option value="meeting">Întâlnire</option>
					<option value="other" selected>Alt tip</option>
				</select>
			</label>

			<div class="date-grid">
				<label>
					<span>Început</span>
					<input name="startDate" type="date" />
				</label>
				<label>
					<span>Final</span>
					<input name="endDate" type="date" />
				</label>
			</div>

			<label>
				<span>Loc</span>
				<input name="location" type="text" maxlength="255" />
			</label>

			<label>
				<span>Notițe</span>
				<textarea name="description" rows="4"></textarea>
			</label>

			<button type="submit">Creează activitatea</button>
		</form>

		<section class="activity-list" aria-label="Lista activităților">
			{#if data.activities.length}
				{#each data.activities as activity (activity.id)}
					<article class="activity-card">
						<div class="card-main">
							<div>
								<p class="activity-type">{activityTypeLabels[activity.type]}</p>
								<h2>{activity.title}</h2>
							</div>
							<span class={`status ${activity.status}`}
								>{activityStatusLabels[activity.status]}</span
							>
						</div>

						<div class="meta-grid">
							<span>{formatDate(activity.startDate)}</span>
							<span>{activity.location ?? 'Fără loc'}</span>
							<span>{activity.coordinatorName}</span>
						</div>

						<div class="finance-strip">
							<span>{activity.financeSummary.totalDocuments} documente</span>
							<span>{activity.financeSummary.openDocuments} deschise</span>
							<span>{activity.financeSummary.sentDocuments} trimise</span>
						</div>

						<a href={resolve(`/activities/${activity.id}`)}>Deschide</a>
					</article>
				{/each}
			{:else}
				<div class="empty-state">
					<h2>Nu există activități încă.</h2>
					<p>Prima activitate creată va apărea aici.</p>
				</div>
			{/if}
		</section>
	</div>
</section>

<style>
	.activities-page {
		display: grid;
		gap: 22px;
	}

	.page-heading {
		display: grid;
		gap: 8px;
		max-width: 780px;
	}

	.eyebrow,
	.activity-type {
		margin: 0;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	h1,
	h2,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		color: #0f172a;
	}

	h2 {
		font-size: 1.1rem;
		color: #0f172a;
	}

	.page-heading p:last-child,
	.panel-subtitle,
	.meta-grid,
	.empty-state p {
		color: #64748b;
	}

	.content-grid {
		display: grid;
		grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
		gap: 18px;
		align-items: start;
	}

	.panel,
	.activity-card,
	.empty-state {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.activity-form,
	.activity-card,
	.empty-state {
		display: grid;
		gap: 16px;
		padding: 18px;
	}

	.panel-title {
		color: #0f172a;
		font-size: 1rem;
		font-weight: 800;
	}

	label {
		display: grid;
		gap: 7px;
		color: #334155;
		font-size: 0.88rem;
		font-weight: 700;
	}

	input,
	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 10px 11px;
		color: #0f172a;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	button,
	.activity-card a {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 800;
		text-decoration: none;
	}

	button {
		border: 0;
		background: #0f766e;
		color: #ffffff;
		cursor: pointer;
	}

	.activity-card a {
		justify-self: start;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 14px;
		color: #334155;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
		padding: 12px 14px;
		color: #1e3a8a;
	}

	.date-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.activity-list {
		display: grid;
		gap: 12px;
	}

	.card-main,
	.finance-strip,
	.meta-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.card-main {
		justify-content: space-between;
	}

	.status {
		border-radius: 999px;
		padding: 5px 9px;
		background: #eef2ff;
		color: #3730a3;
		font-size: 0.78rem;
		font-weight: 800;
	}

	.status.active {
		background: #dcfce7;
		color: #166534;
	}

	.status.completed {
		background: #e0f2fe;
		color: #075985;
	}

	.status.cancelled {
		background: #fee2e2;
		color: #991b1b;
	}

	.finance-strip span {
		border-radius: 8px;
		background: #f8fafc;
		padding: 8px 10px;
		color: #334155;
		font-size: 0.88rem;
		font-weight: 700;
	}

	.empty-state {
		min-height: 180px;
		align-content: center;
		text-align: center;
	}

	@media (max-width: 900px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.date-grid {
			grid-template-columns: 1fr;
		}

		button,
		.activity-card a {
			width: 100%;
		}
	}
</style>
