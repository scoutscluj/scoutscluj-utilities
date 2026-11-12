<script lang="ts">
	import AuditEntryTable from '$lib/audit/AuditEntryTable.svelte';

	let { data } = $props();
</script>

<section class="audit-page">
	<header class="section-heading">
		<h1>Istoricul activității</h1>
		<span>{data.entries.length} {data.entries.length === 1 ? 'acțiune' : 'acțiuni'}</span>
	</header>
	<AuditEntryTable entries={data.entries} />
</section>

<style>
	.audit-page {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.section-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
	}
	h1 {
		margin: 0;
		font-size: clamp(24px, 3vw, 30px);
		color: var(--sc-ink);
		letter-spacing: -0.025em;
	}
	.section-heading span {
		font-size: 13px;
		color: var(--sc-muted);
	}
</style>
