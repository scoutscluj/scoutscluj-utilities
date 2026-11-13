<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import FeePaymentForm from '$lib/members/FeePaymentForm.svelte';
	import TableView from '$lib/components/ui/TableView.svelte';
	import { resolve } from '$app/paths';
	import OrgoProfile from '$lib/members/OrgoProfile.svelte';
	import type { PageData, ActionData } from './$types';
	import {
		hasSchoolGrade,
		profileLabels,
		roleLabels,
		syncLabels,
		unitName
	} from '$lib/members/types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const m = $derived(data.detail.member),
		a = $derived(data.detail.access);
	let transferUnit = $state(''),
		transferGroup = $state('');
	let role = $state('helper'),
		roleUnit = $state(''),
		roleGroup = $state('');
	let returnUnit = $state(''),
		returnGroup = $state('');
	$effect(() => {
		transferUnit = m.unitId ?? '';
		transferGroup = m.groupId ?? '';
	});
	$effect(() => {
		if (!data.registry.delegableRoles?.includes(role))
			role = data.registry.delegableRoles?.[0] ?? 'helper';
	});
	const profileGroups = [
		{ title: 'Contacte personale', keys: ['email', 'phone'] },
		{
			title: 'Părinte și contact de urgență',
			keys: ['parentName', 'parentPhone', 'parentEmail', 'emergencyName', 'emergencyPhone']
		},
		{
			title: 'Sănătate și alte nevoi',
			keys: ['medical', 'allergies', 'medication', 'dietary', 'needs'],
			sensitive: true
		}
	];
	const structures = $derived(data.registry.structures ?? []);
	const units = $derived(data.registry.units.filter((u) => !u.parentId && !u.archived));
	const name = (id: string | null) => unitName(data.registry.units, id, 'Centru / fără unitate');
	const money = (b: number) =>
		new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(b / 100);
	const chief = $derived((data.registry.delegableRoles?.length ?? 0) > 0);
	const dietaryChoices = $derived(
		Object.values(
			(
				m.orgoProfile?.customDefinitions as
					| { name?: string; options?: { options?: Record<string, string> } }[]
					| undefined
			)?.find((d) => d.name?.toLocaleLowerCase('ro') === 'alimentatie')?.options?.options ?? {}
		)
	);
</script>

<svelte:head><title>{m.name} · Membri</title></svelte:head>
<div class="workspace">
	<a href={resolve('/units')}>← Membri și unități</a>
	<header>
		<div>
			<h1>{m.name}</h1>
			<p class="member-affiliation">
				{structures.find((st) => st.id === (m.structureId ?? 'cluj'))?.name} ·
				{name(m.unitId)}{m.groupId ? ` / ${name(m.groupId)}` : ''} · {m.status === 'active'
					? 'Activ'
					: m.status === 'review'
						? 'Status de verificat'
						: 'Retras din activitate'}
			</p>
		</div>
		<span class="badge" class:pending={!m.orgoId}
			>{m.orgoId ? `Orgo #${m.orgoId}` : 'Identitate Orgo în așteptare'}</span
		>
	</header>
	{#if form?.message}<p role="status" class="notice">{form.message}</p>{/if}
	<nav class="profile-navigation" aria-label="Secțiunile fișei">
		<a href="#member-profile">Fișa membrului</a>
		{#if a.fees}<a href="#member-fees">Cotizații</a>{/if}
		<a href="#member-responsibilities">Responsabilități</a>
		{#if a.notes}<a href="#member-notes">Notițe</a>{/if}
	</nav>
	<section id="member-profile">
		<h2>Fișa membrului</h2>
		<form method="POST">
			<input type="hidden" name="action" value="profile" /><input
				type="hidden"
				name="revision"
				value={m.revision}
			/>
			<details class="profile-group" open>
				<summary>Identitate și clasă</summary>
				<div class="grid">
					<label
						>Prenume<input
							name={a.identity ? 'firstName' : undefined}
							value={String(m.orgoProfile?.firstName ?? '')}
							readonly={!a.identity}
							required={a.identity}
						/></label
					>
					<label
						>Nume de familie<input
							name={a.identity ? 'lastName' : undefined}
							value={String(m.orgoProfile?.lastName ?? '')}
							readonly={!a.identity}
							required={a.identity}
						/></label
					>
					<label
						>Alte prenume<input
							name={a.identity ? 'middleName' : undefined}
							value={String(m.orgoProfile?.middleName ?? '')}
							readonly={!a.identity}
						/></label
					>
					<label
						>Data nașterii<DateInput
							type="date"
							name={a.identity ? 'birthDate' : undefined}
							value={m.birthDate ?? ''}
							readonly={!a.identity}
						/></label
					>
					{#if hasSchoolGrade(m)}<label
							>Clasa<input
								type="number"
								min="0"
								max="12"
								name={a.edit ? 'grade' : undefined}
								value={m.grade ?? ''}
								readonly={!a.edit}
							/></label
						>
					{/if}
					{#if a.edit && hasSchoolGrade(m)}<label
							>Excepție de la progresia anuală (an)<input
								type="number"
								name="skipProgressionYear"
								value={m.skipProgressionYear ?? ''}
								placeholder="Fără excepție"
							/></label
						>{/if}
				</div>
			</details>
			{#each profileGroups.filter((group) => !group.sensitive || a.sensitive) as group (group.title)}
				<details class="profile-group">
					<summary>{group.title}</summary>
					<div class="grid">
						{#each Object.entries(profileLabels).filter( ([key]) => group.keys.includes(key) ) as [key, label] (key)}<label
								>{label}{#if key === 'dietary' && dietaryChoices.length}<select
										name={a.edit || a.own ? 'profile.dietary' : undefined}
										disabled={!a.edit && !a.own}
										value={m.profile.dietary ?? ''}
										><option value="">Nespecificat</option
										>{#each dietaryChoices as choice (choice)}<option value={choice}
												>{choice}</option
											>{/each}</select
									>{:else if ['medical', 'allergies', 'medication', 'dietary', 'needs'].includes(key)}<textarea
										name={a.edit || a.own ? `profile.${key}` : undefined}
										readonly={!a.edit && !a.own}
										maxlength="4000"
										rows="3">{m.profile[key] ?? ''}</textarea
									>{:else}<input
										name={a.edit || a.own ? `profile.${key}` : undefined}
										value={m.profile[key] ?? ''}
										readonly={!a.edit && !a.own}
										maxlength="255"
									/>{/if}</label
							>{/each}
					</div>
				</details>{/each}
			{#if a.edit || a.own}<button>Salvează fișa</button>{/if}
		</form>
		<p class="hint">
			Datele se păstrează pentru înscrierile viitoare la activități. Acordurile parentale PDF se
			generează și se semnează separat.
		</p>
	</section>
	<OrgoProfile detail={data.detail} />
	{#if a.notes}<section id="member-notes">
			<h2>Notițe interne</h2>
			<p class="hint">
				Vizibile liderilor unității curente. Nu sunt trimise în Orgo (membri.scout.ro) sau afișate
				membrului.
			</p>
			{#each data.detail.notes as note (note.id)}<article>
					<p>{note.body}</p>
					<small
						>Cont #{note.authorId} · {new Date(note.createdAt).toLocaleDateString('ro-RO')}</small
					>
				</article>{:else}<p>Nu există notițe.</p>{/each}{#if a.edit}<form method="POST">
					<input type="hidden" name="action" value="note" /><label
						>Notiță nouă<textarea name="body" maxlength="8000" required rows="3"></textarea></label
					><button>Adaugă notiță</button>
				</form>{/if}
		</section>{/if}
	{#if a.fees}<section id="member-fees">
			<h2>Cotizații și adeziune</h2>
			{#if data.nationalMessage}<p role="status">{data.nationalMessage}</p>{/if}
			{#each data.detail.fees as fee (fee.period)}
				<p>
					{fee.period} · Național: {money(fee.nationalBani ?? 0)}{fee.nationalDirectBani
						? ' · achitat direct în Orgo'
						: ''}. Încasat de centru: {money(fee.localPaidBani ?? 0)}.
				</p>
				<FeePaymentForm {fee} canRecord={a.recordFees || data.registry.canFinance} />
			{/each}
			{#if data.detail.admission}<p>
					Adeziune: <strong
						>{data.detail.admission.paid
							? 'Achitată'
							: data.detail.admission.receivedBani > 0
								? 'Plătită parțial'
								: 'Fără plată confirmată'}</strong
					>
				</p>{/if}
			<div class="table">
				<TableView label="Caută cotizația" paginated={false} compact
					><table>
						<thead><tr><th>Perioadă</th><th>Total</th><th>Plătit</th><th>Rămas</th></tr></thead
						><tbody
							>{#each data.detail.fees as fee (fee.period)}<tr
									><td data-label="Perioadă"
										>{fee.period}{#if !fee.collectible}<small>În afara urmăririi la plată</small
											>{/if}</td
									><td data-label="Total">{money(fee.totalBani)}</td><td data-label="Plătit"
										>{money(fee.paidBani)}</td
									><td data-label="Rămas">{money(fee.remainingBani)}</td></tr
								>{:else}<tr><td colspan="4">Nu există cotizații asociate.</td></tr>{/each}</tbody
						>
					</table></TableView
				>
			</div>
		</section>{/if}
	{#if a.transfer || (a.edit && m.unitId) || a.withdraw}<section>
			<h2>Repartizare și status</h2>
			{#if m.status === 'active'}<form method="POST" class="grid">
					<input type="hidden" name="action" value="transfer" /><label
						>Unitate<select
							name="unitId"
							bind:value={transferUnit}
							onchange={() => (transferGroup = '')}
							>{#if a.transfer}<option value="">Voluntar adult fără unitate</option
								>{/if}{#each units.filter((u) => (u.structureId ?? 'cluj') === (m.structureId ?? 'cluj') && (a.transfer || u.id === m.unitId)) as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					>
					{#if data.registry.units.some((u) => u.parentId === transferUnit && !u.archived)}<label
							>Grupă<select name="groupId" bind:value={transferGroup}
								><option value="">Colectiv comun / nerepartizat</option
								>{#each data.registry.units.filter((u) => u.parentId === transferUnit && !u.archived) as u (u.id)}<option
										value={u.id}>{name(u.parentId)} / {u.name}</option
									>{/each}</select
							></label
						>{/if}<button>Mută membrul</button>
				</form>
				{#if a.withdraw ?? a.edit}<details>
						<summary>Retragere din activitate</summary>
						<p>
							Încheie toate implicările active și drepturile derivate ale persoanei, în întregul
							centru. Istoricul se păstrează; restanțele nu mai sunt urmărite.
						</p>
						<form
							method="POST"
							onsubmit={(event) => {
								if (!confirm(`Marchezi retragerea din orice activitate pentru ${m.name}?`))
									event.preventDefault();
							}}
						>
							<input type="hidden" name="action" value="withdraw" /><button class="danger"
								>Marchează „Retras din activitate”</button
							>
						</form>
					</details>{/if}{:else}<p>
					La revenire se datorează doar cotizația anului curent, cu păstrarea plăților deja făcute.
					Rolurile și privilegiile vechi nu se reactivează automat.
				</p>
				<form method="POST" class="grid">
					<input type="hidden" name="action" value="reactivate" /><label
						>Unitate<select
							name="unitId"
							bind:value={returnUnit}
							onchange={() => (returnGroup = '')}
							><option value="">Adult fără unitate</option
							>{#each units.filter((u) => (u.structureId ?? 'cluj') === (m.structureId ?? 'cluj')) as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					><label
						>Grupă<select name="groupId" bind:value={returnGroup}
							><option value="">Fără grupă</option
							>{#each data.registry.units.filter((u) => u.parentId === returnUnit && !u.archived) as u (u.id)}<option
									value={u.id}>{name(u.parentId)} / {u.name}</option
								>{/each}</select
						></label
					><button>Reactivează membrul</button>
				</form>{/if}
		</section>{/if}
	<section>
		<h2 id="member-responsibilities">Responsabilități și istoric</h2>
		{#each data.detail.assignments as assignment (assignment.id)}<article class="assignment">
				<div>
					<strong>{roleLabels[assignment.role] ?? assignment.role}</strong>
					<p>
						{assignment.structureId
							? structures.find((st) => st.id === assignment.structureId)?.name
							: name(assignment.unitId)}{assignment.groupId ? ` / ${name(assignment.groupId)}` : ''} ·
						{assignment.endedAt ? 'Încheiat' : 'Activ'}
					</p>
				</div>
				{#if !assignment.endedAt && assignment.role !== 'beneficiary' && (data.registry.admin || (assignment.unitId && data.registry.chiefUnitIds.includes(assignment.unitId) && (assignment.role !== 'chief' || data.registry.manageableStructureIds?.includes(data.registry.units.find((u) => u.id === assignment.unitId)?.structureId ?? 'cluj'))))}<form
						method="POST"
					>
						<input type="hidden" name="action" value="end" /><input
							type="hidden"
							name="assignmentId"
							value={assignment.id}
						/><button class="secondary">Încheie responsabilitatea</button>
					</form>{/if}
			</article>{:else}<p>Nicio responsabilitate înregistrată.</p>{/each}
		{#if chief && m.status === 'active'}<form method="POST">
				<input type="hidden" name="action" value="assignment" />
				<div class="grid">
					{#if role === 'structure_admin'}<label
							>Structură<select name="structureId" value={m.structureId ?? 'cluj'}
								>{#each structures.filter((st) => st.id === (m.structureId ?? 'cluj')) as st (st.id)}<option
										value={st.id}>{st.name}</option
									>{/each}</select
							></label
						>{/if}
					<label
						>Rol<select
							name="role"
							bind:value={role}
							onchange={() => {
								roleUnit = '';
								roleGroup = '';
							}}
							>{#each (data.registry.delegableRoles ?? []).filter((r) => r !== 'council' || m.structureId !== 'floresti') as r (r)}<option
									value={r}>{roleLabels[r]}</option
								>{/each}</select
						></label
					><label
						>Unitate<select
							name="unitId"
							bind:value={roleUnit}
							disabled={['structure_admin', 'council', 'scouter'].includes(role)}
							onchange={() => (roleGroup = '')}
							><option value="">La nivel de centru</option
							>{#each units.filter((u) => u.delegateRoles?.includes(role) && (u.structureId ?? 'cluj') === (m.structureId ?? 'cluj')) as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					>
					{#if ['leader', 'helper'].includes(role) && data.registry.units.some((u) => u.parentId === roleUnit && !u.archived)}<label
							>Grupă<select
								name="groupId"
								bind:value={roleGroup}
								disabled={!roleUnit || role === 'chief'}
								required={['leader', 'helper'].includes(role)}
								><option value="">Colectiv comun / întreaga unitate</option
								>{#each data.registry.units.filter((u) => u.parentId === roleUnit && !u.archived) as u (u.id)}<option
										value={u.id}>{name(u.parentId)} / {u.name}</option
									>{/each}</select
							></label
						>{/if}<label
						>Data promisiunii de lider (opțional)<DateInput
							type="date"
							name="promiseDate"
							value={m.promiseDate ?? ''}
						/></label
					>
				</div>
				<p class="hint">
					Pentru ajutoare, accesul suplimentar este acordat explicit. Un senior nu poate primi rolul
					de lider.
				</p>
				<div class="checks">
					<label><input type="checkbox" name="canEdit" />Poate modifica membrii</label><label
						><input type="checkbox" name="canSeeFees" />Poate vedea cotizațiile</label
					><label
						><input type="checkbox" name="canSeeSensitive" />Poate vedea date medicale și notițe</label
					>
				</div>
				<button>Salvează responsabilitatea</button>
			</form>{/if}
	</section>
	{#if a.edit || data.registry.admin}<section>
			<details>
				<summary>Legătura cu Orgo</summary>
				{#if data.registry.admin && !m.orgoId}<form method="POST">
						<input type="hidden" name="action" value="link" /><label
							>ID Orgo verificat<input type="number" name="orgoId" min="1" required /></label
						>
						<p class="hint">
							Folosește ID-ul numai după ce ai verificat că fișa din Orgo (membri.scout.ro) aparține
							aceleiași persoane.
						</p>
						<button>Asociază identitatea Orgo</button>
					</form>{/if}
				{#each data.detail.sync as sync (sync.id)}<article>
						<strong>{syncLabels[sync.state] ?? sync.state}</strong>
						<p>{sync.message}</p>
					</article>{:else}<p>Nu există modificări în așteptare.</p>{/each}
			</details>
		</section>{/if}
</div>

<style>
	.workspace {
		max-width: 1100px;
		margin: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
		color: var(--sc-ink);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
	}
	h1 {
		font-size: 1.75rem;
		line-height: 1.2;
		margin: 0 0 6px;
	}
	.profile-navigation {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.profile-navigation a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		padding: 8px 12px;
		border: 1px solid var(--sc-control-border);
		border-radius: 8px;
		background: var(--sc-surface);
		font-size: 14px;
	}
	.profile-group {
		margin: 0;
		border-bottom: 1px solid var(--sc-border);
	}
	.profile-group > summary {
		min-height: 48px;
		align-content: center;
		padding: 12px 0;
		color: var(--sc-ink);
		font-weight: 600;
	}
	.profile-group > .grid {
		padding: 4px 0 20px;
	}
	[id] {
		scroll-margin-top: 88px;
	}
	.member-affiliation {
		white-space: normal;
		text-align: left;
		margin: 0;
		font-size: 14px;
		color: var(--sc-muted);
	}
	section {
		min-width: 0;
		padding: 24px;
		border: 1px solid var(--sc-border);
		border-radius: 14px;
		background: var(--sc-surface);
	}
	h2 {
		margin-top: 0;
		font-size: 1.2rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
		gap: 16px;
		align-items: start;
	}
	label {
		display: grid;
		gap: 7px;
		font-size: 0.85rem;
	}
	input,
	select,
	textarea,
	button {
		font: inherit;
		padding: 10px;
		border: 1px solid var(--sc-control-border);
		border-radius: 7px;
		min-width: 0;
	}
	input,
	select,
	textarea {
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	input::placeholder,
	textarea::placeholder {
		color: var(--sc-muted);
		opacity: 1;
	}
	:is(input, select, textarea, button, summary):focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	input[readonly],
	textarea[readonly] {
		background: var(--sc-inset);
	}
	button {
		cursor: pointer;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		font-weight: 600;
		margin-top: 16px;
	}
	.secondary {
		background: var(--sc-surface);
		color: var(--sc-link);
	}
	.danger {
		background: var(--sc-accent-soft);
		color: var(--sc-danger);
		border-color: var(--sc-danger);
	}
	.hint,
	small {
		color: var(--sc-muted);
		font-size: 0.85rem;
	}
	small {
		display: block;
	}
	a {
		color: var(--sc-link);
	}
	p {
		line-height: 1.6;
		white-space: pre-wrap;
	}
	.notice,
	.badge {
		background: var(--sc-success-soft);
		padding: 8px 10px;
		border-radius: 8px;
	}
	.badge.pending {
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
	}
	.badge {
		font-size: 0.8rem;
	}
	article {
		border-bottom: 1px solid var(--sc-border);
		padding: 14px 0;
	}
	.assignment {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}
	.checks {
		display: flex;
		gap: 15px;
		flex-wrap: wrap;
	}
	.checks label {
		display: flex;
		align-items: center;
	}
	details {
		margin-top: 24px;
	}
	summary {
		cursor: pointer;
		color: var(--sc-danger);
	}
	.table {
		overflow: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}
	td,
	th {
		padding: 14px 8px;
		border-bottom: 1px solid var(--sc-border);
	}
	@media (max-width: 600px) {
		thead {
			display: none;
		}
		table,
		tbody {
			display: block;
		}
		tbody tr {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
			padding: 12px 0;
			border-bottom: 1px solid var(--sc-border);
		}
		td {
			display: block;
			border: 0;
			padding: 0;
			min-width: 0;
		}
		td::before {
			content: attr(data-label);
			display: block;
			margin-bottom: 4px;
			color: var(--sc-muted);
			font-size: 12px;
		}
		td[colspan] {
			grid-column: 1 / -1;
		}
		td[colspan]::before {
			display: none;
		}

		header {
			flex-wrap: wrap;
			gap: 8px;
		}
		.assignment {
			display: block;
		}
		section {
			padding: 16px;
		}
		.workspace {
			gap: 16px;
			min-width: 0;
		}
		header > div {
			min-width: 0;
		}
		h1 {
			font-size: 26px;
			line-height: 32px;
			overflow-wrap: anywhere;
		}
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
		input,
		select,
		button {
			min-height: 44px;
			max-width: 100%;
			box-sizing: border-box;
		}
		.checks label {
			min-height: 44px;
		}
		summary {
			min-height: 44px;
			padding: 10px 0;
			box-sizing: border-box;
		}
	}
</style>
