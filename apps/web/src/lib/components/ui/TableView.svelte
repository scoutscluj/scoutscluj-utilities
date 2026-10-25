<script lang="ts">
	import { type Snippet } from 'svelte';
	import TableToolbar from './TableToolbar.svelte';
	import TablePagination from './TablePagination.svelte';
	import { highlightSearch, matchesSearch } from './table-search';
	let {
		children,
		label = 'Caută în tabel',
		paginated = true
	}: { children: Snippet; label?: string; paginated?: boolean } = $props();
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

<div class="sc-table-view">
	<div class="sc-table-view-controls">
		<TableToolbar
			>{#snippet filters()}<label
					>{label}<input
						type="search"
						bind:value={query}
						oninput={() => (page = 0)}
						placeholder="Caută…"
					/></label
				>{/snippet}</TableToolbar
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
