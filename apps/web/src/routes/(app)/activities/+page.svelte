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
		<div>
			<h1>Activități locale</h1>
			<p>Campuri, drumeții, festivaluri și alte activități ale centrului local.</p>
		</div>
		<a class="new-activity" href={resolve('/activities/new')}>＋ Activitate nouă</a>
	</div>

	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<div class="content-grid">
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
		display: flex;
		gap: 16px;
		justify-content: space-between;
		align-items: start;
		flex-wrap: wrap;
	}
	.page-heading > div {
		display: grid;
		gap: 8px;
	}
	.new-activity {
		display: inline-flex;
		align-items: center;
		min-height: 38px;
		padding: 8px 16px;
		background: var(--sc-accent);
		color: var(--sc-surface);
		border-radius: 7px;
		text-decoration: none;
		white-space: nowrap;
	}
	.new-activity:hover {
		background: var(--sc-accent-hover);
	}

	.activity-type {
		margin: 0;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 600;
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
		color: var(--sc-ink);
	}

	h2 {
		font-size: 1.1rem;
		color: var(--sc-ink);
	}

	.page-heading p:last-child,
	.meta-grid,
	.empty-state p {
		color: var(--sc-muted);
	}

	.content-grid {
		display: grid;
		gap: 18px;
		align-items: start;
	}

	.activity-card,
	.empty-state {
		border: 1px solid #dbe3ef;
		background: var(--sc-surface);
		border-radius: 8px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.activity-card,
	.empty-state {
		display: grid;
		gap: 16px;
		padding: 18px;
	}

	.activity-card a {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
	}

	.activity-card a {
		justify-self: start;
		border: 1px solid var(--sc-border-strong);
		background: var(--sc-surface);
		padding: 0 14px;
		color: var(--sc-ink);
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
		padding: 12px 14px;
		color: #1e3a8a;
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
		font-weight: 600;
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
		color: var(--sc-accent-hover);
	}

	.finance-strip span {
		border-radius: 8px;
		background: var(--sc-canvas);
		padding: 8px 10px;
		color: var(--sc-ink);
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
		.activity-card a {
			width: 100%;
		}
	}
</style>
