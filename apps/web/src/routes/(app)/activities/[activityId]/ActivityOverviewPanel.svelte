<script lang="ts">
	import type { Activity } from './+layout.server';
	import { activityStatusLabel, activityTypeLabel, formatDate } from './activity-meta';

	type Props = {
		activity: Activity;
	};

	let { activity }: Props = $props();

	const dateRange = $derived(`${formatDate(activity.startDate)} - ${formatDate(activity.endDate)}`);
</script>

<section class="overview-panel">
	<div>
		<p class="eyebrow">Prezentare</p>
		<p class="description">
			{activity.description ?? 'Activitatea nu are încă o descriere.'}
		</p>
	</div>

	<dl>
		<div>
			<dt>Tip</dt>
			<dd>{activityTypeLabel(activity.type)}</dd>
		</div>
		<div>
			<dt>Stare</dt>
			<dd>{activityStatusLabel(activity.status)}</dd>
		</div>
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
</section>

<style>
	.overview-panel {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
		gap: 16px;
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 16px;
		box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
	}

	.eyebrow,
	.description,
	dl,
	dd {
		margin: 0;
	}

	.eyebrow {
		color: #2563eb;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.description {
		margin-top: 6px;
		color: #334155;
		line-height: 1.5;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	dt {
		color: #64748b;
		font-size: 0.75rem;
		font-weight: 800;
	}

	dd {
		color: #0f172a;
		font-weight: 850;
	}

	@media (max-width: 860px) {
		.overview-panel,
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
