<script lang="ts">
	let { data, form } = $props();
	const kinds: Record<string, string> = {
		roles: 'Responsabilități',
		assignment: 'Repartizare',
		progression: 'Progresie',
		grade: 'Clasă',
		bio: 'Descriere membru',
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
		'review-required': 'Istoric de verificat',
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
				{#each form.preview.remoteRoles as role, i (i)}<li>
						{role.name}{role.unitName ? ` · ${role.unitName}` : ''}
					</li>{/each}
			</ul>
			<div class="table preview-table">
				<table>
					<thead><tr><th>Câmp</th><th>Intenția locală</th><th>Valoarea Orgo</th></tr></thead><tbody>
						{#each form.preview.changes as change, i (i)}<tr
								><td data-label="Câmp">{change.label}</td><td data-label="Intenția locală"
									>{change.local}</td
								><td data-label="Valoarea Orgo">{change.remote}</td></tr
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
				>{#each data.outbox.members as row (row.id)}<tr
						><td><strong>{row.name}</strong><br />{kinds[row.kind] ?? row.kind}</td><td
							data-label="Stare"
							><span
								class="sync-state"
								class:confirmed={row.state === 'synced'}
								class:review={[
									'review-required',
									'permission-required',
									'unsupported',
									'uncertain'
								].includes(row.state)}>{states[row.state] ?? row.state}</span
							></td
						><td data-label="Detalii">{row.message}</td><td class="row-actions"
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
				>{#each data.outbox.objects as row (row.id)}<tr
						><td>{kinds[row.kind] ?? row.kind}<small>{row.subjectId}</small></td><td
							data-label="Stare"
							><span
								class="sync-state"
								class:confirmed={row.state === 'synced'}
								class:review={[
									'review-required',
									'permission-required',
									'unsupported',
									'uncertain'
								].includes(row.state)}>{states[row.state] ?? row.state}</span
							></td
						><td data-label="Detalii">{row.message}</td><td class="row-actions"
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
		min-width: 0;
		container: orgo-sync / inline-size;
		color: var(--sc-ink);
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
		overflow-wrap: anywhere;
	}
	th {
		color: var(--sc-muted);
		font-weight: 500;
	}
	td {
		min-width: 140px;
		overflow-wrap: anywhere;
	}
	form {
		display: grid;
		gap: 12px;
	}
	button {
		min-height: 44px;
		border: 1px solid var(--sc-control-border);
		border-radius: 7px;
		padding: 8px 12px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		cursor: pointer;
	}
	.sync-state {
		display: inline-flex;
		padding: 4px 8px;
		border-radius: 6px;
		background: var(--sc-inset);
		color: var(--sc-ink);
		font-size: 12px;
		line-height: 1.5;
	}
	.sync-state.confirmed {
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}
	.sync-state.review {
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
	}
	:is(button, input, textarea, summary):focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
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
		min-height: 44px;
		border: 1px solid var(--sc-control-border);
		border-radius: 7px;
		background: var(--sc-inset);
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
	.check {
		min-height: 44px;
	}
	.check input {
		flex: 0 0 20px;
		width: 20px;
		height: 20px;
		min-height: 20px;
		padding: 0;
		margin: 0;
	}
	textarea {
		width: 100%;
		min-width: 0;
		min-height: 96px;
		resize: vertical;
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
		min-height: 44px;
	}
	@container orgo-sync (max-width: 900px) {
		.table {
			overflow: visible;
		}
		table,
		tbody {
			display: block;
		}
		thead {
			display: none;
		}
		tr {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 12px;
			padding: 16px;
			margin: 0 0 12px;
			background: var(--sc-surface);
			border: 1px solid var(--sc-border);
			border-radius: 10px;
		}
		td {
			display: block;
			padding: 0;
			border: 0;
			min-width: 0;
			max-width: 100%;
		}
		td[data-label]::before {
			content: attr(data-label);
			display: block;
			margin-bottom: 4px;
			color: var(--sc-muted);
			font-size: 12px;
		}
		td:first-child {
			font-size: 14px;
		}
		td.row-actions:empty {
			display: none;
		}
		td[colspan] {
			grid-column: 1 / -1;
		}
		.table:not(.preview-table) tr {
			grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
			gap: 8px 12px;
			padding: 12px;
		}
		.table:not(.preview-table) td:first-child:not([colspan]) {
			grid-column: 1;
			grid-row: 1;
		}
		.table:not(.preview-table) td:nth-child(2) {
			grid-column: 2;
			grid-row: 1;
			justify-self: end;
		}
		.table:not(.preview-table) td:nth-child(2)::before,
		.table:not(.preview-table) td:nth-child(3)::before {
			display: none;
		}
		.table:not(.preview-table) td:nth-child(3),
		.table:not(.preview-table) td:nth-child(4) {
			grid-column: 1 / -1;
		}
		.sync-state {
			max-width: 100%;
		}
		small {
			margin-top: 4px;
		}

		form,
		label,
		details {
			min-width: 0;
			overflow-wrap: anywhere;
		}
		input {
			width: 100%;
		}
		.check input {
			width: 20px;
		}
		button {
			justify-self: start;
		}
		article {
			padding: 16px;
		}
	}
</style>
