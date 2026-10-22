<script lang="ts">
	let {
		value = $bindable(25),
		total,
		onchange
	}: {
		value?: number;
		total: number;
		onchange?: () => void;
	} = $props();
</script>

<label class="sc-table-page-size">
	<span>Rânduri / pagină</span>
	<select aria-label="Rânduri pe pagină" bind:value onchange={() => onchange?.()}>
		{#each [10, 25, 50, 100, 250, 500] as size (size)}<option value={size}>{size}</option>{/each}
		<option value={0}>Toate ({total})</option>
	</select>
</label>
