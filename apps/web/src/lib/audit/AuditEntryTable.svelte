<script lang="ts">
	import { formatAuditDateTime, type AuditEntry } from './audit-entry';
	import AuditEntryDetailsModal from './AuditEntryDetailsModal.svelte';
	import { formatAuditEntry } from './audit-labels';

	type Props = {
		entries: AuditEntry[];
		showActivity?: boolean;
		emptyMessage?: string;
	};

	let {
		entries,
		showActivity = false,
		emptyMessage = 'Nu există evenimente de audit.'
	}: Props = $props();
	let selectedEntry = $state<AuditEntry | undefined>();

	const openDetails = (entry: AuditEntry) => {
		selectedEntry = entry;
	};

	const closeDetails = () => {
		selectedEntry = undefined;
	};
</script>

{#if entries.length}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Când</th>
					<th>Cine</th>
					{#if showActivity}
						<th>Activitate</th>
					{/if}
					<th>Eveniment</th>
					<th>Rezumat</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.id)}
					{@const display = formatAuditEntry(entry)}
					<tr>
						<td class="date-cell">{formatAuditDateTime(entry.createdAt)}</td>
						<td>{entry.actorName ?? 'Sistem'}</td>
						{#if showActivity}
							<td>{entry.activityId ? `#${entry.activityId}` : '-'}</td>
						{/if}
						<td>
							<button
								class="entry-button"
								type="button"
								aria-label={`Vezi detalii pentru ${display.title}`}
								onclick={() => openDetails(entry)}
							>
								<strong>{display.title}</strong>
								<span>{display.entityLabel}</span>
							</button>
						</td>
						<td>{display.summary}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p class="muted">{emptyMessage}</p>
{/if}

<AuditEntryDetailsModal entry={selectedEntry} {showActivity} onClose={closeDetails} />

<style>
	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		border-bottom: 1px solid var(--sc-border);
		padding: 10px;
		text-align: left;
		vertical-align: top;
	}

	th {
		color: #475569;
		font-size: 0.78rem;
		text-transform: uppercase;
	}

	td {
		color: var(--sc-ink);
		line-height: 1.35;
	}

	.date-cell {
		min-width: 150px;
		color: var(--sc-muted);
		white-space: nowrap;
	}

	.entry-button {
		display: grid;
		gap: 3px;
		width: 100%;
		border: 0;
		background: transparent;
		color: inherit;
		padding: 0;
		text-align: left;
		cursor: pointer;
	}

	.entry-button:hover strong,
	.entry-button:focus-visible strong {
		color: #0f766e;
	}

	.entry-button:focus-visible {
		outline: 2px solid #14b8a6;
		outline-offset: 4px;
	}

	strong {
		color: var(--sc-ink);
		font-size: 0.94rem;
	}

	span,
	.muted {
		color: var(--sc-muted);
	}

	.muted {
		margin: 0;
	}
</style>
