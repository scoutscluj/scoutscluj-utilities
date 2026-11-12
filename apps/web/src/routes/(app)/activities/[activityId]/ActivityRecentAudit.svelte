<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatAuditDateTime, type AuditEntry } from '$lib/audit/audit-entry';
	import { formatAuditEntry } from '$lib/audit/audit-labels';
	import type { Activity } from './+layout.server';

	type Props = {
		activity: Activity;
		entries: AuditEntry[];
	};

	let { activity, entries }: Props = $props();
</script>

{#if entries.length}
	<details class="audit-panel">
		<summary>Activitate recentă <span>{entries.length}</span></summary>
		<div class="heading">
			<p>Activitate recentă</p>
			<a href={resolve(`/activities/${activity.id}/audit`)}>Audit</a>
		</div>

		<div class="entry-list">
			{#each entries.slice(0, 5) as entry (entry.id)}
				{@const display = formatAuditEntry(entry)}
				<div>
					<strong>{display.title}</strong>
					<span>{display.summary}</span>
					<small>{entry.actorName ?? 'Sistem'} · {formatAuditDateTime(entry.createdAt)}</small>
				</div>
			{/each}
		</div>
	</details>
{/if}

<style>
	summary {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		min-height: 44px;
		color: var(--sc-muted);
		font-size: 14px;
	}
	summary::before {
		content: '›';
	}
	details[open] summary::before {
		transform: rotate(90deg);
	}
	summary span {
		font-size: 12px;
	}

	.audit-panel,
	.entry-list {
		display: grid;
		gap: 10px;
	}

	.audit-panel {
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
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
		color: var(--sc-ink);
		font-weight: 600;
	}

	a {
		color: var(--sc-muted);
		font-size: 0.86rem;
		font-weight: 600;
		text-decoration: none;
	}

	a:hover {
		color: var(--sc-link);
	}

	.entry-list div {
		display: grid;
		gap: 2px;
		border-top: 1px solid var(--sc-border);
		padding-top: 9px;
	}

	strong {
		color: var(--sc-ink);
		font-size: 0.9rem;
	}

	span {
		color: var(--sc-muted);
		font-size: 0.82rem;
	}

	small {
		color: var(--sc-muted);
		font-size: 0.78rem;
	}
</style>
