<script lang="ts">
	let {
		value = $bindable(25),
		total,
		onchange,
		inline = false,
		sizes = [10, 25, 50, 100, 250, 500],
		allowAll = true
	}: {
		value?: number;
		total: number;
		onchange?: () => void;
		inline?: boolean;
		sizes?: number[];
		allowAll?: boolean;
	} = $props();
</script>

<label class="sc-table-page-size" class:inline>
	<span>Rânduri / pagină</span>
	<select aria-label="Rânduri pe pagină" bind:value onchange={() => onchange?.()}>
		{#each sizes as size (size)}<option value={size}>{size}</option>{/each}
		{#if allowAll}<option value={0}>Toate ({total})</option>{/if}
	</select>
</label>

<style>
	.sc-table-page-size.inline {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		white-space: nowrap;
		font-size: 12px;
	}
	.sc-table-page-size.inline select {
		width: auto;
		min-width: 72px;
		height: 36px;
		min-height: 36px;
		box-sizing: border-box;
		padding: 6px 28px 6px 10px;
		border: 1px solid var(--sc-border);
		border-radius: 6px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		line-height: 22px;
	}
</style>
