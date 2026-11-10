<script lang="ts">
	import AdmissionForm from '$lib/members/AdmissionForm.svelte';
	let { data, form } = $props();
	let filter = $state('pending');
	const rows = $derived(
		data.applications.applications.filter((r) => filter === 'all' || r.state === filter)
	);
	const labels: Record<string, string> = {
		pending: 'În așteptare',
		approved: 'Aprobată',
		rejected: 'Respinsă',
		'needs-information': 'Necesită completări'
	};
</script>

<svelte:head><title>Cereri de înscriere | Scouts Cluj</title></svelte:head>
<main>
	<header>
		<p class="eyebrow">Centrul local · Membri noi</p>
		<h1>Cereri de înscriere</h1>
		<p>Confirmă cererile unității tale. Crearea contului Orgo este urmărită separat.</p>
	</header>
	{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
	<div class="toolbar">
		<label
			>Stare <select bind:value={filter}
				><option value="pending">În așteptare</option><option value="approved">Aprobate</option
				><option value="needs-information">Necesită completări</option><option value="rejected"
					>Respinse</option
				><option value="all">Toate</option></select
			></label
		><span>{rows.length} cereri</span>
	</div>
	{#if !rows.length}<p class="empty">Nu există cereri vizibile pentru filtrul ales.</p>{/if}
	{#each rows as row (row.id)}<details class="application">
			<summary
				><span
					><strong>{row.data.firstName} {row.data.lastName}</strong><small
						>{data.applications.units.find((u) => u.id === row.unitId)?.name ??
							'Fără unitate aleasă'} · {new Date(row.createdAt).toLocaleDateString('ro-RO')}</small
					></span
				><span class="status">{labels[row.state] ?? row.state}</span></summary
			>
			<div class="body">
				<dl>
					<dt>Structură</dt>
					<dd>
						{(row.data.structureId ??
							data.applications.units.find((u) => u.id === row.unitId)?.structureId) === 'floresti'
							? 'Florești'
							: 'Cluj'}
					</dd>
					<dt>Data nașterii</dt>
					<dd>{row.data.birthDate}</dd>
					<dt>Clasă</dt>
					<dd>
						{row.data.schooling === 'grade'
							? row.data.grade === 0
								? 'Pregătitoare'
								: row.data.grade
							: 'Nu este elev'}
					</dd>
					<dt>Contact membru</dt>
					<dd>{[row.data.email, row.data.phone].filter(Boolean).join(' · ') || 'Nespecificat'}</dd>
					{#if row.data.guardianName}<dt>Părinte / tutore</dt>
						<dd>
							{row.data.guardianName} · {row.data.guardianRelation}<br />{row.data.guardianEmail} · {row
								.data.guardianPhone}
						</dd>{/if}
				</dl>
				{#if row.reason}<p>{row.reason}</p>{/if}
				{#if row.sync}<p class="notice">
						<strong
							>Orgo: {row.sync.state === 'synced'
								? 'Confirmat'
								: 'În curs / necesită verificare'}</strong
						><br />{row.sync.message}
					</p>{/if}
				{#if row.state !== 'approved'}<form method="POST" action="?/review">
						<input type="hidden" name="id" value={row.id} /><input
							type="hidden"
							name="revision"
							value={row.revision}
						/>
						{#if data.applications.admin}<label
								>ID Orgo existent, dacă ai verificat deja identitatea <input
									name="existingOrgoId"
									inputmode="numeric"
									pattern="[0-9]+"
								/></label
							>{/if}
						<button name="action" value="approve">Confirmă înscrierea</button>
						{#if data.applications.admin}<label
								>Motiv pentru respingere sau completări <textarea name="reason" maxlength="2000"
								></textarea></label
							>
							<div class="actions">
								<button class="secondary" name="action" value="needs-information"
									>Solicită completări</button
								><button class="secondary" name="action" value="reject">Respinge cererea</button>
							</div>{/if}
					</form>{/if}
				{#if row.state === 'approved' && row.sync && !['running', 'synced'].includes(row.sync.state)}
					<form method="POST" action="?/review">
						<input type="hidden" name="id" value={row.id} /><input
							type="hidden"
							name="revision"
							value={row.revision}
						/>
						{#if data.applications.admin}<label
								>ID Orgo verificat, pentru asociere <input
									name="existingOrgoId"
									inputmode="numeric"
									pattern="[0-9]+"
								/></label
							>{/if}
						<button name="action" value="retry">Confirmă din nou și reia verificarea</button>
					</form>
				{/if}
				{#if data.applications.admin && row.state !== 'approved'}<details>
						<summary>Corectează datele cererii</summary><AdmissionForm
							units={data.applications.units}
							requestKey={data.requestKey}
							action="?/edit"
							values={{ ...row.data, id: row.id, revision: row.revision, unitId: row.unitId }}
							submitLabel="Salvează corecturile"
						/>
					</details>{/if}
			</div>
		</details>{/each}
	{#if data.applications.admin}<details class="create">
			<summary>Adaugă o cerere în numele unui membru</summary>
			<div class="body">
				<AdmissionForm
					units={data.applications.units}
					requestKey={data.requestKey}
					action="?/create"
				/>
			</div>
		</details>{/if}
</main>

<style>
	main {
		max-width: 1040px;
		padding: 24px;
	}
	h1 {
		margin: 4px 0 12px;
		font-size: 1.9rem;
		letter-spacing: -0.02em;
	}
	header p,
	.eyebrow {
		color: var(--sc-muted);
	}
	.eyebrow {
		font-size: 0.75rem;
		text-transform: uppercase;
	}
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin: 24px 0 16px;
	}
	label {
		display: grid;
		gap: 8px;
		font-size: 0.85rem;
	}
	input,
	select,
	textarea {
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		box-sizing: border-box;
		max-width: 100%;
	}
	.application,
	.create {
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		margin: 12px 0;
	}
	summary {
		cursor: pointer;
		padding: 16px;
	}
	.application summary {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
	}
	summary strong {
		display: block;
		font-weight: 600;
	}
	small,
	.status {
		color: var(--sc-muted);
		font-size: 0.8rem;
	}
	.body {
		padding: 8px 24px 24px;
	}
	dl {
		display: grid;
		grid-template-columns: 160px 1fr;
		gap: 12px;
	}
	dt {
		color: var(--sc-muted);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	form {
		display: grid;
		gap: 16px;
		max-width: 640px;
	}
	button {
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: var(--sc-surface);
		padding: 12px 16px;
		min-height: 44px;
		font: inherit;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-accent-hover);
	}
	.secondary {
		background: var(--sc-surface);
		color: var(--sc-ink);
		border: 1px solid var(--sc-border);
	}
	.actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}
	.notice,
	.empty {
		padding: 16px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		line-height: 1.5;
	}
	.create {
		margin-top: 32px;
	}
	@media (max-width: 600px) {
		main {
			padding: 16px;
		}
		dl {
			grid-template-columns: 1fr;
			gap: 8px;
		}
		dd {
			margin-bottom: 12px;
		}
		.body {
			padding: 8px 16px 16px;
		}
	}
</style>
