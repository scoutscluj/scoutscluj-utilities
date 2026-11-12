<script lang="ts">
	import { type Snippet } from 'svelte';
	import TableToolbar from './TableToolbar.svelte';
	import TablePagination from './TablePagination.svelte';
	import { highlightSearch, matchesSearch } from './table-search';
	let {
		children,
		label = 'Caută în tabel',
		paginated = true,
		compact = false,
		controls
	}: {
		children: Snippet;
		label?: string;
		paginated?: boolean;
		compact?: boolean;
		controls?: Snippet;
	} = $props();
	let query = $state('');
	let page = $state(0);
	let pageSize = $state(25);
	let total = $state(0);
	let loadedTotal = $state(0);
	let container = $state<HTMLDivElement>();
	let revision = $state(0);
	$effect(() => {
		if (!container) return;
		const observer = new MutationObserver(() => revision++);
		observer.observe(container, { childList: true, subtree: true, characterData: true });
		return () => observer.disconnect();
	});
	$effect(() => {
		void revision;
		if (!container) return;
		const rows = [...container.querySelectorAll<HTMLTableRowElement>('tbody > tr')];
		const filtered = rows.filter((row) => matchesSearch(row.textContent ?? '', query));
		total = filtered.length;
		loadedTotal = rows.length;
		const size = paginated ? pageSize || Math.max(1, total) : Math.max(1, total);
		const active = Math.min(page, Math.max(0, Math.ceil(total / size) - 1));
		const visible = new Set(filtered.slice(active * size, (active + 1) * size));
		for (const row of rows) row.hidden = !visible.has(row);
	});
	$effect(() => {
		const root = container;
		return () => {
			root
				?.querySelectorAll<HTMLTableRowElement>('tbody > tr')
				.forEach((row) => (row.hidden = false));
		};
	});
</script>

<div class="sc-table-view" class:compact>
	<div class="sc-table-view-controls">
		<TableToolbar
			>{#snippet filters()}<label
					><span class:sc-sr-only={compact}>{label}</span><input
						type="search"
						bind:value={query}
						oninput={() => (page = 0)}
						placeholder="Caută…"
						aria-label={label}
					/></label
				>{@render controls?.()}{/snippet}</TableToolbar
		>
	</div>
	<div class="sc-table-view-content" bind:this={container} use:highlightSearch={query}>
		{@render children()}
	</div>
	{#if query && !total}<p class="sc-table-empty" role="status">
			Niciun rezultat pentru căutarea aleasă.
		</p>{/if}
	{#if paginated}<div class="sc-table-view-controls">
			<TablePagination bind:page bind:pageSize {total} {loadedTotal} />
		</div>{/if}
</div>

<style>
	.sc-table-view {
		min-width: 0;
	}
	.compact :global(.sc-table-toolbar) {
		margin-bottom: 8px;
	}
	.compact :global(.sc-table-filters) {
		flex-wrap: nowrap;
		gap: 8px;
		flex-basis: 100%;
	}
	.compact :global(.sc-table-filters > label) {
		min-width: 0;
		flex: 1 1 0;
	}
	.compact :global(.sc-table-filters > label:has(input[type='search'])) {
		flex: 1.35 1 0;
		min-width: 0;
	}
	.sc-table-view-content {
		overflow-x: auto;
	}
	.sc-table-empty {
		color: var(--sc-muted);
		text-align: center;
		padding: 20px;
		font-size: 14px;
	}
	@media print {
		.sc-table-view-controls,
		.sc-table-empty {
			display: none;
		}
		.sc-table-view-content :global(tr[hidden]) {
			display: table-row !important;
		}
	}
</style>
