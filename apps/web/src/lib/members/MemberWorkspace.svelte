<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { onMount } from 'svelte';
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
					message: 'Actualizarea din Orgo a eșuat. Reîncearcă.'
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
							message: 'Actualizarea din Orgo a eșuat. Reîncearcă.'
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
	import Modal from '$lib/components/ui/Modal.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import type { Unit, Member } from '$lib/members/types';
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
		if (activeSection === 'assignment' && responsibilityMember) responsibilityOpen = true;
		if (['unit', 'archive'].includes(activeSection)) structureOpen = true;
		if (activeSection === 'unit' && form?.message && !form.message.includes('adăugată'))
			subunitOpen = true;
		if (activeSection === 'progression') progressionOpen = true;
		if (['retry', 'import'].includes(activeSection)) orgoOpen = true;
	});
	let structureFilter = $state('');
	let categoryFilter = $state('');
	$effect(() => {
		if (!data.registry.admin && data.registry.homeStructureId)
			structureFilter = data.registry.homeStructureId;
	});
	let newStructure = $state('');
	$effect(() => {
		if (!newStructure)
			newStructure =
				data.registry.manageableStructureIds?.[0] ?? data.registry.structures?.[0]?.id ?? 'cluj';
	});
	const structures = $derived(data.registry.structures ?? []);
	let search = $state(''),
		unitFilter = $state(''),
		status = $state('active');
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
		data.registry.members.filter(
			(m) =>
				(!structureFilter || (m.structureId ?? 'cluj') === structureFilter) &&
				(!search || matchesSearch(m.name, search)) &&
				(!categoryFilter ||
					(categoryFilter === 'review' ? m.categoryReview : m.category === categoryFilter)) &&
				(!unitFilter ||
					(unitFilter === 'unassigned'
						? !m.groupId
						: m.unitId === unitFilter ||
							m.groupId === unitFilter ||
							m.responsibilityUnitIds?.includes(unitFilter) ||
							m.responsibilityGroupIds?.includes(unitFilter))) &&
				(!status || m.status === status)
		)
	);
	const bulkPreview = $derived(form && 'bulkPreview' in form ? form.bulkPreview : undefined);
	const feeMenu = $derived(form && 'feeMenu' in form ? form.feeMenu : undefined);
	const name = (id: string | null) => unitName(data.registry.units, id);
	let unitSearch = $state(''),
		unitPageSize = $state(25),
		unitPage = $state(0);
	const unitRows = $derived(
		data.registry.units.filter(
			(u) =>
				!u.archived &&
				(!structureFilter || (u.structureId ?? 'cluj') === structureFilter) &&
				matchesSearch(`${u.name} ${name(u.parentId)}`, unitSearch)
		)
	);
	const unitEffectiveSize = $derived(unitPageSize || Math.max(1, unitRows.length));
	const unitCurrentPage = $derived(
		Math.min(unitPage, Math.max(0, Math.ceil(unitRows.length / unitEffectiveSize) - 1))
	);
</script>

<svelte:head
	><title>{management ? 'Membri și unități · Admin' : 'Unități și membri'} · Scouts Cluj</title
	></svelte:head
>
<div class="workspace">
	<header>
		<h1>{management ? 'Membri și unități' : 'Unități și membri'}</h1>
		<div class="workspace-actions">
			<button
				type="button"
				class="secondary"
				aria-pressed={structureOpen}
				onclick={() => (structureOpen = !structureOpen)}>Unități și subunități</button
			>
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
								window.location.href = resolve('/units/orgo');
							}
						}
					]}
				/>{/if}
		</div>
	</header>
	{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
	<div class="registry-summary" aria-label="Rezumat membri">
		<span
			><strong>{data.registry.members.filter((m) => m.status === 'active').length}</strong> membri activi</span
		>
		<span><strong>{units.length}</strong> unități</span>
	</div>
	{#if data.registry.notices.length}<section>
			<h2>Membri primiți în unitate</h2>
			{#each data.registry.notices as notice (notice.id)}<p>
					<a href={resolve(`/units/${notice.memberId}`)}
						>{data.registry.members.find((m) => m.id === notice.memberId)?.name ??
							'Membru transferat'}</a
					>
					· {name(notice.unitId)} · {new Date(notice.createdAt).toLocaleDateString('ro-RO')}
				</p>{/each}
		</section>{/if}
	<div class="notice" role="status" aria-live="polite">
		{#if refresh.state === 'running'}Se actualizează din Orgo…
		{:else if refresh.state === 'failed'}{refresh.message ?? 'Actualizarea a eșuat.'}
		{:else if refresh.state === 'succeeded'}Date actualizate din Orgo.
		{:else}Se pregătește actualizarea din Orgo.{/if}
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
		{#snippet registryFilters()}
			<label>Caută membru<input type="search" bind:value={search} placeholder="Nume" /></label>
			<label
				>Structură<select bind:value={structureFilter} onchange={() => (unitFilter = '')}
					><option value="">Toate structurile</option>{#each structures as st (st.id)}<option
							value={st.id}>{st.name}</option
						>{/each}</select
				></label
			>

			<label
				>Categorie<select bind:value={categoryFilter}
					><option value="">Toate categoriile</option>
					{#each Object.entries(branchLabels) as [key, label] (key)}<option value={key}
							>{label}</option
						>{/each}
					<option value="review">De verificat</option></select
				></label
			><label
				>Subunitate<select bind:value={unitFilter}
					><option value="">Toate</option><option value="unassigned">Nerepartizat</option
					>{#each data.registry.units.filter((u) => u.parentId && !u.archived && (!categoryFilter || u.branch === categoryFilter) && (!structureFilter || (u.structureId ?? 'cluj') === structureFilter)) as u (u.id)}<option
							value={u.id}>{u.parentId ? '↳ ' : ''}{u.name}</option
						>{/each}</select
				></label
			><label
				>Status<select bind:value={status}
					><option value="active">Activ</option><option value="withdrawn"
						>Retras din activitate</option
					><option value="suspended">Suspendat</option><option value="inactive">Inactiv</option
					><option value="review">Status de verificat</option><option value="">Toate</option
					></select
				></label
			>
		{/snippet}
		{#snippet registryControls()}
			{#if management && data.registry.canManage}<button
					type="button"
					class="sc-icon-button"
					aria-label="Adaugă membru"
					title="Adaugă membru"
					onclick={() => (createOpen = true)}><Plus size={18} /></button
				>{/if}
		{/snippet}
		<MemberTable
			members={visible}
			{management}
			loadedTotal={data.registry.members.length}
			filterContent={registryFilters}
			searchQuery={search}
			controls={registryControls}
			onResponsibilities={(member) => {
				responsibilityMember = member;
				responsibilityRole = data.registry.delegableRoles?.[0] ?? 'helper';
				responsibilityUnit = '';
				responsibilityOpen = true;
			}}
			registry={data.registry}
			message={form?.message}
			preview={bulkPreview}
			{feeMenu}
		/>
	</section>
	{#if management && data.registry.canManage}<Modal
			bind:open={createOpen}
			title="Adaugă membru"
			description="Înscrie un beneficiar sau un voluntar adult în structura potrivită."
		>
			<form method="POST" class="grid">
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
	{#if structureOpen}<section aria-label="Unități și subunități">
			<h2>Unități și subunități</h2>
			{#snippet unitFilters()}<label
					>Caută unitate sau subunitate<input
						type="search"
						bind:value={unitSearch}
						oninput={() => (unitPage = 0)}
						placeholder="Nume"
					/></label
				>{/snippet}
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
								<td>{u.parentId ? name(u.parentId) : u.name}</td><td>{u.parentId ? u.name : '—'}</td
								>
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
		</section>{/if}
	<Modal
		bind:open={subunitOpen}
		title={subunitEdit ? 'Redenumește subunitatea' : 'Adaugă subunitate'}
		description="Unitățile sunt fixe. Subunitățile se gestionează în cadrul lor."
	>
		<form method="POST" class="grid">
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
			<form method="POST">
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
		<section>
			<details bind:open={orgoOpen}>
				<summary>Legătura cu Orgo</summary>
				<a href={resolve('/units/orgo')}>Verifică accesul și previzualizează importul</a>
				<p class="hint">Modificările locale sunt păstrate chiar dacă Orgo nu le poate confirma.</p>
				{#each data.registry.sync.filter((s) => !['synced', 'superseded', 'local-only'].includes(s.state)) as s (s.id)}<div
						class="sync"
					>
						<p>
							<a href={resolve(`/units/${s.memberId}`)}>Fișa membrului</a> · {syncLabels[s.state] ??
								s.state}<small>{s.message}</small>
						</p>
						<form method="POST">
							<input type="hidden" name="action" value="retry" /><input
								type="hidden"
								name="id"
								value={s.id}
							/><button class="secondary">Reverifică</button>
						</form>
					</div>{:else}<p>Nicio operațiune în așteptare.</p>{/each}
			</details>
		</section>{/if}
</div>

<Modal
	bind:open={responsibilityOpen}
	title={`Responsabilități · ${responsibilityMember?.name ?? ''}`}
	description="Categoria principală rămâne aceeași. Drepturile se acordă numai în aria mandatului tău."
>
	{#each responsibilityMember?.responsibilities ?? [] as assignment (assignment.id)}
		<form method="POST" class="responsibility-row">
			<input type="hidden" name="action" value="end" /><input
				type="hidden"
				name="targetId"
				value={responsibilityMember?.id ?? ''}
			/><input type="hidden" name="assignmentId" value={assignment.id} />
			<span>{roleLabels[assignment.role]} · {name(assignment.groupId ?? assignment.unitId)}</span>
			<button type="submit" class="secondary">Încheie responsabilitatea</button>
		</form>
	{/each}

	<form method="POST" class="grid">
		<input type="hidden" name="action" value="assignment" />
		<input type="hidden" name="targetId" value={responsibilityMember?.id ?? ''} />
		<input type="hidden" name="structureId" value={responsibilityMember?.structureId ?? 'cluj'} />
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
		{#if responsibilityRole === 'helper'}
			<label class="check"><input type="checkbox" name="canEdit" />Poate modifica membrii</label>
			<label class="check"><input type="checkbox" name="canSeeFees" />Poate vedea cotizațiile</label
			>
			<label class="check"
				><input type="checkbox" name="canSeeSensitive" />Poate vedea date medicale și notițe</label
			>
		{/if}
		<button type="submit">Salvează responsabilitatea</button>
	</form>
</Modal>

<Modal
	bind:open={archiveOpen}
	title={`Arhivează ${archiveUnit?.name ?? 'unitatea'}`}
	description="Unitatea va fi arhivată. Istoricul este păstrat. Verifică repartizările înainte de a continua."
>
	<form method="POST">
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
		align-items: center;
		gap: 8px;
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
	summary {
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}
	details[open] > summary {
		margin-bottom: 16px;
	}
	@media (max-width: 640px) {
		header {
			flex-wrap: wrap;
		}
		h1 {
			font-size: 24px;
		}
		section {
			padding: 12px;
		}
	}
</style>
