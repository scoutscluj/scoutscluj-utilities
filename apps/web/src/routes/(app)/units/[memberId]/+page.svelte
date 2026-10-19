<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';
	import { profileLabels, roleLabels, syncLabels, unitName } from '$lib/members/types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const m = $derived(data.detail.member),
		a = $derived(data.detail.access);
	const units = $derived(data.registry.units.filter((u) => !u.parentId && !u.archived));
	const name = (id: string | null) => unitName(data.registry.units, id, 'Centru / fără unitate');
	const money = (b: number) =>
		new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(b / 100);
	const chief = $derived(data.registry.admin || data.registry.chiefUnitIds.length > 0);
</script>

<svelte:head><title>{m.name} · Membri</title></svelte:head>
<div class="workspace">
	<a href={resolve('/units')}>← Unități și membri</a>
	<header>
		<div>
			<h1>{m.name}</h1>
			<p>
				{name(m.unitId)}{m.groupId ? ` / ${name(m.groupId)}` : ''} · {m.status === 'active'
					? 'Activ'
					: m.status === 'review'
						? 'Status de verificat'
						: 'Retras din activitate'}
			</p>
		</div>
		<span class="badge">{m.orgoId ? `Orgo #${m.orgoId}` : 'Identitate Orgo în așteptare'}</span>
	</header>
	{#if form?.message}<p role="status" class="notice">{form.message}</p>{/if}
	<section>
		<h2>Fișa membrului</h2>
		<form method="POST">
			<input type="hidden" name="action" value="profile" /><input
				type="hidden"
				name="revision"
				value={m.revision}
			/>
			<div class="grid">
				<label
					>Nume<input
						name={a.identity ? 'name' : undefined}
						value={m.name}
						readonly={!a.identity}
					/></label
				><label
					>Data nașterii<input
						type="date"
						name={a.identity ? 'birthDate' : undefined}
						value={m.birthDate ?? ''}
						readonly={!a.identity}
					/></label
				><label
					>Clasa<input
						type="number"
						min="1"
						max="12"
						name={a.edit ? 'grade' : undefined}
						value={m.grade ?? ''}
						readonly={!a.edit}
					/></label
				>
				{#if a.edit}<label
						>Excepție de la progresia anuală (an)<input
							type="number"
							name="skipProgressionYear"
							value={m.skipProgressionYear ?? ''}
							placeholder="Fără excepție"
						/></label
					>{/if}
				{#each Object.entries(profileLabels).filter(([key]) => a.sensitive || !['medical', 'allergies', 'medication', 'dietary'].includes(key)) as [key, label] (key)}<label
						>{label}{#if ['medical', 'allergies', 'medication', 'dietary'].includes(key)}<textarea
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
			{#if a.edit || a.own}<button>Salvează fișa</button>{/if}
		</form>
		<p class="hint">
			Datele se păstrează pentru înscrierile viitoare la activități. Acordurile parentale PDF se
			generează și se semnează separat.
		</p>
	</section>
	{#if a.notes}<section>
			<h2>Notițe interne</h2>
			<p class="hint">
				Vizibile liderilor unității curente. Nu sunt trimise în Orgo sau afișate membrului.
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
	{#if a.fees}<section>
			<h2>Cotizații</h2>
			<div class="table">
				<table>
					<thead><tr><th>Perioadă</th><th>Total</th><th>Plătit</th><th>Rămas</th></tr></thead><tbody
						>{#each data.detail.fees as fee (fee.period)}<tr
								><td
									>{fee.period}{#if !fee.collectible}<small>În afara urmăririi la plată</small
										>{/if}</td
								><td>{money(fee.totalBani)}</td><td>{money(fee.paidBani)}</td><td
									>{money(fee.remainingBani)}</td
								></tr
							>{:else}<tr><td colspan="4">Nu există cotizații asociate.</td></tr>{/each}</tbody
					>
				</table>
			</div>
		</section>{/if}
	{#if a.edit || a.transfer}<section>
			<h2>Repartizare și status</h2>
			{#if m.status === 'active'}<form method="POST" class="grid">
					<input type="hidden" name="action" value="transfer" /><label
						>Unitate<select name="unitId"
							>{#if a.transfer}<option value="">Voluntar adult fără unitate</option
								>{/if}{#each units.filter((u) => a.transfer || u.id === m.unitId) as u (u.id)}<option
									value={u.id}
									selected={u.id === m.unitId}>{u.name}</option
								>{/each}</select
						></label
					><label
						>Grupă<select name="groupId"
							><option value="">Colectiv comun / nerepartizat</option
							>{#each data.registry.units.filter((u) => u.parentId && !u.archived) as u (u.id)}<option
									value={u.id}
									selected={u.id === m.groupId}>{name(u.parentId)} / {u.name}</option
								>{/each}</select
						></label
					><button>Mută membrul</button>
				</form>
				<details>
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
				</details>{:else}<p>
					La revenire se datorează doar cotizația anului curent, cu păstrarea plăților deja făcute.
					Rolurile și privilegiile vechi nu se reactivează automat.
				</p>
				<form method="POST" class="grid">
					<input type="hidden" name="action" value="reactivate" /><label
						>Unitate<select name="unitId"
							><option value="">Adult fără unitate</option>{#each units as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					><label
						>Grupă<select name="groupId"
							><option value="">Fără grupă</option
							>{#each data.registry.units.filter((u) => u.parentId && !u.archived) as u (u.id)}<option
									value={u.id}>{name(u.parentId)} / {u.name}</option
								>{/each}</select
						></label
					><button>Reactivează membrul</button>
				</form>{/if}
		</section>{/if}
	<section>
		<h2>Responsabilități și istoric</h2>
		{#each data.detail.assignments as assignment (assignment.id)}<article class="assignment">
				<div>
					<strong>{roleLabels[assignment.role] ?? assignment.role}</strong>
					<p>
						{name(assignment.unitId)}{assignment.groupId ? ` / ${name(assignment.groupId)}` : ''} · {assignment.endedAt
							? 'Încheiat'
							: 'Activ'}
					</p>
				</div>
				{#if chief && !assignment.endedAt && assignment.role !== 'beneficiary'}<form method="POST">
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
					<label
						>Rol<select name="role"
							><option value="helper">Voluntar adult / ajutor de lider</option><option
								value="leader">Lider</option
							>{#if data.registry.admin}<option value="chief">Șef de unitate</option><option
									value="scouter">Scouter</option
								><option value="council">Consiliu</option>{/if}</select
						></label
					><label
						>Unitate<select name="unitId"
							><option value="">La nivel de centru</option>{#each units as u (u.id)}<option
									value={u.id}>{u.name}</option
								>{/each}</select
						></label
					><label
						>Grupă<select name="groupId"
							><option value="">Colectiv comun / întreaga unitate</option
							>{#each data.registry.units.filter((u) => u.parentId && !u.archived) as u (u.id)}<option
									value={u.id}>{name(u.parentId)} / {u.name}</option
								>{/each}</select
						></label
					><label
						>Data promisiunii de lider<input
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
							Folosește ID-ul numai după ce ai verificat că fișa din Orgo aparține aceleiași
							persoane.
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
		gap: 24px;
		color: #172b28;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
	}
	h1 {
		font-size: 2rem;
		margin: 8px 0;
	}
	section {
		padding: 24px;
		border: 1px solid #dce5df;
		border-radius: 14px;
		background: white;
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
		border: 1px solid #cbd8d0;
		border-radius: 7px;
		min-width: 0;
	}
	input[readonly],
	textarea[readonly] {
		background: #f5f7f6;
	}
	button {
		cursor: pointer;
		background: #245b46;
		color: white;
		font-weight: 600;
		margin-top: 16px;
	}
	.secondary {
		background: white;
		color: #245b46;
	}
	.danger {
		background: #9f352e;
	}
	.hint,
	small {
		color: #64756e;
		font-size: 0.85rem;
	}
	small {
		display: block;
	}
	a {
		color: #216249;
	}
	p {
		line-height: 1.6;
		white-space: pre-wrap;
	}
	.notice,
	.badge {
		background: #eef5ed;
		padding: 12px;
		border-radius: 8px;
	}
	.badge {
		font-size: 0.8rem;
	}
	article {
		border-bottom: 1px solid #e6ece8;
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
		color: #9f352e;
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
		border-bottom: 1px solid #e6ece8;
	}
	@media (max-width: 600px) {
		header,
		.assignment {
			display: block;
		}
		section {
			padding: 16px;
		}
	}
</style>
