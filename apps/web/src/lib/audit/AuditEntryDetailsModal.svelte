<script lang="ts">
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
	<div class="modal-backdrop" role="presentation">
		<button class="backdrop-button" type="button" aria-label="Închide" onclick={onClose}></button>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="audit-entry-title">
			<div class="modal-heading">
				<div>
					<p class="eyebrow">Detalii audit</p>
					<h2 id="audit-entry-title">{display.title}</h2>
				</div>
				<button class="ghost" type="button" aria-label="Închide" onclick={onClose}>×</button>
			</div>

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
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		background: rgba(15, 23, 42, 0.3);
		padding: 16px;
	}

	.backdrop-button {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
	}

	.modal {
		position: relative;
		z-index: 1;
		display: grid;
		width: min(760px, 100%);
		max-height: min(86vh, 760px);
		overflow: auto;
		gap: 16px;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
	}

	.modal-heading {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		justify-content: space-between;
	}

	.ghost {
		min-width: 34px;
		min-height: 34px;
		border: 0;
		border-radius: 8px;
		background: #f8fafc;
		color: #334155;
		font-size: 1.1rem;
		font-weight: 900;
		cursor: pointer;
	}

	.summary {
		color: #334155;
		font-weight: 700;
	}

	.meta-list,
	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 10px;
	}

	.meta-list {
		margin: 0;
	}

	.meta-list div,
	.detail-grid div {
		display: grid;
		gap: 4px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px;
	}

	dt,
	.detail-grid span,
	.eyebrow {
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	dd,
	h2,
	h3,
	p {
		margin: 0;
	}

	dd,
	strong {
		color: #0f172a;
		word-break: break-word;
	}

	.details {
		display: grid;
		gap: 8px;
	}

	h2,
	h3 {
		color: #0f172a;
	}

	pre {
		max-height: 220px;
		overflow: auto;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #f8fafc;
		color: #0f172a;
		padding: 12px;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.muted {
		color: #64748b;
	}
</style>
