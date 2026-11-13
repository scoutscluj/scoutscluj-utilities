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
			><table class="audit-table">
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
							<td class="audit-compact-cell" colspan={showActivity ? 5 : 4}>
								<button
									class="entry-button compact-entry-button"
									type="button"
									aria-label={`Vezi detalii pentru ${display.title}`}
									onclick={() => openDetails(entry)}><strong>{display.title}</strong></button
								>
								<div class="audit-meta">
									<time datetime={entry.createdAt}>{formatAuditDateTime(entry.createdAt)}</time
									><span>{entry.actorName ?? 'Sistem'}</span
									>{#if showActivity && entry.activityId}<span>Activitate #{entry.activityId}</span
										>{/if}
								</div>
								<p class="audit-summary">{display.summary}</p>
							</td>
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
		min-width: 0;
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

	.audit-table > tbody > tr > td.audit-compact-cell {
		display: none;
	}
	@container (max-width: 900px) {
		.audit-table,
		.audit-table > tbody {
			display: block;
			min-width: 0;
		}
		.audit-table > thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		.audit-table > tbody > tr {
			display: block;
			padding: 12px 0;
			border-bottom: 1px solid var(--sc-border);
		}
		.audit-table > tbody > tr:global([hidden]) {
			display: none;
		}
		.audit-table > tbody > tr > td {
			display: none;
			border: 0;
			padding: 0;
			min-width: 0;
		}
		.audit-table > tbody > tr > td.audit-compact-cell {
			display: block;
			width: auto;
			border: 0;
			padding: 0;
			overflow-wrap: anywhere;
		}
		.audit-compact-cell .compact-entry-button {
			min-height: 44px;
			padding: 0;
			background: transparent;
			border: 0;
		}
		.audit-meta {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 4px 10px;
			color: var(--sc-muted);
			font-size: 12px;
			line-height: 1.4;
		}
		.audit-meta time,
		.audit-meta span {
			color: inherit;
		}
		.audit-compact-cell .audit-summary {
			margin: 6px 0 0;
			padding: 0;
			color: var(--sc-ink);
			font-size: 13px;
			line-height: 1.45;
		}
	}
</style>
