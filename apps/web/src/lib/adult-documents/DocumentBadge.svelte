<script lang="ts">
	import { statusLabels, type DocumentStatus } from './types';
	let { status }: { status: DocumentStatus } = $props();
</script>

<span class="document-status" data-status={status}>{statusLabels[status]}</span>

<style>
	.document-status {
		display: inline-flex;
		align-items: center;
		border-radius: 5px;
		padding: 4px 8px;
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		background: var(--sc-inset);
		color: var(--sc-muted);
	}
	.document-status[data-status='validated'] {
		background: var(--sc-success-soft, #edf7ef);
		color: var(--sc-success, #27633b);
	}
	.document-status[data-status='pending'] {
		background: var(--sc-warning-soft, #fff5df);
		color: var(--sc-warning, #795919);
	}
	.document-status[data-status='rejected'] {
		background: var(--sc-accent-soft);
		color: var(--sc-accent);
	}
</style>
