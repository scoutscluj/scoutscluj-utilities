<script lang="ts">
	import AuditEntryTable from '$lib/audit/AuditEntryTable.svelte';

	let { data } = $props();
</script>

<section class="audit-page">
	<header>
		<p class="eyebrow">Audit</p>
		<h1>Jurnal global</h1>
	</header>

	<section class="panel">
		<div class="section-heading">
			<h2>Ultimele evenimente</h2>
			<span>{data.entries.length} evenimente</span>
		</div>

		<AuditEntryTable entries={data.entries} showActivity />
	</section>
</section>

<style>
	.audit-page,
	.panel {
		display: grid;
		gap: 18px;
	}

	header,
	h1,
	h2,
	p {
		margin: 0;
	}

	h1 {
		color: #0f172a;
		font-size: clamp(2rem, 4vw, 3rem);
	}

	.panel {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.section-heading span {
		color: #64748b;
		font-weight: 800;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0;
	}
</style>
