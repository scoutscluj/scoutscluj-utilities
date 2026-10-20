<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';
	import { branchLabels, syncLabels, unitName } from '$lib/members/types';
	import MemberTable from '$lib/members/MemberTable.svelte';
	let { data, form }: { data: PageData; form: ActionData } = $props();
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
		if (activeSection === 'progression') progressionOpen = true;
		if (['retry', 'import'].includes(activeSection)) orgoOpen = true;
	});
	let structureFilter = $state('');
	let newStructure = $state('');
	let unitStructure = $state('');
	$effect(() => {
		if (!newStructure)
			newStructure =
				data.registry.manageableStructureIds?.[0] ?? data.registry.structures?.[0]?.id ?? 'cluj';
		if (!unitStructure)
			unitStructure =
				data.registry.manageableStructureIds?.[0] ?? data.registry.structures?.[0]?.id ?? 'cluj';
	});
	const structures = $derived(data.registry.structures ?? []);
	let search = $state(''),
		unitFilter = $state(''),
		status = $state('active');
	let newMemberUnit = $state(''),
		newMemberKind = $state('beneficiary');
	const units = $derived(data.registry.units.filter((u) => !u.parentId && !u.archived));
	const normalize = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLocaleLowerCase('ro');
	const visible = $derived(
		data.registry.members.filter(
			(m) =>
				(!structureFilter || (m.structureId ?? 'cluj') === structureFilter) &&
				(!search || normalize(m.name).includes(normalize(search))) &&
				(!unitFilter ||
					m.unitId === unitFilter ||
					m.groupId === unitFilter ||
					m.responsibilityUnitIds?.includes(unitFilter) ||
					m.responsibilityGroupIds?.includes(unitFilter)) &&
				(!status || m.status === status)
		)
	);
	const bulkPreview = $derived(form && 'bulkPreview' in form ? form.bulkPreview : undefined);
	const feeMenu = $derived(form && 'feeMenu' in form ? form.feeMenu : undefined);
	const name = (id: string | null) => unitName(data.registry.units, id);
</script>

<svelte:head><title>Unități și membri · Scouts Cluj</title></svelte:head>
<div class="workspace">
	<header>
		<p class="eyebrow">CENTRUL LOCAL CLUJ</p>
		<h1>Unități și membri</h1>
		<p>Grupe, responsabilități și fișele membrilor, într-un singur registru.</p>
	</header>
	{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
	<div class="stats">
		<article>
			<strong>{data.registry.members.filter((m) => m.status === 'active').length}</strong><span
				>Membri activi vizibili</span
			>
		</article>
		<article><strong>{units.length}</strong><span>Unități</span></article>
		<article>
			<strong>1 septembrie</strong><span
				>Actualizare anuală {data.registry.progressionEnabled ? 'activată' : 'neactivată'}</span
			>
		</article>
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
	<section>
		<h2>Registru</h2>
		<div class="filters">
			<label
				>Structură<select bind:value={structureFilter} onchange={() => (unitFilter = '')}
					><option value="">Toate structurile</option>{#each structures as st (st.id)}<option
							value={st.id}>{st.name}</option
						>{/each}</select
				></label
			>
			<label>Caută membru<input bind:value={search} placeholder="Nume" /></label><label
				>Unitate / grupă<select bind:value={unitFilter}
					><option value="">Toate</option
					>{#each data.registry.units.filter((u) => !u.archived && (!structureFilter || (u.structureId ?? 'cluj') === structureFilter)) as u (u.id)}<option
							value={u.id}>{u.parentId ? '↳ ' : ''}{u.name}</option
						>{/each}</select
				></label
			><label
				>Status<select bind:value={status}
					><option value="active">Activ</option><option value="withdrawn"
						>Retras din activitate</option
					><option value="review">Status de verificat</option><option value="">Toate</option
					></select
				></label
			>
		</div>
		<MemberTable members={visible} registry={data.registry} preview={bulkPreview} {feeMenu} />
	</section>
	<section>
		<details>
			<summary>Istoric Orgo: membri inactivi ({data.registry.inactiveMembers?.length ?? 0})</summary
			>
			<p>
				Membrii inactivi sunt păstrați separat. Îi poți confirma ca retrași, fără alte formalități.
			</p>
			<MemberTable
				members={(data.registry.inactiveMembers ?? [])
					.filter((m) => !structureFilter || (m.structureId ?? 'cluj') === structureFilter)
					.map((m) => ({
						...m,
						grade: null,
						unitId: null,
						groupId: null,
						adultKind: null,
						status: m.status ?? 'review'
					}))}
				registry={data.registry}
				preview={bulkPreview}
				{feeMenu}
				inactive
			/>
		</details>
	</section>
	{#if data.registry.canManage}<section>
			<details bind:open={createOpen}>
				<summary>Adaugă membru</summary>
				<form method="POST" class="grid">
					<input type="hidden" name="action" value="create" /><label
						>Structură<select
							name="structureId"
							bind:value={newStructure}
							onchange={() => (newMemberUnit = '')}
							>{#each structures as st (st.id)}<option value={st.id}>{st.name}</option
								>{/each}</select
						></label
					><label
						>Tip membru<select name="kind" bind:value={newMemberKind}
							><option value="beneficiary">Beneficiar</option><option value="adult"
								>Voluntar adult</option
							></select
						></label
					><label>Nume complet<input name="name" required maxlength="255" /></label><label
						>Data nașterii<input type="date" name="birthDate" /></label
					>{#if newMemberKind === 'beneficiary'}<label
							>Clasa<input type="number" name="grade" min="1" max="12" /></label
						>{/if}<label
						>Unitate<select
							name="unitId"
							bind:value={newMemberUnit}
							required={newMemberKind === 'beneficiary'}
							><option value=""
								>{newMemberKind === 'adult' ? 'Fără unitate' : 'Alege unitatea'}</option
							>{#each units.filter((u) => (u.structureId ?? 'cluj') === newStructure) as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					><label
						>Grupă<select name="groupId" disabled={!newMemberUnit}
							><option value="">Colectiv comun / nerepartizat</option
							>{#each data.registry.units.filter((u) => u.parentId === newMemberUnit && !u.archived) as u (u.id)}<option
									value={u.id}>{name(u.parentId)} / {u.name}</option
								>{/each}</select
						></label
					><button>Adaugă membru</button>
				</form>
				<p class="hint">Alege unitatea și, dacă este cazul, grupa în care va fi înscris membrul.</p>
			</details>
		</section>{/if}
	{#if data.registry.admin || data.registry.chiefUnitIds.length}<section>
			<details bind:open={structureOpen}>
				<summary>Unități și grupe</summary>
				<div class="unit-list">
					{#each data.registry.units.filter((u) => !u.archived) as u (u.id)}<div>
							<span
								>{u.parentId ? '↳ ' : ''}<strong>{u.name}</strong> · {branchLabels[u.branch]}</span
							>{#if data.registry.admin || data.registry.chiefUnitIds.includes(u.parentId ?? u.id)}<form
									method="POST"
								>
									<input type="hidden" name="action" value="archive" /><input
										type="hidden"
										name="id"
										value={u.id}
									/><button class="secondary">Arhivează</button>
								</form>{/if}
						</div>{/each}
				</div>
				<form method="POST" class="grid">
					<input type="hidden" name="action" value="unit" /><label
						>Structură<select name="structureId" bind:value={unitStructure}
							>{#each structures.filter((st) => data.registry.manageableStructureIds?.includes(st.id) || units.some((u) => (u.structureId ?? 'cluj') === st.id && data.registry.chiefUnitIds.includes(u.id))) as st (st.id)}<option
									value={st.id}>{st.name}</option
								>{/each}</select
						></label
					><label>Nume<input name="name" required /></label><label
						>Creează în<select name="parentId"
							>{#if data.registry.admin || data.registry.manageableStructureIds?.includes(unitStructure)}<option
									value="">Unitate nouă</option
								>{/if}{#each units.filter((u) => (u.structureId ?? 'cluj') === unitStructure && (data.registry.admin || data.registry.chiefUnitIds.includes(u.id))) as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					><label
						>Ramură<select name="branch"
							>{#each Object.entries(branchLabels) as [key, label] (key)}<option value={key}
									>{label}</option
								>{/each}</select
						></label
					><button>Salvează unitatea sau grupa</button>
				</form>
			</details>
		</section>{/if}
	{#if !data.registry.admin && data.registry.transitions.some((t) => t.state === 'review')}<section>
			<h2>Treceri de ramură de verificat</h2>
			{#each data.registry.transitions.filter((t) => t.state === 'review') as t (t.id)}<p>
					<a href={resolve(`/units/${t.memberId}`)}
						>{data.registry.members.find((m) => m.id === t.memberId)?.name ?? 'Verifică membrul'}</a
					>
					· {t.message}
				</p>{/each}
		</section>{/if}
	{#if data.registry.admin}<section>
			<h2>Apartenența la Cluj și Florești</h2>
			<a href={resolve('/units/structures')}>Verifică și confirmă repartizarea inițială</a>
		</section>
		<section>
			<details bind:open={progressionOpen}>
				<summary>Actualizarea anuală a membrilor</summary>
				<p>
					Clasele și ramurile avansează la 1 septembrie. Grupele stabile își păstrează identitatea
					și adulții responsabili. Verifică clasele și repartizările inițiale înainte de activare.
				</p>
				<form method="POST">
					<input type="hidden" name="action" value="progression" /><label class="check"
						><input
							type="checkbox"
							name="enabled"
							checked={data.registry.progressionEnabled}
						/>Datele inițiale sunt verificate; activează actualizarea automată</label
					><button>Salvează</button>
				</form>
				{#each data.registry.transitions.filter((t) => t.state === 'review') as t (t.id)}<p
						class="notice"
					>
						<a href={resolve(`/units/${t.memberId}`)}>Verifică membrul</a> · {t.year}: {t.message}
					</p>{/each}
			</details>
		</section>
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
							/>{#if s.state === 'conflict'}<label class="check"
									><input type="checkbox" name="keepLocal" required />Am verificat diferențele în
									Orgo. Păstrează datele locale.</label
								>{/if}<button class="secondary">Reverifică</button>
						</form>
					</div>{:else}<p>Nicio operațiune în așteptare.</p>{/each}
			</details>
		</section>{/if}
</div>

<style>
	summary {
		cursor: pointer;
		font-weight: 700;
		font-size: 1.1rem;
		padding: 4px 0;
	}
	details[open] > summary {
		margin-bottom: 20px;
	}
	.workspace {
		max-width: 1200px;
		margin: auto;
		display: grid;
		gap: 24px;
		color: #172b28;
	}
	header h1 {
		font-size: 2rem;
		margin: 4px 0;
	}
	.eyebrow {
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		color: #487a68;
		font-weight: 700;
	}
	section,
	.stats article {
		padding: 24px;
		border: 1px solid #dce5df;
		border-radius: 14px;
		background: white;
	}
	section h2 {
		margin-top: 0;
		font-size: 1.2rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.stats strong {
		font-size: 1.6rem;
		display: block;
	}
	.stats span,
	.hint,
	small {
		color: #64756e;
		font-size: 0.85rem;
	}
	small {
		display: block;
		margin-top: 5px;
	}
	.filters,
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 14px;
		align-items: end;
	}
	label {
		display: grid;
		gap: 7px;
		font-size: 0.85rem;
	}
	input,
	select,
	button {
		font: inherit;
		padding: 10px;
		border: 1px solid #cbd8d0;
		border-radius: 7px;
		min-width: 0;
	}
	button {
		cursor: pointer;
		background: #245b46;
		color: white;
		font-weight: 600;
	}
	.secondary {
		background: #f6f9f7;
		color: #245b46;
	}
	a {
		color: #216249;
	}
	p {
		line-height: 1.6;
	}
	.notice {
		background: #eef5ed;
		padding: 14px;
		border-radius: 8px;
	}
	.unit-list > div,
	.sync {
		display: flex;
		justify-content: space-between;
		gap: 15px;
		align-items: center;
		border-bottom: 1px solid #e6ece8;
		padding: 12px 0;
	}
	.unit-list {
		margin-bottom: 20px;
	}
	.check {
		display: flex;
		align-items: center;
		margin: 16px 0;
	}
	@media (max-width: 640px) {
		.stats {
			grid-template-columns: 1fr;
		}
		section {
			padding: 16px;
		}
		.sync {
			align-items: start;
		}
	}
</style>
