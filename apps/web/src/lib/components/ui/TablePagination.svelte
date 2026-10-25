<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
	import ChevronsRight from '@lucide/svelte/icons/chevrons-right';
	import TablePageSize from './TablePageSize.svelte';
	let {
		page = $bindable(0),
		pageSize = $bindable(25),
		total,
		loadedTotal = total,
		label = 'Paginile tabelului',
		onchange,
		pageSizes = [10, 25, 50, 100, 250, 500],
		allowAll = true
	}: {
		page?: number;
		pageSize: number;
		total: number;
		loadedTotal?: number;
		label?: string;
		onchange?: (page: number, pageSize: number) => void;
		pageSizes?: number[];
		allowAll?: boolean;
	} = $props();
	const size = $derived(pageSize || Math.max(1, total));
	const pages = $derived(Math.max(1, Math.ceil(total / size)));
	const current = $derived(Math.max(0, Math.min(page, pages - 1)));
	function navigate(next: number) {
		page = next;
		onchange?.(next, pageSize);
	}
</script>

<nav class="sc-table-pagination" aria-label={label}>
	<span aria-live="polite"
		>{total ? current * size + 1 : 0}–{Math.min((current + 1) * size, total)} din {total}{#if loadedTotal !== total}
			· {loadedTotal} încărcate{/if}</span
	>
	<div>
		<TablePageSize
			inline
			bind:value={pageSize}
			{total}
			sizes={pageSizes}
			{allowAll}
			onchange={() => navigate(0)}
		/>
		<span class="sr-only">Pagina {current + 1} din {pages}</span>
		<div class="sc-page-actions">
			<button
				class="sc-page-button"
				type="button"
				aria-label="Prima pagină"
				title="Prima pagină"
				disabled={current === 0}
				onclick={() => navigate(0)}><ChevronsLeft size={18} aria-hidden="true" /></button
			>
			<button
				class="sc-page-button"
				type="button"
				aria-label="Pagina anterioară"
				title="Pagina anterioară"
				disabled={current === 0}
				onclick={() => navigate(current - 1)}><ChevronLeft size={18} aria-hidden="true" /></button
			>
			<button
				class="sc-page-button"
				type="button"
				aria-label="Pagina următoare"
				title="Pagina următoare"
				disabled={current >= pages - 1}
				onclick={() => navigate(current + 1)}><ChevronRight size={18} aria-hidden="true" /></button
			>
			<button
				class="sc-page-button"
				type="button"
				aria-label="Ultima pagină"
				title="Ultima pagină"
				disabled={current >= pages - 1}
				onclick={() => navigate(pages - 1)}><ChevronsRight size={18} aria-hidden="true" /></button
			>
		</div>
	</div>
</nav>

<style>
	.sc-table-pagination {
		gap: 16px;
		padding: 12px 0 4px;
		border-top: 1px solid var(--sc-border);
		margin-top: 12px;
	}
	.sc-table-pagination > div {
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.sc-page-actions {
		display: flex;
		gap: 4px;
	}
	.sc-table-pagination .sc-page-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		min-height: 36px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--sc-ink);
		box-shadow: none;
	}
	.sc-table-pagination .sc-page-button:not(:disabled):hover {
		background: var(--sc-inset);
	}
	.sc-table-pagination .sc-page-button:disabled {
		color: var(--sc-muted);
		opacity: 0.35;
		cursor: default;
	}
	.sc-page-button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (max-width: 540px) {
		.sc-table-pagination {
			justify-content: center;
		}
		.sc-table-pagination > div {
			flex-wrap: wrap;
			justify-content: center;
			gap: 12px;
		}
	}
</style>
