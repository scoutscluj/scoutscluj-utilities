<script lang="ts">
	import TableView from '$lib/components/ui/TableView.svelte';
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
		<TableView compact label="Caută în jurnal"
			><table>
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
							<td class="date-cell" data-label="Când">{formatAuditDateTime(entry.createdAt)}</td>
							<td class="actor-cell" data-label="Cine">{entry.actorName ?? 'Sistem'}</td>
							{#if showActivity}
								<td data-label="Activitate">{entry.activityId ? `#${entry.activityId}` : '-'}</td>
							{/if}
							<td class="event-cell">
								<button
									class="entry-button"
									type="button"
									aria-label={`Vezi detalii pentru ${display.title}`}
									onclick={() => openDetails(entry)}
								>
									<strong>{display.title}</strong>
									<span>{display.entityLabel.split(' #')[0]}</span>
								</button>
							</td>
							<td class="summary-cell">{display.summary}</td>
						</tr>
					{/each}
				</tbody>
			</table></TableView
		>
	</div>
{:else}
	<p class="muted">{emptyMessage}</p>
{/if}

<AuditEntryDetailsModal entry={selectedEntry} {showActivity} onClose={closeDetails} />

<style>
	.table-wrap {
		container-type: inline-size;
		overflow-x: visible;
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
		color: var(--sc-muted);
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
		min-height: 44px;
		text-align: left;
		cursor: pointer;
	}

	.entry-button:hover strong,
	.entry-button:focus-visible strong {
		color: var(--sc-link);
	}

	.entry-button:focus-visible {
		outline: 2px solid var(--sc-focus);
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

	@container (max-width: 900px) {
		table,
		tbody {
			display: block;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		tr {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 6px;
			padding: 14px 0;
			border-bottom: 1px solid var(--sc-border);
		}
		td {
			border: 0;
			padding: 0;
			min-width: 0;
			overflow-wrap: anywhere;
		}
		.date-cell {
			min-width: 0;
			font-size: 12px;
		}
		.actor-cell {
			color: var(--sc-muted);
			font-size: 13px;
		}
		.entry-button {
			padding: 4px 0;
		}
		.summary-cell {
			font-size: 13px;
		}
	}
</style>
