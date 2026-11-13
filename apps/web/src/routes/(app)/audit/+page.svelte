<script lang="ts">
	import AuditEntryTable from '$lib/audit/AuditEntryTable.svelte';

	let { data } = $props();
</script>

<section class="audit-page">
	<header>
		<h1>Jurnal global</h1>
		<span>{data.entries.length} {data.entries.length === 1 ? 'eveniment' : 'evenimente'}</span>
	</header>
	<section class="panel"><AuditEntryTable entries={data.entries} showActivity /></section>
</section>

<style>
	.audit-page {
		display: grid;
		min-width: 0;
		gap: 16px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 16px;
	}
	h1 {
		margin: 0;
		color: var(--sc-ink);
		font-size: clamp(24px, 3vw, 30px);
		line-height: 1.2;
	}
	header span {
		color: var(--sc-muted);
		font-size: 13px;
	}
	.panel {
		min-width: 0;
		border: 1px solid var(--sc-border);
		background: var(--sc-surface);
		border-radius: 8px;
		padding: 14px;
	}
</style>
