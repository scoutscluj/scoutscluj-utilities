<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarDays, MapPin, ArrowUpRight, Plus } from '@lucide/svelte';
	import { matchesSearch } from '$lib/components/ui/table-search';
	import type { ActivityStatus, ActivityType } from './+page.server';
	let { data, form } = $props();
	let query = $state(''),
		status = $state('current');
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
			? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value))
			: 'Fără dată';
	const activities = $derived(
		data.activities.filter(
			(activity) =>
				(status === 'all' ||
					(status === 'current'
						? ['active', 'planned'].includes(activity.status)
						: activity.status === status)) &&
				matchesSearch(
					[
						activity.title,
						activity.location,
						activity.coordinatorName,
						activityTypeLabels[activity.type]
					]
						.filter(Boolean)
						.join(' '),
					query
				)
		)
	);
</script>

<svelte:head><title>Activități | Scouts Cluj Utilities</title></svelte:head>
<section class="activities-page">
	<header class="page-heading">
		<div>
			<h1>Activități</h1>
			<span class="result-count">{data.activities.length} în centrul local</span>
		</div>
		<a class="new-activity" href={resolve('/activities/new')}
			><Plus size={18} aria-hidden="true" /><span>Activitate nouă</span></a
		>
	</header>
	{#if form?.message}<p class="form-message" role="status">{form.message}</p>{/if}
	<div class="activity-filters">
		<label class="search"
			><span class="sr-only">Caută o activitate</span><input
				type="search"
				bind:value={query}
				placeholder="Caută o activitate…"
			/></label
		><label
			><span class="sr-only">Starea activităților</span><select
				aria-label="Starea activităților"
				bind:value={status}
				><option value="current">Activități curente</option><option value="all"
					>Toate activitățile</option
				><option value="planned">Planificate</option><option value="active">În desfășurare</option
				><option value="completed">Încheiate</option><option value="cancelled">Anulate</option
				></select
			></label
		>
	</div>
	<div class="activity-list" aria-label="Lista activităților">
		{#each activities as activity (activity.id)}
			<a
				class="activity-row"
				href={resolve(`/activities/${activity.id}`)}
				aria-label={`Deschide activitatea ${activity.title}`}
			>
				<div class="activity-identity">
					<span class="activity-type">{activityTypeLabels[activity.type]}</span>
					<h2>{activity.title}</h2>
					<div class="activity-meta">
						<span
							><CalendarDays size={14} aria-hidden="true" />{formatDate(activity.startDate)}</span
						>{#if activity.location}<span
								><MapPin size={14} aria-hidden="true" />{activity.location}</span
							>{/if}
					</div>
					<span class="coordinator">{activity.coordinatorName}</span>
				</div>
				<div class="activity-trailing">
					<span class="status" data-status={activity.status}
						>{activityStatusLabels[activity.status]}</span
					>{#if activity.financeSummary.needsClarification > 0}<small class="needs-attention"
							>{activity.financeSummary.needsClarification}
							{activity.financeSummary.needsClarification === 1
								? 'clarificare'
								: 'clarificări'}</small
						>{:else if activity.financeSummary.totalDocuments > 0}<small
							>{activity.financeSummary.totalDocuments}
							{activity.financeSummary.totalDocuments === 1 ? 'document' : 'documente'}</small
						>{/if}<ArrowUpRight size={18} aria-hidden="true" />
				</div>
			</a>
		{:else}<div class="empty-state">
				<h2>
					{data.activities.length
						? 'Nicio activitate în această selecție'
						: 'Nu există activități încă'}
				</h2>
				<p>
					{data.activities.length
						? 'Încearcă alt nume sau alege toate activitățile.'
						: 'Creează prima activitate pentru a organiza echipa și participanții.'}
				</p>
			</div>{/each}
	</div>
</section>

<style>
	.activities-page {
		display: grid;
		gap: 20px;
		max-width: 1120px;
	}
	.page-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.page-heading > div {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px 12px;
		min-width: 0;
	}
	h1,
	h2,
	p {
		margin: 0;
	}
	h1 {
		font-size: clamp(26px, 3vw, 32px);
		letter-spacing: -0.025em;
	}
	.result-count {
		font-size: 13px;
		color: var(--sc-muted);
	}
	.new-activity {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		min-height: 44px;
		flex-shrink: 0;
		padding: 8px 14px;
		border-radius: 7px;
		color: var(--sc-on-accent);
		background: var(--sc-accent);
		font-size: 14px;
		text-decoration: none;
		font-weight: 600;
	}
	.new-activity:hover {
		background: var(--sc-accent-hover);
	}
	.activity-filters {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.activity-filters label {
		min-width: 0;
	}
	.search {
		flex: 1;
	}
	.activity-filters input,
	.activity-filters select {
		width: 100%;
		min-height: 44px;
		border: 1px solid var(--sc-control-border);
		border-radius: 7px;
		padding: 10px 12px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-size: 14px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.activity-list {
		display: grid;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
		overflow: hidden;
	}
	.activity-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 18px 20px;
		color: var(--sc-ink);
		text-decoration: none;
		border-bottom: 1px solid var(--sc-border);
	}
	.activity-row:last-child {
		border-bottom: 0;
	}
	.activity-row:hover {
		background: var(--sc-inset);
	}
	.activity-row:focus-visible,
	.new-activity:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: -3px;
	}
	.activity-identity {
		display: grid;
		gap: 5px;
		min-width: 0;
	}
	.activity-type {
		color: var(--sc-muted);
		font-size: 12px;
	}
	h2 {
		font-size: 17px;
		line-height: 1.4;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.activity-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 5px 16px;
		color: var(--sc-muted);
		font-size: 13px;
	}
	.activity-meta span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.coordinator {
		font-size: 12px;
		color: var(--sc-muted);
	}
	.activity-trailing {
		display: grid;
		justify-items: end;
		gap: 10px;
		flex-shrink: 0;
	}
	.activity-trailing > :global(svg) {
		color: var(--sc-muted);
	}
	.activity-trailing small {
		color: var(--sc-muted);
		font-size: 12px;
	}
	.activity-trailing small.needs-attention {
		color: var(--sc-danger);
	}
	.status {
		padding: 4px 8px;
		border-radius: 6px;
		background: var(--sc-inset);
		color: var(--sc-muted);
		font-size: 12px;
		white-space: nowrap;
	}
	.status[data-status='active'] {
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}
	.status[data-status='cancelled'] {
		background: var(--sc-accent-soft);
		color: var(--sc-danger);
	}
	.empty-state {
		padding: 32px 20px;
		display: grid;
		gap: 8px;
	}
	.empty-state p {
		color: var(--sc-muted);
		line-height: 1.5;
	}
	.form-message {
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--sc-info-soft);
		color: var(--sc-info);
	}
	@media (max-width: 600px) {
		.activities-page {
			gap: 16px;
		}
		.page-heading {
			align-items: start;
		}
		.page-heading > div {
			display: grid;
			gap: 3px;
		}
		.new-activity {
			padding: 8px 10px;
			font-size: 13px;
		}
		.activity-row {
			align-items: start;
			gap: 10px;
			padding: 14px 12px;
		}
		.activity-trailing {
			max-width: 108px;
		}
		.status {
			white-space: normal;
			text-align: right;
		}
		.activity-meta {
			font-size: 12px;
		}
		h2 {
			font-size: 15px;
		}
		.coordinator {
			display: none;
		}
		.activity-filters select {
			max-width: 152px;
			font-size: 13px;
		}
	}

	input:not([type='hidden']):not([type='checkbox']):not([type='radio']),
	select {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}
</style>
