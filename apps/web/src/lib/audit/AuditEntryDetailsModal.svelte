<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import { formatAuditDateTime, type AuditEntry } from './audit-entry';
	import { formatAuditEntry } from './audit-labels';

	type Props = {
		entry?: AuditEntry;
		showActivity?: boolean;
		onClose: () => void;
	};

	let { entry, showActivity = false, onClose }: Props = $props();
</script>

{#if entry}
	{@const display = formatAuditEntry(entry)}
	<Modal
		bind:open={
			() => !!entry,
			(open) => {
				if (!open) onClose();
			}
		}
		title={display.title}
		description="Detalii audit"
	>
		<div class="audit-details">
			<p class="summary">{display.summary}</p>

			<dl class="meta-list">
				<div>
					<dt>Când</dt>
					<dd>{formatAuditDateTime(entry.createdAt)}</dd>
				</div>
				<div>
					<dt>Cine</dt>
					<dd>{entry.actorName ?? 'Sistem'}</dd>
				</div>
				{#if showActivity || entry.activityId}
					<div>
						<dt>Activitate</dt>
						<dd>{entry.activityId ? `#${entry.activityId}` : '-'}</dd>
					</div>
				{/if}
				<div>
					<dt>Entitate</dt>
					<dd>{display.entityLabel}</dd>
				</div>
				<div>
					<dt>Acțiune tehnică</dt>
					<dd>{entry.action}</dd>
				</div>
			</dl>

			<section class="details">
				<h3>Detalii</h3>
				{#if display.metadataRows.length}
					<div class="detail-grid">
						{#each display.metadataRows as row (row.label)}
							<div>
								<span>{row.label}</span>
								<strong>{row.value}</strong>
							</div>
						{/each}
					</div>
				{:else}
					<p class="muted">Nu există detalii structurate.</p>
				{/if}
			</section>

			<section class="details">
				<h3>JSON brut</h3>
				<pre>{display.rawDetails}</pre>
			</section>
		</div>
	</Modal>
{/if}

<style>
	.audit-details {
		display: grid;
		gap: 16px;
		min-width: 0;
	}

	.summary {
		color: var(--sc-ink);
		font-weight: 700;
	}

	.meta-list,
	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
		gap: 10px;
	}

	.meta-list {
		margin: 0;
	}

	.meta-list div,
	.detail-grid div {
		display: grid;
		gap: 4px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		padding: 10px;
	}

	dt,
	.detail-grid span {
		color: var(--sc-muted);
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	dd,
	h3,
	p {
		margin: 0;
	}

	dd,
	strong {
		color: var(--sc-ink);
		word-break: break-word;
	}

	.details {
		display: grid;
		gap: 8px;
	}

	h3 {
		color: var(--sc-ink);
	}

	pre {
		max-height: 220px;
		overflow: auto;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-canvas);
		color: var(--sc-ink);
		padding: 12px;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.muted {
		color: var(--sc-muted);
	}
</style>
