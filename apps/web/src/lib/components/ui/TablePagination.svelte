<script lang="ts">
	let {
		page = $bindable(0),
		pageSize,
		total,
		loadedTotal = total,
		label = 'Paginile tabelului'
	}: {
		page?: number;
		pageSize: number;
		total: number;
		loadedTotal?: number;
		label?: string;
	} = $props();
	const size = $derived(pageSize || Math.max(1, total));
	const pages = $derived(Math.max(1, Math.ceil(total / size)));
	const current = $derived(Math.min(page, pages - 1));
</script>

<nav class="sc-table-pagination" aria-label={label}>
	<span aria-live="polite"
		>{total ? current * size + 1 : 0}–{Math.min((current + 1) * size, total)} din {total}{#if loadedTotal !== total}
			· {loadedTotal} încărcate{/if}</span
	>
	<div>
		<span>Pagina {current + 1} din {pages}</span>
		<button type="button" disabled={current === 0} onclick={() => (page = current - 1)}
			>Anterior</button
		>
		<button type="button" disabled={current >= pages - 1} onclick={() => (page = current + 1)}
			>Următor</button
		>
	</div>
</nav>
