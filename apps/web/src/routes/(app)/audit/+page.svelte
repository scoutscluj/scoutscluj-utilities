<script lang="ts">
	let { data } = $props();

	const formatDateTime = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
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

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Când</th>
						<th>Cine</th>
						<th>Acțiune</th>
						<th>Activitate</th>
						<th>Entitate</th>
						<th>Detalii</th>
					</tr>
				</thead>
				<tbody>
					{#each data.entries as entry (entry.id)}
						<tr>
							<td>{formatDateTime(entry.createdAt)}</td>
							<td>{entry.actorName ?? 'Sistem'}</td>
							<td>{entry.action}</td>
							<td>{entry.activityId ?? '-'}</td>
							<td>{entry.entityType} #{entry.entityId}</td>
							<td><code>{JSON.stringify(entry.metadata)}</code></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		border-bottom: 1px solid #e2e8f0;
		padding: 10px;
		text-align: left;
		vertical-align: top;
	}

	th {
		color: #475569;
		font-size: 0.78rem;
		text-transform: uppercase;
	}

	code {
		white-space: pre-wrap;
		word-break: break-word;
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
