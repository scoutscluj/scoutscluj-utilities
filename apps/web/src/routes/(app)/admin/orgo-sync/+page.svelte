<script lang="ts">
	let { data, form } = $props();
	const kinds: Record<string, string> = {
		roles: 'Responsabilități',
		assignment: 'Repartizare',
		progression: 'Progresie',
		grade: 'Clasă',
		status: 'Status membru',
		'orgo-profile': 'Fișă Orgo',
		profile: 'Identitate',
		photo: 'Fotografie',
		'fee-plan': 'Plan cotizație',
		'local-profile': 'Date locale',
		'admission-create': 'Creare cont',
		activity: 'Activitate',
		registration: 'Participare',
		unit: 'Unitate',
		subunit: 'Subunitate'
	};
	const states: Record<string, string> = {
		pending: 'În așteptare',
		running: 'În curs',
		synced: 'Confirmat',
		superseded: 'Înlocuit de datele Orgo',
		'permission-required': 'Necesită verificare',
		unsupported: 'Mapare necesară',
		uncertain: 'Rezultat incert',
		'local-only': 'Doar local'
	};
</script>

<svelte:head><title>Sincronizare Orgo | Scouts Cluj</title></svelte:head>
<section>
	<h1>Sincronizare Orgo</h1>
	<p class="muted">
		Verifică diferențele înainte de a relua modificările istorice. Datele locale fără echivalent
		rămân locale.
	</p>
	{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
	{#if form?.preview}<article>
			<h2>{form.preview.name}</h2>
			<p>Status curent Orgo: {form.preview.remoteStatus}</p>
			<ul>
				{#each form.preview.remoteRoles as role}<li>
						{role.name}{role.unitName ? ` · ${role.unitName}` : ''}
					</li>{/each}
			</ul>
			<div class="table">
				<table>
					<thead><tr><th>Câmp</th><th>Intenția locală</th><th>Valoarea Orgo</th></tr></thead><tbody>
						{#each form.preview.changes as change}<tr
								><td>{change.label}</td><td>{change.local}</td><td>{change.remote}</td></tr
							>{/each}
					</tbody>
				</table>
			</div>
			<p>{form.preview.message}</p>
			<form method="POST">
				<input type="hidden" name="action" value="retry" /><input
					type="hidden"
					name="id"
					value={form.preview.id}
				/><input type="hidden" name="version" value={form.preview.version} />
				{#if form.preview.roleCreateStarted}
					<label class="check"
						><input type="checkbox" name="absenceVerified" /> Am verificat că rolul lipsă nu a fost creat
						în Orgo</label
					>
					<label>Detaliile verificării <textarea name="evidence" maxlength="2000"></textarea></label
					>
				{/if}<button>Confirmă reverificarea și reluarea</button>
			</form>
		</article>{/if}
	<h2>Modificări ale membrilor</h2>
	<div class="table">
		<table>
			<thead
				><tr><th>Membru / operație</th><th>Stare</th><th>Detalii</th><th>Acțiune</th></tr></thead
			><tbody
				>{#each data.outbox.members as row}<tr
						><td><strong>{row.name}</strong><br />{kinds[row.kind] ?? row.kind}</td><td
							>{states[row.state] ?? row.state}</td
						><td>{row.message}</td><td
							>{#if !['running', 'synced', 'superseded'].includes(row.state) && !['local-profile', 'admission-create', 'create'].includes(row.kind)}<form
									method="POST"
								>
									<input type="hidden" name="id" value={row.id} /><button
										name="action"
										value="preview">Verifică în Orgo</button
									>
								</form>{/if}</td
						></tr
					>
				{:else}<tr
						><td colspan="4" class="muted">Nu există operații de sincronizare înregistrate.</td></tr
					>
				{/each}</tbody
			>
		</table>
	</div>
	<h2>Activități și structuri</h2>
	<div class="table">
		<table>
			<thead><tr><th>Operație</th><th>Stare</th><th>Detalii</th><th>Rezolvare</th></tr></thead
			><tbody
				>{#each data.outbox.objects as row}<tr
						><td>{kinds[row.kind] ?? row.kind}<small>{row.subjectId}</small></td><td
							>{states[row.state] ?? row.state}</td
						><td>{row.message}</td><td
							>{#if !['running', 'synced'].includes(row.state)}<details>
									<summary>Reia / asociază</summary>
									<form method="POST">
										<input type="hidden" name="action" value="object" /><input
											type="hidden"
											name="id"
											value={row.id}
										/><label>ID Orgo verificat <input name="remoteId" /></label><label class="check"
											><input type="checkbox" name="absenceVerified" /> Am verificat că obiectul nu a
											fost creat în Orgo</label
										><label
											>Dovada verificării <textarea name="evidence" maxlength="2000"
											></textarea></label
										><button>Programează reverificarea</button>
									</form>
								</details>{/if}</td
						></tr
					>
				{:else}<tr
						><td colspan="4" class="muted">Nu există operații de sincronizare înregistrate.</td></tr
					>
				{/each}</tbody
			>
		</table>
	</div>
</section>

<style>
	section {
		max-width: 1200px;
	}
	h1 {
		font-size: 1.9rem;
		letter-spacing: -0.02em;
		margin: 0 0 16px;
	}
	h2 {
		font-size: 1.2rem;
		margin-top: 32px;
	}
	.muted,
	small {
		color: var(--sc-muted);
	}
	small {
		display: block;
		font-size: 0.7rem;
		overflow-wrap: anywhere;
		margin-top: 8px;
	}
	.table {
		overflow: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	th,
	td {
		text-align: left;
		padding: 12px;
		border-bottom: 1px solid var(--sc-border);
		vertical-align: top;
	}
	th {
		color: var(--sc-muted);
		font-weight: 500;
	}
	td {
		min-width: 140px;
	}
	form {
		display: grid;
		gap: 12px;
	}
	button {
		min-height: 40px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		padding: 8px 12px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-accent-soft);
	}
	label {
		display: grid;
		gap: 4px;
		font-size: 0.8rem;
	}
	input,
	textarea {
		max-width: 100%;
		min-height: 40px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 8px;
		font: inherit;
		box-sizing: border-box;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.notice,
	article {
		padding: 16px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	summary {
		cursor: pointer;
		min-height: 40px;
	}
</style>
