<script lang="ts">
	import FeePlanDialog from '$lib/membership/FeePlanDialog.svelte';
	let planOpen = $state(false),
		planId = $state<string>(),
		planName = $state(''),
		planCurrent = $state('normal');
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { tick, type Snippet } from 'svelte';
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
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
		inactive = false,
		message = '',
		filterContent,
		controls,
		onResponsibilities,
		management = true,
		searchQuery = '',
		loadedTotal = members.length
	}: {
		members: Member[];
		registry: Registry;
		preview?: Preview;
		feeMenu?: { id: string; name: string; fees: Detail['fees'] };
		inactive?: boolean;
		message?: string;
		filterContent?: Snippet;
		controls?: Snippet;
		onResponsibilities?: (member: Member) => void;
		management?: boolean;
		loadedTotal?: number;
		searchQuery?: string;
	} = $props();
	let selected = $state<string[]>([]),
		editing = $state(false),
		kind = $state('grade'),
		grade = $state(''),
		unitId = $state(''),
		groupId = $state('');
	let destinationStructure = $state('floresti');
	let pageSize = $state(25);
	let sort = $state('name');
	let descending = $state(false);
	let showUnit = $state(true),
		showGrade = $state(true),
		showStatus = $state(true);
	let activePreview = $state<Preview>();
	let feesOpen = $state(false);
	let rowAction = $state(false);
	let pending = $state(false);
	let displayedFees = $state<typeof feeMenu>();
	let feeTarget = $state('');
	let feeForm: HTMLFormElement;
	let page = $state(0),
		inactiveSearch = $state('');
	const filtered = $derived(
		members.filter((m) => !inactiveSearch || matchesSearch(m.name, inactiveSearch))
	);
	const sorted = $derived(
		[...filtered].sort((a, b) => {
			const value = (m: Member) =>
				sort === 'grade'
					? (m.grade ?? -1)
					: sort === 'unit'
						? unitName(registry.units, m.unitId)
						: sort === 'status'
							? m.status
							: m.name;
			const av = value(a),
				bv = value(b);
			const result =
				typeof av === 'number' && typeof bv === 'number'
					? av - bv
					: String(av).localeCompare(String(bv), 'ro', { numeric: true });
			return descending ? -result : result;
		})
	);
	const effectiveSize = $derived(pageSize || Math.max(1, filtered.length));
	const pageCount = $derived(Math.max(1, Math.ceil(sorted.length / effectiveSize)));
	const currentPage = $derived(Math.min(page, pageCount - 1));
	const pageRows = $derived(
		sorted.slice(currentPage * effectiveSize, (currentPage + 1) * effectiveSize)
	);
	const allPageSelected = $derived(
		pageRows.length > 0 &&
			pageRows.filter((m) => m.access?.edit).every((m) => selected.includes(m.id))
	);
	function sortBy(column: string) {
		descending = sort === column ? !descending : false;
		sort = column;
		page = 0;
	}
	const relevantPreview = $derived(
		preview && preview.members.every((m) => members.some((row) => row.id === m.id))
			? preview
			: undefined
	);
	const chosen = $derived(filtered.filter((m) => selected.includes(m.id)));
	$effect(() => {
		const valid = selected.filter((id) => filtered.some((m) => m.id === id));
		if (valid.length !== selected.length) selected = valid;
	});
	$effect(() => {
		if (relevantPreview) {
			activePreview = relevantPreview;
			editing = true;
		}
	});
	$effect(() => {
		if (feeMenu && members.some((m) => m.id === feeMenu.id)) {
			displayedFees = feeMenu;
			feesOpen = true;
		}
	});
	const submitEdit: SubmitFunction = () => {
		pending = true;
		return async ({ result, update }) => {
			pending = false;
			await update({ reset: false });
			if (result.type === 'success' && !result.data?.bulkPreview) {
				editing = false;
				selected = [];
				activePreview = undefined;
			}
		};
	};
	const submitFee: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				feesOpen = false;
				displayedFees = undefined;
			}
		};
	async function loadFees(m: Member) {
		feeTarget = m.id;
		await tick();
		feeForm.requestSubmit();
	}
	function rowActions(m: Member) {
		return [
			...(m.access?.delegate && onResponsibilities
				? [{ label: 'Responsabilități', action: () => onResponsibilities?.(m) }]
				: []),
			...(m.access?.detail
				? [
						{
							label: 'Deschide fișa',
							action: () => {
								void goto(resolve(`/units/${m.id}`));
							}
						}
					]
				: []),
			...(m.access?.fees
				? [
						{
							label: 'Cotizații',
							action: () => {
								void loadFees(m);
							}
						}
					]
				: []),
			...(management && m.access?.edit
				? [
						...(!inactive
							? [
									{ label: labels.grade, action: () => rowEdit(m, 'grade') },
									...(m.access?.transfer
										? [{ label: labels.transfer, action: () => rowEdit(m, 'transfer') }]
										: []),
									...(m.status !== 'active'
										? [{ label: labels.reactivate, action: () => rowEdit(m, 'reactivate') }]
										: [])
								]
							: []),
						...(registry.admin
							? [{ label: labels.structure, action: () => rowEdit(m, 'structure') }]
							: []),
						{
							label: 'Confirmă retragerea',
							action: () => rowEdit(m, 'withdraw'),
							destructive: true
						}
					]
				: [])
		];
	}
	const changes = $derived({
		kind,
		...(kind === 'grade'
			? { grade }
			: kind === 'structure'
				? { structureId: destinationStructure }
				: { unitId, groupId })
	});
	const money = (b: number) =>
		new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(b / 100);
	const json = (v: unknown) => JSON.stringify(v);
	const labels: Record<string, string> = {
		grade: 'Schimbă clasa',
		transfer: 'Mută în unitate / grupă',
		structure: 'Schimbă structura',
		withdraw: 'Confirmă retragerea din activitate',
		reactivate: 'Reactivează'
	};
	function rowEdit(m: Member, action: string) {
		rowAction = true;
		activePreview = undefined;
		selected = [m.id];
		kind = action;
		grade = String(m.grade ?? '');
		unitId = m.unitId ?? '';
		groupId = m.groupId ?? '';
		editing = true;
	}
</script>

{#if management && registry.canManage && chosen.length}
	<div class="toolbar">
		{#if selected.length}<span>{chosen.length} selectați</span><button
				type="button"
				onclick={() => {
					activePreview = undefined;
					rowAction = false;
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
<form method="POST" use:enhance bind:this={feeForm} hidden>
	<input type="hidden" name="action" value="fee-menu" /><input
		type="hidden"
		name="id"
		value={feeTarget}
	/>
</form>
<Modal
	bind:open={editing}
	title={activePreview
		? `Confirmă: ${labels[String(activePreview.changes.kind)] ?? 'Modificare'}`
		: chosen.length === 1
			? `${labels[kind]} · ${chosen[0].name}`
			: `Modifică ${chosen.length} membri`}
	description="Verifică modificarea înainte de a o aplica. Istoricul membrilor se păstrează."
>
	{#if message}<p role="status">{message}</p>{/if}
	{#if !activePreview && chosen.length}
		<form method="POST" use:enhance={submitEdit} class="editor">
			<input type="hidden" name="action" value="bulk" /><input
				type="hidden"
				name="members"
				value={json(chosen.map((m) => ({ id: m.id, revision: m.revision })))}
			/><input type="hidden" name="changes" value={json(changes)} />
			{#if !rowAction}<label
					>Modificare<select bind:value={kind}>
						{#if !inactive}<option value="grade">Schimbă clasa</option><option value="transfer"
								>Mută în unitate / grupă</option
							>{/if}
						{#if registry.admin}<option value="structure">Schimbă structura</option>{/if}
						<option value="withdraw">Confirmă retragerea din activitate</option>
						{#if !inactive}<option value="reactivate">Reactivează</option>{/if}
					</select></label
				>
			{/if}
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
			{#if kind === 'structure'}<label
					>Structură destinație<select bind:value={destinationStructure}
						>{#each registry.structures ?? [] as structure (structure.id)}<option
								value={structure.id}>{structure.name}</option
							>{/each}</select
					></label
				>
				<p>
					Categoria principală se păstrează. Subunitatea se repartizează în structura destinație;
					istoricul responsabilităților rămâne disponibil.
				</p>{/if}
			{#if kind === 'withdraw'}<p>
					Retragerea încheie toate responsabilitățile persoanei. Istoricul și plățile se păstrează.
				</p>{/if}
			<button type="submit" disabled={pending}>Previzualizează modificarea</button><button
				type="button"
				onclick={() => (editing = false)}>Închide</button
			>
		</form>
	{/if}
	{#if activePreview}
		<form method="POST" use:enhance={submitEdit} class="editor">
			<p>{activePreview.members.length} persoane vor fi actualizate.</p>
			<details>
				<summary>Vezi toate persoanele</summary>
				<ul>
					{#each activePreview.members as m (m.id)}<li>
							{m.name} · {m.from === 'floresti' ? 'Florești' : 'Cluj'}
						</li>{/each}
				</ul>
			</details>
			<input type="hidden" name="action" value="bulk" /><input
				type="hidden"
				name="version"
				value={activePreview.version}
			/><input
				type="hidden"
				name="members"
				value={json(activePreview.members.map((m) => ({ id: m.id, revision: m.revision })))}
			/><input type="hidden" name="changes" value={json(activePreview.changes)} />
			<label class="check"
				><input type="checkbox" name="confirm" required />Am verificat selecția și modificarea.</label
			><button type="submit" disabled={pending}
				>Aplică pentru {activePreview.members.length} persoane</button
			>
			<button type="button" onclick={() => (activePreview = undefined)}>Înapoi la modificare</button
			>
		</form>
	{/if}
</Modal>
<TableToolbar>
	{#snippet filters()}
		{#if inactive}<label
				>Caută în istoricul Orgo<input
					type="search"
					bind:value={inactiveSearch}
					placeholder="Nume"
					oninput={() => (page = 0)}
				/></label
			>{:else if filterContent}{@render filterContent()}{/if}
	{/snippet}

	{#if !inactive}<details class="column-picker">
			<summary class="sc-table-column-trigger" aria-label="Alege coloanele" title="Alege coloanele"
				><Columns3 size={18} aria-hidden="true" /></summary
			>
			<div>
				<label><input type="checkbox" bind:checked={showUnit} />Unitate / grupă</label><label
					><input type="checkbox" bind:checked={showGrade} />Clasa</label
				><label><input type="checkbox" bind:checked={showStatus} />Status</label>
			</div>
		</details>{/if}

	{#if controls}{@render controls()}{/if}
</TableToolbar>
<div class="table">
	<table use:highlightSearch={inactive ? inactiveSearch : searchQuery}>
		<thead
			><tr>
				{#if management && registry.canManage}<th
						><input
							type="checkbox"
							aria-label="Selectează pagina curentă"
							checked={allPageSelected}
							indeterminate={pageRows.some((m) => selected.includes(m.id)) && !allPageSelected}
							onchange={() => {
								selected = allPageSelected
									? selected.filter((id) => !pageRows.some((m) => m.id === id))
									: [
											...new Set([
												...selected,
												...pageRows.filter((m) => m.access?.edit).map((m) => m.id)
											])
										];
							}}
						/></th
					>{/if}
				<th aria-sort={sort === 'name' ? (descending ? 'descending' : 'ascending') : 'none'}
					><button type="button" class="sort-button" onclick={() => sortBy('name')}
						>Membru {sort === 'name' ? (descending ? '↓' : '↑') : '↕'}</button
					></th
				>
				{#if !inactive}
					{#if showUnit}<th
							aria-sort={sort === 'unit' ? (descending ? 'descending' : 'ascending') : 'none'}
							><button type="button" class="sort-button" onclick={() => sortBy('unit')}
								>Unitate / grupă ↕</button
							></th
						>{/if}
					{#if showGrade}<th
							aria-sort={sort === 'grade' ? (descending ? 'descending' : 'ascending') : 'none'}
							><button type="button" class="sort-button" onclick={() => sortBy('grade')}
								>Clasa ↕</button
							></th
						>{/if}
					{#if showStatus}<th
							aria-sort={sort === 'status' ? (descending ? 'descending' : 'ascending') : 'none'}
							><button type="button" class="sort-button" onclick={() => sortBy('status')}
								>Status ↕</button
							></th
						>{/if}
				{/if}<th><span class="sr-only">Acțiuni</span></th>
			</tr></thead
		><tbody>
			{#each pageRows as m (m.id)}<tr class:selected={selected.includes(m.id)}>
					{#if management && registry.canManage}<td
							><input
								type="checkbox"
								disabled={!m.access?.edit}
								aria-label={`Selectează ${m.name}`}
								value={m.id}
								bind:group={selected}
							/></td
						>{/if}
					<td
						>{#if m.access?.detail}<a href={resolve(`/units/${m.id}`)}>{m.name}</a>{:else}<strong
								>{m.name}</strong
							>{/if}<small
							>{registry.structures?.find((s) => s.id === (m.structureId ?? 'cluj'))
								?.name}{(m.category ?? m.branch)
								? ` · ${branchLabels[m.category ?? m.branch ?? ''] ?? 'De verificat'}`
								: m.orgoType
									? ` · ${m.orgoType}`
									: m.categoryReview
										? ' · De verificat'
										: ''}
							{(m.roles ?? [])
								.filter((role) => role !== 'beneficiary')
								.map((role) => roleLabels[role] ?? role)
								.join(', ')}
						</small></td
					>
					{#if !inactive}{#if showUnit}<td
								>{m.unitId
									? unitName(registry.units, m.unitId)
									: m.responsibilityUnitIds?.map((id) => unitName(registry.units, id)).join(', ') ||
										'—'}{m.groupId
									? ` / ${unitName(registry.units, m.groupId)}`
									: ' / Nerepartizat'}</td
							>{/if}{#if showGrade}<td>{m.grade ?? '—'}</td>{/if}{#if showStatus}<td
								>{m.status === 'active'
									? 'Activ'
									: m.status === 'withdrawn'
										? 'Retras din activitate'
										: m.status === 'suspended'
											? 'Suspendat'
											: m.status === 'inactive'
												? 'Inactiv'
												: 'De verificat'}
								{#if m.syncMessage}<small title={m.syncMessage}>{m.syncMessage}</small>{/if}</td
							>{/if}{/if}
					<td
						>{#if rowActions(m).length}<ActionMenu
								label={`Acțiuni pentru ${m.name}`}
								items={rowActions(m)}
							/>{/if}</td
					>
				</tr>{:else}<tr
					><td
						colspan={2 +
							Number(management && registry.canManage) +
							(inactive ? 0 : Number(showUnit) + Number(showGrade) + Number(showStatus))}
						>Nu există membri pentru filtrele alese.</td
					></tr
				>{/each}
		</tbody>
	</table>
</div>
<TablePagination
	bind:page
	bind:pageSize
	total={filtered.length}
	{loadedTotal}
	label="Paginile registrului"
/>
<Modal
	bind:open={feesOpen}
	title={`Cotizații · ${displayedFees?.name ?? 'Membru'}`}
	description="Situația plăților și contribuțiilor pentru fiecare perioadă."
>
	{#if message}<p role="status">{message}</p>{/if}
	{#if displayedFees}
		<div class="editor">
			{#each displayedFees.fees as fee (fee.period)}<article>
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
					{#if management && registry.canFinance && fee.obligationId && fee.current}<button
							type="button"
							onclick={() => {
								planId = fee.obligationId;
								planName = displayedFees?.name ?? '';
								planCurrent = fee.plan ?? 'normal';
								feesOpen = false;
								planOpen = true;
							}}>Schimbă tipul cotizației</button
						>{/if}
					{#if management && registry.canFinance && fee.obligationId}<details>
							<summary>Național achitat în Orgo — confirmă partea locală</summary>
							<form method="POST" use:enhance={submitFee}>
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
									>Referință transfer bancar<input
										name="reference"
										required
										maxlength="200"
									/></label
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
								<button type="submit">Verifică naționalul și confirmă partea locală</button>
							</form>
						</details>{/if}
				</article>{:else}<p>Nu există cotizații asociate.</p>{/each}
		</div>
	{/if}
</Modal>

<FeePlanDialog
	bind:open={planOpen}
	obligationId={planId}
	memberName={planName}
	currentPlan={planCurrent}
/>

<style>
	.column-picker {
		position: relative;
	}
	.column-picker > div {
		position: absolute;
		right: 0;
		top: 100%;
		min-width: 180px;
		background: var(--sc-surface);
		padding: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		box-shadow: var(--sc-shadow);
		z-index: 2;
		display: grid;
		gap: 10px;
	}
	.column-picker label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.sort-button {
		border: 0;
		background: transparent;
		padding: 0;
		color: var(--sc-muted);
		font-size: 13px;
		font-weight: 600;
		text-align: left;
		white-space: nowrap;
	}
	tbody tr:hover {
		background: var(--sc-canvas);
	}
	tbody tr.selected {
		background: var(--sc-accent-soft);
	}
	th {
		background: var(--sc-canvas);
	}
	td:last-child {
		width: 48px;
		text-align: right;
	}
	td > a {
		color: var(--sc-ink);
		font-weight: 600;
		text-decoration: none;
	}
	td > a:hover {
		color: var(--sc-accent);
		text-decoration: underline;
	}
	input[type='checkbox'] {
		width: 16px;
		height: 16px;
	}
	.table {
		position: relative;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		margin: 16px 0;
	}
	.editor {
		padding: 0;
		margin: 0;
		display: grid;
		gap: 12px;
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
		border-bottom: 1px solid var(--sc-border);
		vertical-align: middle;
	}
	th,
	small {
		color: var(--sc-muted);
	}
	small {
		display: block;
		margin-top: 5px;
	}
	a {
		color: var(--sc-accent);
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
		border: 1px solid var(--sc-border-strong);
		border-radius: 6px;
	}
	button {
		cursor: pointer;
		background: white;
		color: var(--sc-accent);
	}
	form {
		display: grid;
		gap: 12px;
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
		border-top: 1px solid var(--sc-border-strong);
		padding-top: 14px;
	}
</style>
