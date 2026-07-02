<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity } from './+layout.server';
	import type { AuditEntry } from './kitchen/kitchen-api';

	type Props = {
		activity: Activity;
		entries: AuditEntry[];
	};

	let { activity, entries }: Props = $props();

	const formatDateTime = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
</script>

{#if entries.length}
	<section class="audit-panel">
		<div class="heading">
			<p>Activitate recentă</p>
			<a href={resolve(`/activities/${activity.id}/audit`)}>Audit</a>
		</div>

		<div class="entry-list">
			{#each entries.slice(0, 5) as entry (entry.id)}
				<div>
					<strong>{entry.action}</strong>
					<span>{entry.actorName ?? 'Sistem'} · {formatDateTime(entry.createdAt)}</span>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.audit-panel,
	.entry-list {
		display: grid;
		gap: 10px;
	}

	.audit-panel {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 14px;
	}

	.heading {
		display: flex;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	p,
	strong,
	span {
		margin: 0;
	}

	p {
		color: #0f172a;
		font-weight: 900;
	}

	a {
		color: #64748b;
		font-size: 0.86rem;
		font-weight: 800;
		text-decoration: none;
	}

	a:hover {
		color: #991b1b;
	}

	.entry-list div {
		display: grid;
		gap: 2px;
		border-top: 1px solid #edf1f5;
		padding-top: 9px;
	}

	strong {
		color: #334155;
		font-size: 0.9rem;
	}

	span {
		color: #64748b;
		font-size: 0.82rem;
	}
</style>
