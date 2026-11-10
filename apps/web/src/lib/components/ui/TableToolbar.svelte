<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		filters,
		children,
		primary,
		footer
	}: { filters?: Snippet; children?: Snippet; primary?: Snippet; footer?: Snippet } = $props();
</script>

<div class={['sc-table-toolbar', { stacked: primary }]}>
	{#if primary}<div class="primary-row">
			<div class="primary-content">{@render primary()}</div>
			{#if children}<div class="sc-table-options">{@render children()}</div>{/if}
		</div>{/if}
	{#if filters}<div class="sc-table-filters">{@render filters()}</div>{/if}
	{#if children && !primary}<div class="sc-table-options">{@render children()}</div>{/if}
	{#if footer}<div class="toolbar-footer">{@render footer()}</div>{/if}
</div>

<style>
	.stacked {
		display: grid;
		gap: 16px;
		margin-bottom: 16px;
	}
	.primary-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		min-width: 0;
	}
	.primary-content {
		flex: 1;
		min-width: 0;
	}
	.stacked > :global(.sc-table-filters) {
		display: block;
	}
	.primary-row > :global(.sc-table-options) {
		flex-shrink: 0;
		width: auto;
	}
	.toolbar-footer {
		min-width: 0;
	}
	@media (max-width: 560px) {
		.primary-row {
			flex-wrap: wrap;
			gap: 12px;
		}
		.primary-content {
			flex-basis: 100%;
		}
		.primary-row > :global(.sc-table-options) {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
