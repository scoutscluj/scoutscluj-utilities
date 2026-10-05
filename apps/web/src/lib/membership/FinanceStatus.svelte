<script lang="ts">
	let { state, label }: { state: string; label: string } = $props();
	const tone = $derived(
		['paid', 'succeeded', 'synced', 'manually_confirmed', 'allocated', 'active'].includes(state)
			? 'green'
			: ['review', 'unknown', 'failed', 'correction_required'].includes(state)
				? 'red'
				: [
							'partial',
							'pending',
							'queued',
							'starting',
							'syncing',
							'pending_approval',
							'unallocated'
					  ].includes(state)
					? 'amber'
					: 'slate'
	);
</script>

<span class="finance-status {tone}"><span class="dot" aria-hidden="true"></span>{label}</span>

<style>
	.finance-status {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 0.76rem;
		line-height: 1.4;
		font-weight: 650;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		flex-shrink: 0;
	}
	.green {
		color: #166534;
		background: #ecfdf3;
		border-color: #bbf7d0;
	}
	.amber {
		color: #92400e;
		background: #fffbeb;
		border-color: #fde68a;
	}
	.red {
		color: #b42318;
		background: #fff1f2;
		border-color: #fecdd3;
	}
	.slate {
		color: #475569;
		background: #f1f5f9;
		border-color: #e2e8f0;
	}
</style>
