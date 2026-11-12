<script lang="ts">
	import type { Activity } from './+layout.server';
	import { activityStatusLabel, activityTypeLabel, formatDate } from './activity-meta';

	type Props = {
		activity: Activity;
	};

	let { activity }: Props = $props();

	const dateRange = $derived(`${formatDate(activity.startDate)} - ${formatDate(activity.endDate)}`);
</script>

<section class="overview-panel" aria-label="Detaliile activității">
	<dl>
		<div>
			<dt>Perioadă</dt>
			<dd>{dateRange}</dd>
		</div>
		<div>
			<dt>Loc</dt>
			<dd>{activity.location ?? 'Fără loc'}</dd>
		</div>
		<div>
			<dt>Coordonator</dt>
			<dd>{activity.coordinatorName}</dd>
		</div>
	</dl>
	<div class="activity-tags">
		<span>{activityTypeLabel(activity.type)}</span><span
			>{activityStatusLabel(activity.status)}</span
		>
	</div>
	{#if activity.description}<details>
			<summary>Despre activitate</summary>
			<p>{activity.description}</p>
		</details>{/if}
</section>

<style>
	.overview-panel {
		display: grid;
		gap: 14px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		padding: 16px;
		background: var(--sc-surface);
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	dl > div {
		display: grid;
		align-content: start;
		gap: 4px;
		min-width: 0;
	}
	dt {
		color: var(--sc-muted);
		font-size: 12px;
	}
	dd {
		margin: 0;
		color: var(--sc-ink);
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.activity-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.activity-tags span {
		border-radius: 5px;
		background: var(--sc-inset);
		color: var(--sc-muted);
		padding: 3px 7px;
		font-size: 12px;
	}
	summary {
		display: flex;
		align-items: center;
		min-height: 44px;
		cursor: pointer;
		font-size: 13px;
		color: var(--sc-link);
	}
	summary::before {
		content: '›';
		margin-right: 8px;
	}
	details[open] summary::before {
		transform: rotate(90deg);
	}
	p {
		margin: 8px 0 0;
		line-height: 1.6;
		color: var(--sc-ink);
		font-size: 14px;
	}
	@media (max-width: 600px) {
		dl {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}
		dl > div:first-child {
			grid-column: 1/-1;
		}
	}
</style>
