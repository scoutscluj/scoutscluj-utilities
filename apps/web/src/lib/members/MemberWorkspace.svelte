<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { SubmitFunction } from '@sveltejs/kit';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	type Refresh = { state: string; message: string | null; lastSucceededAt: string | null };
	let refresh = $state<Refresh>({ state: 'idle', message: null, lastSucceededAt: null });
	let controller: AbortController | undefined;
	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	async function refreshRoster() {
		controller?.abort();
		if (pollTimer) clearTimeout(pollTimer);
		const current = new AbortController();
		controller = current;
		refresh = { ...refresh, state: 'running', message: null };
		try {
			const response = await fetch(resolve('/units/sync'), {
				method: 'POST',
				signal: current.signal
			});
			if (!response.ok) throw new Error('Refresh rejected');
			refresh = await response.json();
			await pollRefresh(current);
		} catch {
			if (!current.signal.aborted)
				refresh = {
					...refresh,
					state: 'failed',
					message: 'Actualizarea din Orgo (membri.scout.ro) a eșuat. Reîncearcă.'
				};
		}
	}
	async function pollRefresh(current: AbortController) {
		if (current.signal.aborted) return;
		if (refresh.state !== 'running') {
			await invalidateAll();
			return;
		}
		pollTimer = setTimeout(() => {
			void (async () => {
				try {
					const response = await fetch(resolve('/units/sync'), { signal: current.signal });
					if (!response.ok) throw new Error('Refresh rejected');
					refresh = await response.json();
					await pollRefresh(current);
				} catch {
					if (!current.signal.aborted)
						refresh = {
							...refresh,
							state: 'failed',
							message: 'Actualizarea din Orgo (membri.scout.ro) a eșuat. Reîncearcă.'
						};
				}
			})();
		}, 1000);
	}
	onMount(() => {
		void refreshRoster();
		const deliveryTimer = setInterval(() => {
			if (
				data.registry.members.some((m) =>
					['pending', 'running', 'uncertain'].includes(m.syncState ?? '')
				)
			)
				void invalidateAll().catch(() => undefined);
		}, 5000);
		return () => {
			clearInterval(deliveryTimer);
			controller?.abort();
			if (pollTimer) clearTimeout(pollTimer);
		};
	});
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from '../../routes/(app)/units/$types';
	import { branchLabels, roleLabels, syncLabels, unitName } from '$lib/members/types';
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import MemberTable from '$lib/members/MemberTable.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import { filterMembers } from './registry-table';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import type { Unit, Member } from '$lib/members/types';
	let pendingAction = $state('');
	let submissionError = $state('');
	let actionFailed = $state(false);
	let noticesOpen = $state(false);
	const submitWorkspace: SubmitFunction = ({ formData, cancel }) => {
		if (pendingAction) {
			cancel();
			return;
		}
		const operation = String(formData.get('action'));
		pendingAction = operation;
		submissionError = '';
		actionFailed = false;
		return async ({ result, update }) => {
			try {
				if (result.type === 'error') {
					actionFailed = true;
					submissionError = 'Salvarea nu a putut fi confirmată. Verifică conexiunea și reîncearcă.';
					return;
				}
				actionFailed = result.type === 'failure';
				await update({ reset: false });
				if (result.type === 'success') {
					if (typeof result.data?.message === 'string') toast.success(result.data.message);
					if (operation === 'assignment') responsibilityOpen = false;
					if (operation === 'end' && responsibilityMember)
						responsibilityMember = data.registry.members.find(
							(m) => m.id === responsibilityMember?.id
						);
					if (operation === 'unit') subunitOpen = false;
					if (operation === 'archive') archiveOpen = false;
					if (operation === 'progression') progressionOpen = false;
				}
			} finally {
				pendingAction = '';
			}
		};
	};
	let responsibilityOpen = $state(false);
	let responsibilityMember = $state<Member>();
	let responsibilityRole = $state('helper');
	let responsibilityUnit = $state('');
	let archiveUnit = $state<Unit>();
	let archiveOpen = $state(false);
	let subunitOpen = $state(false);
	let subunitEdit = $state<Unit>();
	let subunitParent = $state('');
	let {
		data,
		form,
		management = true
	}: { data: PageData; form: ActionData; management?: boolean } = $props();
	const activeSection = $derived(
		form && 'section' in form && typeof form.section === 'string' ? form.section : ''
	);
	let createOpen = $state(false),
		structureOpen = $state(false),
		progressionOpen = $state(false),
		orgoOpen = $state(false);
	$effect(() => {
		if (activeSection === 'create') createOpen = true;
		if (['unit', 'archive'].includes(activeSection)) structureOpen = true;
		if (activeSection === 'unit' && form?.message && !form.message.includes('adăugată'))
			subunitOpen = true;
		if (activeSection === 'progression') progressionOpen = true;
		if (['retry', 'import'].includes(activeSection)) orgoOpen = true;
	});
	let structureFilter = $state<string[]>(
		untrack(() =>
			!data.registry.admin && data.registry.homeStructureId ? [data.registry.homeStructureId] : []
		)
	);
	let categoryFilter = $state<string[]>([]);
	let feeFilter = $state<string[]>([]);
	let votingFilter = $state<string[]>([]);
	let newStructure = $state('');
	$effect(() => {
		if (!newStructure)
			newStructure =
				data.registry.manageableStructureIds?.[0] ?? data.registry.structures?.[0]?.id ?? 'cluj';
	});
	const structures = $derived(data.registry.structures ?? []);
	let search = $state(''),
		unitFilter = $state<string[]>([]),
		status = $state<string[]>(['active']);
	let newMemberUnit = $state(''),
		newMemberKind = $state('beneficiary');
	const units = $derived(data.registry.units.filter((u) => !u.parentId && !u.archived));
	const createUnits = $derived(
		units.filter(
			(u) =>
				u.canCreateMember ||
				data.registry.units.some((g) => g.parentId === u.id && g.canCreateMember)
		)
	);
	const visible = $derived(
		filterMembers(data.registry.members, {
			search,
			structures: structureFilter,
			categories: categoryFilter,
			units: unitFilter,
			statuses: status,
			fees: feeFilter,
			voting: votingFilter
		})
	);
	const subunitOptions = $derived(
		data.registry.units
			.filter(
				(unit) =>
					unit.parentId &&
					!unit.archived &&
					(!categoryFilter.length || categoryFilter.includes(unit.branch)) &&
					(!structureFilter.length || structureFilter.includes(unit.structureId ?? 'cluj'))
			)
			.map((unit) => ({
				value: unit.id,
				label: `${structures.find((structure) => structure.id === (unit.structureId ?? 'cluj'))?.name ?? ''} · ${unit.name}`
			}))
	);
	type FilterKey = 'structure' | 'category' | 'unit' | 'status' | 'fee' | 'voting';
	const filterGroups = $derived([
		{
			key: 'structure' as FilterKey,
			label: 'Structură',
			placeholder: 'Toate',
			values: structureFilter,
			options: structures.map((structure) => ({ value: structure.id, label: structure.name }))
		},
		{
			key: 'category' as FilterKey,
			label: 'Categorie',
			placeholder: 'Toate',
			values: categoryFilter,
			options: [
				...Object.entries(branchLabels).map(([value, label]) => ({ value, label })),
				{ value: 'review', label: 'De verificat' }
			]
		},
		{
			key: 'unit' as FilterKey,
			label: 'Subunitate',
			placeholder: 'Toate',
			values: unitFilter,
			options: [{ value: 'unassigned', label: 'Nerepartizat' }, ...subunitOptions]
		},
		{
			key: 'status' as FilterKey,
			label: 'Status',
			placeholder: 'Toate',
			values: status,
			options: [
				{ value: 'active', label: 'Activ' },
				{ value: 'withdrawn', label: 'Retras din activitate' },
				{ value: 'suspended', label: 'Suspendat' },
				{ value: 'inactive', label: 'Inactiv' },
				{ value: 'review', label: 'Status de verificat' }
			]
		},
		...(data.registry.members.some((member) => member.access?.fees)
			? [
					{
						key: 'fee' as FilterKey,
						label: 'Cotizație',
						placeholder: 'Toate',
						values: feeFilter,
						options: [
							{ value: 'paid', label: 'Achitată', description: 'Achitată integral' },
							{
								value: 'partial',
								label: 'Parțial achitată',
								description: 'Plată înregistrată, cu sumă rămasă'
							},
							{ value: 'unpaid', label: 'Neachitată', description: 'Nicio plată înregistrată' },
							{
								value: 'missing',
								label: 'Fără cotizație',
								description: 'Fără cotizație pentru perioada curentă'
							},
							{ value: 'unknown', label: 'Fără acces', description: 'Cotizație indisponibilă' }
						]
					}
				]
			: []),
		{
			key: 'voting' as FilterKey,
			label: 'Drept de vot',
			placeholder: 'Toți',
			values: votingFilter,
			options: [
				{ value: 'eligible', label: 'Cu drept de vot', description: '16 ani și peste' },
				{ value: 'ineligible', label: 'Fără drept de vot', description: 'Sub 16 ani' },
				{
					value: 'unknown',
					label: 'Vârstă indisponibilă',
					description: 'Necunoscută sau fără acces'
				}
			]
		}
	]);
	const activeFilters = $derived(
		filterGroups.flatMap((group) =>
			group.values.map((value) => ({
				key: group.key,
				value,
				label: `${group.label}: ${group.options.find((option) => option.value === value)?.label ?? value}`
			}))
		)
	);
	function setFilter(key: FilterKey, values: string[]) {
		switch (key) {
			case 'structure':
				structureFilter = values;
				unitFilter = [];
				break;
			case 'category':
				categoryFilter = values;
				unitFilter = [];
				break;
			case 'unit':
				unitFilter = values;
				break;
			case 'status':
				status = values;
				break;
			case 'fee':
				feeFilter = values;
				break;
			case 'voting':
				votingFilter = values;
				break;
		}
	}
	function clearFilters() {
		search = '';
		structureFilter = [];
		categoryFilter = [];
		unitFilter = [];
		status = [];
		feeFilter = [];
		votingFilter = [];
	}
	const feeMenu = $derived(form && 'feeMenu' in form ? form.feeMenu : undefined);
	const name = (id: string | null) => unitName(data.registry.units, id);
	let unitSearch = $state(''),
		unitPageSize = $state(25),
		unitPage = $state(0);
	const unitRows = $derived(
		data.registry.units.filter(
			(u) =>
				!u.archived &&
				(!structureFilter.length || structureFilter.includes(u.structureId ?? 'cluj')) &&
				matchesSearch(`${u.name} ${name(u.parentId)}`, unitSearch)
		)
	);
	const unitEffectiveSize = $derived(unitPageSize || Math.max(1, unitRows.length));
	const unitCurrentPage = $derived(
		Math.min(unitPage, Math.max(0, Math.ceil(unitRows.length / unitEffectiveSize) - 1))
	);
</script>

<svelte:head><title>Membri și unități · Scouts Cluj</title></svelte:head>
<div class="workspace">
	<header>
		<h1>Membri și unități</h1>
		<div class="workspace-actions">
			<button
				type="button"
				class="secondary"
				aria-haspopup="dialog"
				onclick={() => (structureOpen = true)}>Unități și subunități</button
			>
			{#if management && data.registry.canManage}<button
					type="button"
					aria-haspopup="dialog"
					onclick={() => (createOpen = true)}
					><Plus size={18} aria-hidden="true" />Adaugă membru</button
				>{/if}
			{#if data.registry.admin}<ActionMenu
					label="Mai multe acțiuni pentru registru"
					items={[
						{ label: 'Actualizarea anuală a membrilor', action: () => (progressionOpen = true) },
						{
							label: 'Verifică apartenențele',
							action: () => {
								window.location.href = resolve('/units/structures');
							}
						},
						{
							label: 'Legătura cu Orgo',
							action: () => {
								orgoOpen = true;
							}
						}
					]}
				/>{/if}
		</div>
	</header>
	{#if form?.message && !(activeSection === 'bulk' && 'success' in form && form.success)}<FormFeedback
			message={form.message}
			kind={actionFailed ? 'error' : 'success'}
		/>{/if}
	<div class="registry-summary" aria-label="Rezumat membri">
		<span
			><strong>{data.registry.members.filter((m) => m.status === 'active').length}</strong> membri activi</span
		>
		<span><strong>{units.length}</strong> unități</span>
	</div>
	{#if data.registry.notices.length}<button
			class="secondary transfer-history"
			onclick={() => (noticesOpen = true)}
			>Istoric transferuri ({data.registry.notices.length})</button
		>{/if}
	<Modal
		bind:open={noticesOpen}
		title="Istoric transferuri"
		description="Ultimele mutări ale membrilor către alte unități. Aceste informații nu necesită confirmare."
	>
		{#each data.registry.notices as notice (notice.id)}<p>
				<a href={resolve(`/units/${notice.memberId}`)}
					>{data.registry.members.find((m) => m.id === notice.memberId)?.name ??
						'Membru transferat'}</a
				>
				· {name(notice.unitId)} · {new Date(notice.createdAt).toLocaleDateString('ro-RO')}
			</p>{/each}
	</Modal>
	<div class="notice" role="status" aria-live="polite">
		{#if refresh.state === 'running'}Se actualizează din Orgo (membri.scout.ro)…
		{:else if refresh.state === 'failed'}{refresh.message ?? 'Actualizarea a eșuat.'}
		{:else if refresh.state === 'succeeded'}Date actualizate din Orgo (membri.scout.ro).
		{:else}Se pregătește actualizarea din Orgo (membri.scout.ro).{/if}
		{#if refresh.lastSucceededAt}<small
				>Ultima actualizare: {new Date(refresh.lastSucceededAt).toLocaleString('ro-RO')}</small
			>{/if}
		{#if refresh.state !== 'running'}<button
				type="button"
				class="secondary"
				onclick={() => void refreshRoster()}
				>{refresh.state === 'failed' ? 'Reîncearcă actualizarea' : 'Actualizează din Orgo'}</button
			>{/if}
	</div>
	<section class="registry-panel" aria-label="Registrul membrilor">
		{#snippet registrySearch()}
			<label class="registry-search">
				<span>Caută membru</span>
				<span class="search-field"
					><Search size={18} aria-hidden="true" /><input
						type="search"
						bind:value={search}
						placeholder="Caută după nume…"
					/></span
				>
			</label>
		{/snippet}
		{#snippet registryFilters()}
			<div class="registry-filter-grid" style:--filter-columns={filterGroups.length}>
				{#each filterGroups as group (group.key)}
					<MultiSelectFilter
						label={group.label}
						placeholder={group.placeholder}
						options={group.options}
						values={group.values}
						onchange={(values) => setFilter(group.key, values)}
					/>
				{/each}
			</div>
		{/snippet}
		{#snippet registryFilterSummary()}
			<div class="filter-summary">
				<span class="result-count" role="status"
					><strong>{visible.length}</strong>&nbsp;{visible.length === 1
						? 'membru'
						: 'membri'}{#if visible.length !== data.registry.members.length}<span
							>&nbsp;din {data.registry.members.length}</span
						>{/if}</span
				>
				<div class="active-filters" role="group" aria-label="Filtre aplicate">
					{#if search}<button
							type="button"
							class="filter-chip"
							aria-label="Elimină căutarea"
							onclick={() => (search = '')}
							><span>Căutare: {search}</span><X size={13} aria-hidden="true" /></button
						>{/if}
					{#each activeFilters as filter (`${filter.key}-${filter.value}`)}
						<button
							type="button"
							class="filter-chip"
							aria-label={`Elimină filtrul ${filter.label}`}
							onclick={() =>
								setFilter(
									filter.key,
									filterGroups
										.find((group) => group.key === filter.key)!
										.values.filter((value) => value !== filter.value)
								)}><span>{filter.label}</span><X size={13} aria-hidden="true" /></button
						>
					{/each}
				</div>
				{#if activeFilters.length || search}<button
						type="button"
						class="reset-filters"
						onclick={clearFilters}
						><RotateCcw size={14} aria-hidden="true" />Resetează filtrele</button
					>{/if}
			</div>
		{/snippet}
		<MemberTable
			members={visible}
			{management}
			loadedTotal={data.registry.members.length}
			filterContent={registryFilters}
			searchContent={registrySearch}
			filterSummary={registryFilterSummary}
			searchQuery={search}
			onResponsibilities={(member) => {
				responsibilityMember = member;
				responsibilityRole = data.registry.delegableRoles?.[0] ?? 'helper';
				responsibilityUnit = '';
				submissionError = '';
				actionFailed = false;
				responsibilityOpen = true;
			}}
			registry={data.registry}
			message={form?.message}
			{feeMenu}
		/>
	</section>
	{#if management && data.registry.canManage}<Modal
			bind:open={createOpen}
			title="Adaugă membru"
			description="Înscrie un beneficiar sau un voluntar adult în structura potrivită."
		>
			<form method="POST" use:enhance={submitWorkspace} class="grid">
				<input type="hidden" name="action" value="create" /><label
					>Structură<select
						name="structureId"
						bind:value={newStructure}
						onchange={() => (newMemberUnit = '')}
						>{#each structures as st (st.id)}<option value={st.id}>{st.name}</option>{/each}</select
					></label
				><label
					>Tip membru<select
						name="kind"
						bind:value={newMemberKind}
						onchange={() => (newMemberUnit = '')}
						><option value="beneficiary">Beneficiar</option><option value="adult"
							>Voluntar adult</option
						></select
					></label
				><label>Nume complet<input name="name" required maxlength="255" /></label><label
					>Data nașterii<DateInput type="date" name="birthDate" /></label
				>{#if newMemberKind === 'beneficiary'}<label
						>Clasa<input type="number" name="grade" min="1" max="12" /></label
					>{/if}<label
					>Unitate<select name="unitId" bind:value={newMemberUnit} required
						><option value="">Alege categoria principală</option
						>{#each createUnits.filter((u) => (u.structureId ?? 'cluj') === newStructure && (newMemberKind === 'adult' ? ['lideri', 'voluntari', 'scouteri'].includes(u.branch) : !['lideri', 'voluntari', 'scouteri'].includes(u.branch))) as u (u.id)}<option
								value={u.id}>{u.name}</option
							>{/each}</select
					></label
				><label
					>Grupă<select
						name="groupId"
						disabled={!newMemberUnit}
						required={!!newMemberUnit &&
							!units.find((u) => u.id === newMemberUnit)?.canCreateMember}
						><option value="">Colectiv comun / nerepartizat</option
						>{#each data.registry.units.filter((u) => u.parentId === newMemberUnit && !u.archived && u.canCreateMember) as u (u.id)}<option
								value={u.id}>{name(u.parentId)} / {u.name}</option
							>{/each}</select
					></label
				><button type="submit">Adaugă membru</button>
			</form>
			<p class="hint">Alege unitatea și, dacă este cazul, grupa în care va fi înscris membrul.</p>
		</Modal>{/if}
	{#snippet unitFilters()}<label
			>Caută unitate sau subunitate<input
				type="search"
				bind:value={unitSearch}
				oninput={() => (unitPage = 0)}
				placeholder="Nume"
			/></label
		>{/snippet}
	<Modal
		bind:open={structureOpen}
		title="Unități și subunități"
		description="Caută unitățile și gestionează subunitățile din structura selectată."
	>
		<TableToolbar filters={unitFilters}></TableToolbar>
		<div class="unit-table">
			<table use:highlightSearch={unitSearch}>
				<thead
					><tr
						><th>Structură</th><th>Unitate</th><th>Subunitate</th><th
							><span class="sr-only">Acțiuni</span></th
						></tr
					></thead
				><tbody>
					{#each unitRows.slice(unitCurrentPage * unitEffectiveSize, (unitCurrentPage + 1) * unitEffectiveSize) as u (u.id)}<tr
						>
							<td>{structures.find((st) => st.id === (u.structureId ?? 'cluj'))?.name}</td>
							<td>{u.parentId ? name(u.parentId) : u.name}</td><td>{u.parentId ? u.name : '—'}</td>
							<td
								>{#if u.canManage}
									{#if !u.parentId}<button
											type="button"
											class="sc-icon-button"
											aria-label={`Adaugă subunitate în ${u.name}`}
											onclick={() => {
												subunitEdit = undefined;
												subunitParent = u.id;
												subunitOpen = true;
											}}><Plus size={18} /></button
										>
									{:else}<ActionMenu
											label={`Acțiuni pentru ${u.name}`}
											items={[
												{
													label: 'Redenumește',
													action: () => {
														subunitEdit = u;
														subunitParent = u.parentId ?? '';
														subunitOpen = true;
													}
												},
												{
													label: 'Arhivează',
													destructive: true,
													action: () => {
														archiveUnit = u;
														archiveOpen = true;
													}
												}
											]}
										/>{/if}
								{/if}</td
							>
						</tr>{/each}
				</tbody>
			</table>
		</div>
		<TablePagination
			bind:page={unitPage}
			bind:pageSize={unitPageSize}
			total={unitRows.length}
			loadedTotal={data.registry.units.filter((u) => !u.archived).length}
		/>
	</Modal>
	<Modal
		bind:open={subunitOpen}
		title={subunitEdit ? 'Redenumește subunitatea' : 'Adaugă subunitate'}
		description="Unitățile sunt fixe. Subunitățile se gestionează în cadrul lor."
	>
		<form method="POST" use:enhance={submitWorkspace} class="grid">
			<input type="hidden" name="action" value="unit" />
			{#if subunitEdit}<input type="hidden" name="id" value={subunitEdit.id} />{/if}
			<input type="hidden" name="parentId" value={subunitParent} />
			<label
				>Nume<input name="name" value={subunitEdit?.name ?? ''} required maxlength="255" /></label
			>
			<button type="submit">Salvează subunitatea</button>
		</form>
	</Modal>
	{#if management && !data.registry.admin && data.registry.transitions.some((t) => t.state === 'review')}<section
		>
			<h2>Treceri de ramură de verificat</h2>
			{#each data.registry.transitions.filter((t) => t.state === 'review') as t (t.id)}<p>
					<a href={resolve(`/units/${t.memberId}`)}
						>{data.registry.members.find((m) => m.id === t.memberId)?.name ?? 'Verifică membrul'}</a
					>
					· {t.message}
				</p>{/each}
		</section>{/if}
	{#if management && data.registry.admin}
		<Modal
			bind:open={progressionOpen}
			title="Actualizarea anuală a membrilor"
			description="Verifică repartizările înainte de activarea actualizării anuale."
		>
			<p>
				Clasele și ramurile avansează la 1 septembrie. Grupele stabile își păstrează identitatea și
				adulții responsabili. Verifică clasele și repartizările inițiale înainte de activare.
			</p>
			<form method="POST" use:enhance={submitWorkspace}>
				<input type="hidden" name="action" value="progression" /><label class="check"
					><input type="checkbox" name="enabled" checked={data.registry.progressionEnabled} />Datele
					inițiale sunt verificate; activează actualizarea automată</label
				><button>Salvează</button>
			</form>
			{#each data.registry.transitions.filter((t) => t.state === 'review') as t (t.id)}<p
					class="notice"
				>
					<a href={resolve(`/units/${t.memberId}`)}>Verifică membrul</a> · {t.year}: {t.message}
				</p>{/each}
		</Modal>
		<Modal
			bind:open={orgoOpen}
			title="Legătura cu Orgo"
			description="Situația sincronizărilor cu Orgo (membri.scout.ro) și acces la importul registrului."
		>
			<a href={resolve('/units/orgo')}>Verifică accesul și previzualizează importul</a>
			<p class="hint">
				Modificările locale sunt păstrate chiar dacă Orgo (membri.scout.ro) nu le poate confirma.
			</p>
			{#each data.registry.sync.filter((s) => !['synced', 'superseded', 'local-only'].includes(s.state)) as s (s.id)}<div
					class="sync"
				>
					<p>
						<a href={resolve(`/units/${s.memberId}`)}>Fișa membrului</a> · {syncLabels[s.state] ??
							s.state}<small>{s.message}</small>
					</p>
					<form method="POST" use:enhance={submitWorkspace}>
						<input type="hidden" name="action" value="retry" /><input
							type="hidden"
							name="id"
							value={s.id}
						/><button class="secondary">Reverifică</button>
					</form>
				</div>{:else}<p>Nicio operațiune în așteptare.</p>{/each}
		</Modal>{/if}
</div>

<Modal
	bind:open={responsibilityOpen}
	title={`Responsabilități · ${responsibilityMember?.name ?? ''}`}
	description="Alege rolul, unitatea și drepturile de acces. Categoria principală a membrului nu se schimbă."
>
	{#if responsibilityMember?.responsibilities?.length}<h2 class="current-heading">
			Responsabilități curente
		</h2>{/if}
	{#each responsibilityMember?.responsibilities ?? [] as assignment (assignment.id)}
		<form method="POST" use:enhance={submitWorkspace} class="responsibility-row">
			<input type="hidden" name="action" value="end" /><input
				type="hidden"
				name="targetId"
				value={responsibilityMember?.id ?? ''}
			/><input type="hidden" name="assignmentId" value={assignment.id} />
			<span>{roleLabels[assignment.role]} · {name(assignment.groupId ?? assignment.unitId)}</span>
			<button type="submit" class="secondary" disabled={!!pendingAction}
				>{pendingAction === 'end' ? 'Se încheie…' : 'Încheie responsabilitatea'}</button
			>
		</form>
	{/each}

	<form
		method="POST"
		use:enhance={submitWorkspace}
		class="responsibility-form"
		aria-busy={pendingAction === 'assignment'}
	>
		<input type="hidden" name="action" value="assignment" />
		<input type="hidden" name="targetId" value={responsibilityMember?.id ?? ''} />
		<input type="hidden" name="structureId" value={responsibilityMember?.structureId ?? 'cluj'} />
		<fieldset disabled={!!pendingAction} class="assignment-fields">
			<legend>Responsabilitate și arie</legend>
			<label
				>Responsabilitate<select
					name="role"
					bind:value={responsibilityRole}
					onchange={() => (responsibilityUnit = '')}
				>
					{#each (data.registry.delegableRoles ?? []).filter((role) => role !== 'council' || responsibilityMember?.structureId !== 'floresti') as role (role)}<option
							value={role}>{roleLabels[role]}</option
						>{/each}
				</select></label
			>
			{#if !['council', 'structure_admin'].includes(responsibilityRole)}
				<label
					>Unitate<select name="unitId" bind:value={responsibilityUnit} required
						><option value="">Alege unitatea</option>
						{#each units.filter((u) => u.delegateRoles?.includes(responsibilityRole) && (u.structureId ?? 'cluj') === (responsibilityMember?.structureId ?? 'cluj')) as u (u.id)}<option
								value={u.id}
								>{structures.find((s) => s.id === (u.structureId ?? 'cluj'))?.name} · {u.name}</option
							>{/each}
					</select></label
				>
				{#if ['leader', 'helper'].includes(responsibilityRole) && data.registry.units.some((u) => u.parentId === responsibilityUnit && !u.archived)}{#key responsibilityUnit}<label
							>Subunitate<select name="groupId" required
								><option value="">Alege subunitatea</option
								>{#each data.registry.units.filter((u) => u.parentId === responsibilityUnit && !u.archived) as u (u.id)}<option
										value={u.id}>{u.name}</option
									>{/each}</select
							></label
						>{/key}{/if}
			{/if}
			{#if ['leader', 'chief'].includes(responsibilityRole)}<label
					>Data promisiunii de lider (opțional)<DateInput type="date" name="promiseDate" /></label
				>{/if}
		</fieldset>
		{#if responsibilityRole === 'helper'}
			<fieldset disabled={!!pendingAction} class="permission-fields">
				<legend>Drepturi pentru unitatea selectată</legend>
				<label class="check"><input type="checkbox" name="canEdit" />Poate modifica membrii</label>
				<label class="check"
					><input type="checkbox" name="canSeeFees" />Poate vedea cotizațiile</label
				>
				<label class="check"
					><input type="checkbox" name="canSeeSensitive" />Poate vedea date medicale și notițe</label
				>
			</fieldset>{/if}
		{#if submissionError}<FormFeedback
				message={submissionError}
				kind="error"
			/>{:else if actionFailed && form?.message && ['assignment', 'end'].includes(activeSection)}<FormFeedback
				message={form.message}
				kind="error"
			/>{/if}
		<div class="dialog-actions">
			<button
				type="button"
				class="secondary"
				disabled={!!pendingAction}
				onclick={() => (responsibilityOpen = false)}>Anulează</button
			><button type="submit" disabled={!!pendingAction}
				>{#if pendingAction === 'assignment'}<LoaderCircle size={16} class="saving-spinner" /> Se salvează…{:else}Salvează
					responsabilitatea{/if}</button
			>
		</div>
	</form>
</Modal>

<Modal
	bind:open={archiveOpen}
	title={`Arhivează ${archiveUnit?.name ?? 'unitatea'}`}
	description="Unitatea va fi arhivată. Istoricul este păstrat. Verifică repartizările înainte de a continua."
>
	<form method="POST" use:enhance={submitWorkspace}>
		<input type="hidden" name="action" value="archive" /><input
			type="hidden"
			name="id"
			value={archiveUnit?.id ?? ''}
		/>
		<button type="button" onclick={() => (archiveOpen = false)}>Anulează</button>
		<button type="submit">Confirmă arhivarea</button>
	</form>
</Modal>

<style>
	.registry-panel {
		container-type: inline-size;
	}
	.registry-search {
		display: grid;
		gap: 6px;
		max-width: 440px;
		font-size: 12px;
		color: var(--sc-muted);
	}
	.search-field {
		position: relative;
		display: flex;
		align-items: center;
	}
	.search-field :global(svg) {
		position: absolute;
		left: 12px;
		pointer-events: none;
		color: var(--sc-muted);
	}
	:global(.sc-table-toolbar) .registry-search input {
		padding-left: 38px;
		border-radius: 8px;
		background: var(--sc-canvas);
		transition:
			border-color 150ms,
			background-color 150ms;
	}
	:global(.sc-table-toolbar) .registry-search input:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
		background: var(--sc-surface);
	}
	.registry-filter-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	.filter-summary {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px 16px;
		padding-top: 12px;
		border-top: 1px solid var(--sc-border);
	}
	.result-count {
		flex-shrink: 0;
		font-size: 13px;
		color: var(--sc-ink);
		font-variant-numeric: tabular-nums;
	}
	.result-count > span {
		color: var(--sc-muted);
	}
	.active-filters {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		gap: 6px;
	}
	.active-filters:empty {
		display: none;
	}
	button.filter-chip {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 4px 8px;
		border: 1px solid var(--sc-border);
		border-radius: 6px;
		background: var(--sc-canvas);
		color: var(--sc-ink);
		font-size: 12px;
		line-height: 18px;
		font-weight: 400;
		transition:
			background-color 150ms,
			border-color 150ms;
	}
	.filter-chip > span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.filter-chip :global(svg) {
		flex-shrink: 0;
		color: var(--sc-muted);
	}
	button.filter-chip:hover {
		background: var(--sc-accent-soft);
		border-color: var(--sc-accent);
	}
	button.reset-filters {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--sc-muted);
		font-size: 12px;
		white-space: nowrap;
	}
	button.reset-filters:hover {
		color: var(--sc-accent);
	}
	button.filter-chip:focus-visible,
	button.reset-filters:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	@container (max-width: 560px) {
		.filter-summary {
			grid-template-columns: 1fr auto;
			gap: 10px;
		}
		.active-filters {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		button.reset-filters {
			grid-column: 2;
			grid-row: 1;
		}
		button.filter-chip {
			min-height: 32px;
		}
	}
	@container (min-width: 680px) {
		.registry-filter-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@container (min-width: 1080px) {
		.registry-filter-grid {
			grid-template-columns: repeat(var(--filter-columns, 6), minmax(0, 1fr));
		}
	}
	@container (max-width: 300px) {
		.registry-filter-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		button.filter-chip,
		:global(.sc-table-toolbar) .registry-search input {
			transition: none;
		}
	}

	.current-heading {
		font-size: 14px;
		font-weight: 600;
		margin: 0 0 8px;
	}
	.transfer-history {
		justify-self: start;
		font-size: 13px;
	}
	.responsibility-form {
		gap: 20px;
	}
	.assignment-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.assignment-fields legend,
	.permission-fields legend {
		padding: 0;
		margin-bottom: 12px;
		font-size: 14px;
		font-weight: 600;
	}
	.permission-fields {
		display: grid;
		gap: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		padding: 12px 16px 16px;
		min-width: 0;
	}
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--sc-border);
	}
	.dialog-actions button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	button:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	:global(.saving-spinner) {
		animation: saving-spin 1s linear infinite;
	}
	@keyframes saving-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.saving-spinner) {
			animation: none;
		}
	}
	@media (max-width: 520px) {
		.assignment-fields {
			grid-template-columns: minmax(0, 1fr);
		}
		.dialog-actions {
			flex-wrap: wrap;
		}
	}

	.workspace {
		display: grid;
		gap: 16px;
		min-width: 0;
		max-width: 1400px;
		margin: auto;
		color: var(--sc-ink);
	}
	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	h1 {
		font-size: 26px;
		margin: 0;
	}
	.workspace-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
	}
	.workspace-actions > button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		white-space: nowrap;
	}
	.registry-summary {
		display: flex;
		gap: 24px;
		color: var(--sc-muted);
		font-size: 13px;
	}
	.registry-summary strong {
		color: var(--sc-ink);
		font-weight: 600;
	}
	section {
		min-width: 0;
		padding: 16px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	section h2 {
		margin-top: 0;
		font-size: 18px;
	}
	label {
		display: grid;
		gap: 6px;
		font-size: 13px;
	}
	input,
	select,
	button {
		font: inherit;
		padding: 8px 10px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		min-width: 0;
	}
	button {
		cursor: pointer;
		background: var(--sc-accent);
		color: white;
		font-weight: 500;
	}
	.secondary {
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
		align-items: end;
	}
	.hint {
		font-size: 13px;
		color: var(--sc-muted);
	}
	a {
		color: var(--sc-accent);
	}
	.notice {
		padding: 12px;
		border-radius: 7px;
		background: var(--sc-success-soft);
	}
	.responsibility-row,
	.sync {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid var(--sc-border);
	}
	.unit-table {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	th,
	td {
		text-align: left;
		padding: 10px 12px;
		border-bottom: 1px solid var(--sc-border);
	}
	th {
		font-weight: 500;
		color: var(--sc-muted);
		background: var(--sc-canvas);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	@media (max-width: 640px) {
		h1 {
			font-size: 24px;
		}
		section {
			padding: 12px;
		}
	}
</style>
