<script lang="ts">
	import type { Snippet } from 'svelte';
	let { filters, children }: { filters?: Snippet; children?: Snippet } = $props();
</script>

<div class="sc-table-toolbar">
	{#if filters}<div class="sc-table-filters">{@render filters()}</div>{/if}
	{#if children}<div class="sc-table-options">{@render children()}</div>{/if}
</div>
