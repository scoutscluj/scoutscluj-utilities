<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import FeePlanDialog from '$lib/membership/FeePlanDialog.svelte';
	let planOpen = $state(false),
		planId = $state<string>(),
		planName = $state(''),
		planCurrent = $state('normal');
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import Download from '@lucide/svelte/icons/download';
	import { feeLabel, memberCsv, statusLabels } from './registry-table';
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { tick, type Snippet } from 'svelte';
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import type { Member, Registry, Detail } from './types';
	import { hasSchoolGrade, memberPlacement, unitName, branchLabels, roleLabels } from './types';
	let {
		members,
		registry,
		feeMenu,
		inactive = false,
		message = '',
		filterContent,
		searchContent,
		filterSummary,
		controls,
		onResponsibilities,
		management = true,
		searchQuery = '',
		loadedTotal = members.length
	}: {
		members: Member[];
		registry: Registry;
		feeMenu?: { id: string; name: string; fees: Detail['fees'] };
		inactive?: boolean;
		message?: string;
		filterContent?: Snippet;
		searchContent?: Snippet;
		filterSummary?: Snippet;
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
		showAge = $state(true),
		showStatus = $state(true);
	const canSeeFees = $derived(members.some((m) => m.access?.fees));
	let editError = $state('');
	let feesOpen = $state(false);
	let pending = $state(false);
	let displayedFees = $state<typeof feeMenu>();
	let feeTarget = $state('');
	let feeForm: HTMLFormElement;
	let inactiveSearch = $state('');
	let page = $derived.by(() => {
		void members;
		void inactiveSearch;
		return 0;
	});
	const filtered = $derived(
		members.filter((m) => !inactiveSearch || matchesSearch(m.name, inactiveSearch))
	);
	const sorted = $derived(
		[...filtered].sort((a, b) => {
			const value = (m: Member) =>
				sort === 'grade'
					? hasSchoolGrade(m)
						? (m.grade ?? -1)
						: -1
					: sort === 'unit'
						? memberPlacement(registry.units, m)
						: sort === 'age'
							? (m.age ?? -1)
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
	function exportCsv() {
		const csv = memberCsv(sorted, registry, {
			unit: !inactive && showUnit,
			grade: !inactive && showGrade,
			age: !inactive && showAge,
			status: !inactive && showStatus,
			fees: canSeeFees
		});
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = 'membri-unitati.csv';
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}
	const allPageSelected = $derived(
		pageRows.length > 0 &&
			pageRows.filter((m) => m.access?.edit).every((m) => selected.includes(m.id))
	);
	function sortBy(column: string) {
		descending = sort === column ? !descending : false;
		sort = column;
		page = 0;
	}
	const chosen = $derived(filtered.filter((m) => selected.includes(m.id)));
	const chosenStructure = $derived(new Set(chosen.map((m) => m.structureId ?? 'cluj')));
	const canChangeGrade = $derived(chosen.every((m) => m.access?.edit && hasSchoolGrade(m)));
	const canTransfer = $derived(
		chosenStructure.size === 1 && chosen.every((m) => m.access?.transfer)
	);
	const transferUnits = $derived(
		registry.units.filter(
			(u) =>
				!u.parentId &&
				!u.archived &&
				chosenStructure.size === 1 &&
				chosenStructure.has(u.structureId ?? 'cluj')
		)
	);
	$effect(() => {
		const valid = selected.filter((id) => filtered.some((m) => m.id === id));
		if (valid.length !== selected.length) selected = valid;
	});
	$effect(() => {
		if (feeMenu && members.some((m) => m.id === feeMenu.id)) {
			displayedFees = feeMenu;
			feesOpen = true;
		}
	});
	const submitEdit: SubmitFunction = ({ cancel }) => {
		if (pending) {
			cancel();
			return;
		}
		pending = true;
		editError = '';
		const target = chosen.length === 1 ? chosen[0].name : `${chosen.length} membri`;
		const destination = [
			unitName(registry.units, unitId),
			groupId ? unitName(registry.units, groupId) : ''
		]
			.filter(Boolean)
			.join(' / ');
		const descriptions: Record<string, string> = {
			grade: `clasa a fost schimbată în ${grade}`,
			transfer: `repartizarea a fost schimbată în ${destination}`,
			structure: `structura a fost schimbată în ${registry.structures?.find((s) => s.id === destinationStructure)?.name ?? destinationStructure}`,
			withdraw: 'retragerea din activitate a fost salvată',
			reactivate: `reactivarea în ${destination} a fost salvată`
		};
		const successMessage = `${target}: ${descriptions[kind] ?? 'modificarea a fost salvată'}.`;
		return async ({ result, update }) => {
			try {
				if (result.type === 'failure' || result.type === 'error') {
					editError =
						result.type === 'failure' && typeof result.data?.message === 'string'
							? result.data.message
							: 'Salvarea nu a putut fi confirmată. Verifică conexiunea și reîncearcă.';
					toast.error(editError);
					return;
				}
				await update({ reset: false });
				if (result.type === 'success') {
					editing = false;
					selected = [];
					toast.success(successMessage, { duration: 6000 });
				}
			} finally {
				pending = false;
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
									...(hasSchoolGrade(m)
										? [{ label: labels.grade, action: () => rowEdit(m, 'grade') }]
										: []),
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
		editError = '';
		selected = [m.id];
		kind = action;
		grade = String(m.grade ?? '');
		unitId = m.unitId ?? '';
		groupId = m.groupId ?? '';
		editing = true;
	}
	function editSelection(action: string) {
		editError = '';
		kind = action;
		grade = '';
		unitId = '';
		groupId = '';
		editing = true;
	}
</script>

{#if management && registry.canManage && chosen.length}
	<div
		class="toolbar"
		role="group"
		aria-label={`Acțiuni pentru ${chosen.length} ${chosen.length === 1 ? 'membru selectat' : 'membri selectați'}`}
	>
		<span>{chosen.length} {chosen.length === 1 ? 'selectat' : 'selectați'}</span>
		{#if !inactive}
			<button
				type="button"
				disabled={!canChangeGrade}
				title={!canChangeGrade
					? 'Selectează doar membri cu clasă școlară și drept de editare.'
					: undefined}
				onclick={() => editSelection('grade')}>Schimbă clasa</button
			>
			<button
				type="button"
				disabled={!canTransfer}
				title={!canTransfer
					? 'Selectează membri din aceeași structură, cu drept de mutare.'
					: undefined}
				onclick={() => editSelection('transfer')}>Mută în unitate / grupă</button
			>
		{/if}
		{#if registry.admin}<button type="button" onclick={() => editSelection('structure')}
				>Schimbă structura</button
			>{/if}
		<ActionMenu
			label="Alte acțiuni pentru selecție"
			items={[
				{ label: labels.withdraw, action: () => editSelection('withdraw'), destructive: true },
				...(!inactive && chosenStructure.size === 1 && chosen.some((m) => m.status !== 'active')
					? [{ label: labels.reactivate, action: () => editSelection('reactivate') }]
					: [])
			]}
		/>
		<button
			type="button"
			onclick={() => {
				selected = [];
				editing = false;
			}}>Renunță la selecție</button
		>
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
	title={chosen.length === 1
		? `${labels[kind]} · ${chosen[0].name}`
		: `${labels[kind]} · ${chosen.length} membri`}
	description="Salvează modificarea pentru membrii selectați. Istoricul membrilor se păstrează."
>
	{#if editError}<p role="alert">{editError}</p>{/if}
	{#if chosen.length}
		<form method="POST" use:enhance={submitEdit} class="editor">
			<input type="hidden" name="action" value="bulk" /><input
				type="hidden"
				name="members"
				value={json(chosen.map((m) => ({ id: m.id, revision: m.revision })))}
			/><input type="hidden" name="changes" value={json(changes)} />
			{#if kind === 'grade'}<label
					>Clasa<input type="number" min="1" max="12" required bind:value={grade} /></label
				>{/if}
			{#if kind === 'transfer' || kind === 'reactivate'}
				<label
					>Unitate<select required bind:value={unitId} onchange={() => (groupId = '')}
						><option value="">Alege unitatea</option>{#each transferUnits as u (u.id)}<option
								value={u.id}>{u.name}</option
							>{/each}</select
					></label
				>
				{#if registry.units.some((u) => u.parentId === unitId && !u.archived)}<label
						>Grupă<select bind:value={groupId}
							><option value="">Colectiv comun / nerepartizat</option
							>{#each registry.units.filter((u) => u.parentId === unitId && !u.archived) as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					>{/if}
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
			<button type="submit" disabled={pending || !kind}
				>{pending ? 'Se salvează…' : 'Salvează modificarea'}</button
			><button type="button" onclick={() => (editing = false)}>Închide</button>
		</form>
	{/if}
</Modal>
<TableToolbar
	primary={!inactive ? searchContent : undefined}
	footer={!inactive ? filterSummary : undefined}
>
	{#snippet filters()}
		{#if inactive}<label
				>Caută în istoricul Orgo (membri.scout.ro)<input
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
				><label><input type="checkbox" bind:checked={showAge} />Vârsta</label>
				<label><input type="checkbox" bind:checked={showStatus} />Status</label>
			</div>
		</details>{/if}

	<button
		type="button"
		class="export-button"
		onclick={exportCsv}
		disabled={!sorted.length}
		title={`Exportă toți cei ${sorted.length} membri din rezultatele filtrate`}
		><Download size={16} aria-hidden="true" />Exportă CSV</button
	>

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
					{#if showAge}<th
							aria-sort={sort === 'age' ? (descending ? 'descending' : 'ascending') : 'none'}
							><button type="button" class="sort-button" onclick={() => sortBy('age')}
								>Vârsta ↕</button
							></th
						>{/if}

					{#if showStatus}<th
							aria-sort={sort === 'status' ? (descending ? 'descending' : 'ascending') : 'none'}
							><button type="button" class="sort-button" onclick={() => sortBy('status')}
								>Status ↕</button
							></th
						>{/if}
				{/if}{#if canSeeFees}<th>Cotizație curentă</th>{/if}<th
					><span class="sr-only">Acțiuni</span></th
				>
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
					{#if !inactive}{#if showUnit}<td>{memberPlacement(registry.units, m)}</td
							>{/if}{#if showGrade}<td>{hasSchoolGrade(m) ? (m.grade ?? '—') : '—'}</td
							>{/if}{#if showAge}<td>{m.age ?? '—'}</td>{/if}{#if showStatus}<td
								>{statusLabels[m.status] ?? 'De verificat'}
								{#if m.syncMessage}<small title={m.syncMessage}>{m.syncMessage}</small>{/if}</td
							>{/if}{/if}
					{#if canSeeFees}<td>
							{#if m.access?.fees}
								<button
									type="button"
									class="fee-status"
									onclick={() => loadFees(m)}
									aria-label={`Cotizații pentru ${m.name}`}
								>
									{#if m.feeSummary}
										{feeLabel(m)}
										<small
											>{m.feeSummary
												.period}{#if m.feeSummary.collectible && m.feeSummary.remainingBani > 0}
												· Rămas {money(m.feeSummary.remainingBani)}{/if}</small
										>
									{:else}Fără cotizație curentă{/if}
								</button>
							{:else}<span aria-label="Fără acces la cotizație">—</span>{/if}
						</td>{/if}
					<td
						>{#if rowActions(m).length}<ActionMenu
								label={`Acțiuni pentru ${m.name}`}
								items={rowActions(m)}
							/>{/if}</td
					>
				</tr>{:else}<tr
					><td
						colspan={2 +
							Number(canSeeFees) +
							Number(management && registry.canManage) +
							(inactive
								? 0
								: Number(showUnit) + Number(showGrade) + Number(showAge) + Number(showStatus))}
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
								><label>Data încasării<DateInput type="date" name="receivedOn" required /></label>
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
	.export-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		height: 40px;
		box-sizing: border-box;
		padding: 8px 12px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		white-space: nowrap;
		font-size: 13px;
		cursor: pointer;
	}
	.export-button:hover:not(:disabled) {
		background: var(--sc-canvas);
	}
	.export-button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}

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
	.fee-status {
		border: 0;
		background: transparent;
		padding: 0;
		text-align: left;
		font-variant-numeric: tabular-nums;
	}
	.fee-status:hover {
		text-decoration: underline;
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
	button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	form {
		display: grid;
		gap: 12px;
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
