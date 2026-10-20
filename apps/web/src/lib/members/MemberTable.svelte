<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import type { Member, Registry, Detail } from './types';
	import { unitName, branchLabels, roleLabels } from './types';
	type Preview = {
		version: string;
		members: { id: string; name: string; revision: number; from: string; unitId: string | null }[];
		changes: Record<string, unknown>;
	};
	let {
		members,
		registry,
		preview,
		feeMenu,
		inactive = false
	}: {
		members: Member[];
		registry: Registry;
		preview?: Preview;
		feeMenu?: { id: string; name: string; fees: Detail['fees'] };
		inactive?: boolean;
	} = $props();
	let selected = $state<string[]>([]),
		editing = $state(false),
		kind = $state('grade'),
		grade = $state(''),
		unitId = $state(''),
		groupId = $state('');
	let page = $state(0),
		inactiveSearch = $state('');
	const normalize = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('ro');
	const filtered = $derived(
		members.filter((m) => !inactiveSearch || normalize(m.name).includes(normalize(inactiveSearch)))
	);
	const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / 25)));
	const pageRows = $derived(
		filtered.slice(Math.min(page, pageCount - 1) * 25, (Math.min(page, pageCount - 1) + 1) * 25)
	);
	const relevantPreview = $derived(
		preview && preview.members.every((m) => members.some((row) => row.id === m.id))
			? preview
			: undefined
	);
	const chosen = $derived(members.filter((m) => selected.includes(m.id)));
	const changes = $derived({
		kind,
		...(kind === 'grade'
			? { grade }
			: kind === 'structure'
				? { structureId: 'floresti' }
				: { unitId, groupId })
	});
	const money = (b: number) =>
		new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(b / 100);
	const json = (v: unknown) => JSON.stringify(v);
	const labels: Record<string, string> = {
		grade: 'Schimbă clasa',
		transfer: 'Mută în unitate / grupă',
		structure: 'Trece la Florești',
		withdraw: 'Confirmă retragerea din activitate',
		reactivate: 'Reactivează'
	};
	function rowEdit(m: Member) {
		selected = [m.id];
		kind = inactive ? 'withdraw' : 'grade';
		grade = String(m.grade ?? '');
		unitId = m.unitId ?? '';
		groupId = m.groupId ?? '';
		editing = true;
	}
</script>

{#if inactive}<label
		>Caută în istoricul Orgo<input
			bind:value={inactiveSearch}
			placeholder="Nume"
			oninput={() => (page = 0)}
		/></label
	>{/if}
{#if registry.canManage}
	<div class="toolbar">
		<button type="button" onclick={() => (selected = filtered.map((m) => m.id))}
			>Selectează toate rezultatele ({filtered.length})</button
		>
		{#if selected.length}<span>{chosen.length} selectați</span><button
				type="button"
				onclick={() => {
					editing = true;
					if (inactive) kind = 'withdraw';
				}}>Modifică selecția</button
			><button
				type="button"
				onclick={() => {
					selected = [];
					editing = false;
				}}>Renunță la selecție</button
			>{/if}
	</div>
{/if}
{#if editing && chosen.length}
	<form method="POST" use:enhance class="editor">
		<h3>{chosen.length === 1 ? chosen[0].name : `Modifică ${chosen.length} membri`}</h3>
		<input type="hidden" name="action" value="bulk" /><input
			type="hidden"
			name="members"
			value={json(chosen.map((m) => ({ id: m.id, revision: m.revision })))}
		/><input type="hidden" name="changes" value={json(changes)} />
		<label
			>Modificare<select bind:value={kind}>
				{#if !inactive}<option value="grade">Schimbă clasa</option><option value="transfer"
						>Mută în unitate / grupă</option
					>{/if}
				{#if registry.admin}<option value="structure">Trece la Florești</option>{/if}
				<option value="withdraw">Confirmă retragerea din activitate</option>
				{#if !inactive}<option value="reactivate">Reactivează</option>{/if}
			</select></label
		>
		{#if kind === 'grade'}<label
				>Clasa<input type="number" min="1" max="12" bind:value={grade} /></label
			>{/if}
		{#if kind === 'transfer' || kind === 'reactivate'}
			<label
				>Unitate<select bind:value={unitId} onchange={() => (groupId = '')}
					><option value="">Alege unitatea</option
					>{#each registry.units.filter((u) => !u.parentId && !u.archived) as u (u.id)}<option
							value={u.id}>{u.name}</option
						>{/each}</select
				></label
			>
			<label
				>Grupă<select bind:value={groupId}
					><option value="">Colectiv comun / nerepartizat</option
					>{#each registry.units.filter((u) => u.parentId === unitId && !u.archived) as u (u.id)}<option
							value={u.id}>{u.name}</option
						>{/each}</select
				></label
			>
		{/if}
		{#if kind === 'structure'}<p>
				Apartenența devine Florești. Repartizările beneficiarilor în unitățile vechi se încheie;
				alegerea noii unități se face separat. Responsabilitățile adulților se păstrează.
			</p>{/if}
		{#if kind === 'withdraw'}<p>
				Retragerea încheie toate responsabilitățile persoanei. Istoricul și plățile se păstrează.
			</p>{/if}
		<button>Previzualizează modificarea</button><button
			type="button"
			onclick={() => (editing = false)}>Închide</button
		>
	</form>
{/if}
{#if relevantPreview}
	<form method="POST" use:enhance class="editor">
		<h3>Confirmă: {labels[String(relevantPreview.changes.kind)] ?? 'Modificare'}</h3>
		<p>{relevantPreview.members.length} persoane vor fi actualizate.</p>
		<details>
			<summary>Vezi toate persoanele</summary>
			<ul>
				{#each relevantPreview.members as m (m.id)}<li>
						{m.name} · {m.from === 'floresti' ? 'Florești' : 'Cluj'}
					</li>{/each}
			</ul>
		</details>
		<input type="hidden" name="action" value="bulk" /><input
			type="hidden"
			name="version"
			value={relevantPreview.version}
		/><input
			type="hidden"
			name="members"
			value={json(relevantPreview.members.map((m) => ({ id: m.id, revision: m.revision })))}
		/><input type="hidden" name="changes" value={json(relevantPreview.changes)} />
		<label class="check"
			><input type="checkbox" name="confirm" required />Am verificat selecția și modificarea.</label
		><button>Aplică pentru {relevantPreview.members.length} persoane</button>
	</form>
{/if}
<div class="table">
	<table>
		<thead
			><tr
				>{#if registry.canManage}<th><span class="sr-only">Selectează</span></th>{/if}<th>Membru</th
				>{#if !inactive}<th>Unitate / grupă</th><th>Clasa</th><th>Status</th>{/if}<th>Acțiuni</th
				></tr
			></thead
		><tbody>
			{#each pageRows as m (m.id)}<tr>
					{#if registry.canManage}<td
							><input
								type="checkbox"
								aria-label={`Selectează ${m.name}`}
								value={m.id}
								bind:group={selected}
							/></td
						>{/if}
					<td
						><a href={resolve(`/units/${m.id}`)}>{m.name}</a><small
							>{registry.structures?.find((s) => s.id === (m.structureId ?? 'cluj'))?.name}{m.branch
								? ` · ${branchLabels[m.branch] ?? m.branch}`
								: ''}</small
						></td
					>
					{#if !inactive}<td
							>{m.unitId
								? unitName(registry.units, m.unitId)
								: m.responsibilityUnitIds?.map((id) => unitName(registry.units, id)).join(', ') ||
									'—'}{m.groupId ? ` / ${unitName(registry.units, m.groupId)}` : ''}</td
						><td>{m.grade ?? '—'}</td><td
							>{m.status === 'active'
								? 'Activ'
								: m.status === 'withdrawn'
									? 'Retras din activitate'
									: 'De verificat'}</td
						>{/if}
					<td
						><details class="menu">
							<summary>Acțiuni</summary>
							<form method="POST" use:enhance>
								<input type="hidden" name="action" value="fee-menu" /><input
									type="hidden"
									name="id"
									value={m.id}
								/><button>Cotizații</button>
								{#if registry.canFinance}<button>Național achitat în Orgo / partea locală</button
									>{/if}
							</form>
							{#if registry.canManage}<button type="button" onclick={() => rowEdit(m)}
									>{inactive ? 'Confirmă retragerea' : 'Modifică în listă'}</button
								>{/if}
							<a href={resolve(`/units/${m.id}`)}>Deschide fișa</a>
						</details></td
					>
				</tr>{:else}<tr><td colspan="6">Nu există membri pentru filtrele alese.</td></tr>{/each}
		</tbody>
	</table>
</div>
<nav aria-label="Paginile registrului" class="toolbar">
	<button type="button" disabled={page <= 0} onclick={() => page--}>Anterior</button><span
		>Pagina {Math.min(page, pageCount - 1) + 1} din {pageCount} · {filtered.length} membri</span
	><button type="button" disabled={page >= pageCount - 1} onclick={() => page++}>Următor</button>
</nav>
{#if feeMenu && members.some((m) => m.id === feeMenu.id)}
	<div class="editor">
		<h3>Cotizații · {feeMenu.name}</h3>
		{#each feeMenu.fees as fee (fee.period)}<article>
				<strong>{fee.period}</strong>
				<p>
					Total {money(fee.totalBani)} · Plătit {money(fee.paidBani)} · Rămas {money(
						fee.remainingBani
					)}
				</p>
				<p>
					Național: {money(fee.nationalBani ?? 0)}{fee.nationalDirectBani
						? ' · achitat direct în Orgo'
						: ''}. Încasat de centru: {money(fee.localPaidBani ?? fee.paidBani)}.
				</p>
				{#if registry.canFinance && fee.obligationId}<details>
						<summary>Național achitat în Orgo — confirmă partea locală</summary>
						<form method="POST" use:enhance>
							<input type="hidden" name="action" value="direct-national" /><input
								type="hidden"
								name="obligationId"
								value={fee.obligationId}
							/>
							<p>
								Se verifică plata națională pentru această perioadă. Referința unui transfer deja
								înregistrat reutilizează încasarea existentă.
							</p>
							<label
								>Referință transfer bancar<input name="reference" required maxlength="200" /></label
							><label>Data încasării<input type="date" name="receivedOn" required /></label>
							<label
								>Suma totală din extras (lei)<input
									type="number"
									name="amount"
									min="0.01"
									step="0.01"
									placeholder="Implicit: partea locală rămasă"
								/></label
							>
							<button>Verifică naționalul și confirmă partea locală</button>
						</form>
					</details>{/if}
			</article>{:else}<p>Nu există cotizații asociate.</p>{/each}
	</div>
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		margin: 16px 0;
	}
	.editor {
		padding: 20px;
		background: #f3f7f4;
		border: 1px solid #cadacf;
		border-radius: 10px;
		margin: 16px 0;
		display: grid;
		gap: 12px;
	}
	.editor h3 {
		margin: 0;
	}
	.editor ul {
		max-height: 240px;
		overflow: auto;
	}
	.table {
		overflow: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}
	th,
	td {
		padding: 12px 8px;
		border-bottom: 1px solid #e1e9e3;
		vertical-align: top;
	}
	th,
	small {
		color: #60736a;
	}
	small {
		display: block;
		margin-top: 5px;
	}
	a {
		color: #216249;
	}
	label {
		display: grid;
		gap: 6px;
	}
	button,
	input,
	select {
		font: inherit;
		padding: 9px;
		border: 1px solid #c7d6cc;
		border-radius: 6px;
	}
	button {
		cursor: pointer;
		background: white;
		color: #245b46;
	}
	form {
		display: grid;
		gap: 12px;
	}
	.menu {
		min-width: 100px;
	}
	.menu[open] {
		display: grid;
		gap: 8px;
	}
	.menu button,
	.menu a {
		display: block;
		margin-top: 9px;
	}
	.check {
		display: flex;
		align-items: center;
	}
	summary {
		cursor: pointer;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	article + article {
		border-top: 1px solid #c7d6cc;
		padding-top: 14px;
	}
</style>
