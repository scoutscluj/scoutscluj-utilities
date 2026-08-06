<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		branchCodes,
		branchLabels,
		type BranchCode,
		type OrganizerDraft,
		type ValidationIssue
	} from '@scouts-cluj/parental-consent-schema';

	let { data, form } = $props();
	const initialDraft = () => (data.draft ? structuredClone(data.draft.data) : undefined);
	const initialRevision = () => data.draft?.revision ?? 0;
	const initialIssues = () => data.draft?.issues ?? [];
	let draft = $state<OrganizerDraft | undefined>(initialDraft());
	let revision = $state(initialRevision());
	let issues = $state<ValidationIssue[]>(initialIssues());
	let step = $state(0);
	let dirty = $state(false);
	let saving = $state(false);
	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
	let saveForm = $state<HTMLFormElement>();

	const steps = [
		{ label: 'General', prefixes: ['general'] },
		{ label: 'Ramuri', prefixes: ['branches'] },
		{ label: 'Transport', prefixes: ['branches'] },
		{ label: 'Cazare și program', prefixes: ['accommodation', 'branches'] },
		{ label: 'Apă, unelte și foc', prefixes: ['water', 'tools', 'fireCookingBlacksmithing'] },
		{ label: 'Drumeție și prim ajutor', prefixes: ['hiking', 'firstAid'] },
		{
			label: 'Hrană, echipament și conduită',
			prefixes: ['foodAllergies', 'conductSfh', 'branches']
		}
	];
	const enabledBranches = $derived(
		draft ? branchCodes.filter((code) => draft!.branches[code].enabled) : []
	);
	const blockingIssues = $derived(issues.filter((issue) => issue.severity === 'error'));
	const currentIssues = $derived(
		issues.filter((issue) => steps[step].prefixes.some((prefix) => issue.path.startsWith(prefix)))
	);
	const completion = $derived(
		Math.round(
			(steps.filter(
				(candidate) =>
					!issues.some(
						(issue) =>
							issue.severity === 'error' &&
							candidate.prefixes.some((prefix) => issue.path.startsWith(prefix))
					)
			).length /
				steps.length) *
				100
		)
	);

	const markDirty = () => {
		dirty = true;
		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => {
			if (dirty && !saving) saveForm?.requestSubmit();
		}, 1600);
	};
	const fromLines = (value: string) =>
		value
			.split('\n')
			.map((entry) => entry.trim())
			.filter(Boolean);
	const toLines = (value: string[]) => value.join('\n');
	const updateBranchList = (branch: BranchCode, key: 'activities' | 'equipment', value: string) => {
		if (!draft) return;
		draft.branches[branch][key] = fromLines(value);
		markDirty();
	};
	const updatePeople = (value: string) => {
		if (!draft) return;
		draft.firstAid.responsiblePeople = fromLines(value);
		markDirty();
	};
	const updateWaterActivities = (value: string) => {
		if (!draft) return;
		draft.water.activities = fromLines(value);
		markDirty();
	};
	const beforeUnload = (event: BeforeUnloadEvent) => {
		if (dirty) event.preventDefault();
	};
	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(
			new Date(value)
		);
	const fileSize = (value: number) => `${(value / 1024).toFixed(1)} KB`;
</script>

<svelte:window onbeforeunload={beforeUnload} />
<svelte:head><title>Acord parental | {data.activity.title}</title></svelte:head>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">Activitate · zonă administrativă</p>
			<h1>Acord parental</h1>
			<p>{data.activity.title}</p>
		</div>
		{#if data.canManage && draft}<div class="save-state" class:dirty>
				<span
					>{saving
						? 'Se salvează…'
						: dirty
							? 'Modificări nesalvate'
							: `Salvat · rev. ${revision}`}</span
				><progress max="100" value={completion}></progress><strong>{completion}%</strong>
			</div>{/if}
	</header>

	{#if form?.message}<div class="notice error" role="alert">
			{form.message}
		</div>{:else if form?.success && form.action === 'publish'}<div class="notice success">
			Publicarea a reușit.
		</div>{/if}

	<section class="published panel">
		<div class="panel-heading">
			<div>
				<h2>Documente publicate</h2>
				<p>
					Aceste fișiere sunt versiunea curentă, disponibilă tuturor utilizatorilor autentificați
					care pot vedea activitatea.
				</p>
			</div>
			{#if data.publication}<span
					>Ref. {data.publication.reference} · {formatDate(data.publication.createdAt)}</span
				>{/if}
		</div>
		{#if data.publication}
			<div class="document-grid">
				{#each data.publication.documents as document (document.id)}
					<a
						href={resolve(
							`/activities/${data.activity.id}/parental-consent/documents/${document.id}/file`
						)}
					>
						<strong>{branchLabels[document.branch]}</strong><span
							>{fileSize(document.fileSize)}</span
						><code>SHA-256 {document.checksumSha256.slice(0, 16)}…</code><b>Descarcă PDF</b>
					</a>
				{/each}
			</div>
		{:else}<div class="empty">
				Nu există încă un acord parental publicat pentru această activitate.
			</div>{/if}
	</section>

	{#if data.canManage && draft}
		<section class="workspace">
			<nav aria-label="Pași configurare">
				{#each steps as candidate, index (candidate)}
					<button type="button" class:active={step === index} onclick={() => (step = index)}
						><span>{index + 1}</span
						>{candidate.label}{#if issues.some((issue) => issue.severity === 'error' && candidate.prefixes.some( (prefix) => issue.path.startsWith(prefix) ))}<i
								>!</i
							>{/if}</button
					>
				{/each}
			</nav>
			<div class="wizard panel">
				{#if currentIssues.length}<div class="issue-list">
						{#each currentIssues as issue (issue.severity + issue.path + issue.message)}<p
								class:warning={issue.severity === 'warning'}
							>
								<strong>{issue.path}</strong>
								{issue.message}
							</p>{/each}
					</div>{/if}

				{#if step === 0}
					<div class="fields two">
						<label>Titlu<input bind:value={draft.general.title} oninput={markDirty} /></label><label
							>Locație<input bind:value={draft.general.location} oninput={markDirty} /></label
						><label class="wide"
							>Adresă / punct de întâlnire<textarea
								bind:value={draft.general.address}
								oninput={markDirty}
							></textarea></label
						><label
							>Data generală început<input
								type="date"
								bind:value={draft.general.startDate}
								oninput={markDirty}
							/></label
						><label
							>Data generală final<input
								type="date"
								bind:value={draft.general.endDate}
								oninput={markDirty}
							/></label
						><label
							>Contact de urgență<input
								bind:value={draft.general.emergencyContactName}
								oninput={markDirty}
							/></label
						><label
							>Telefon urgență<input
								bind:value={draft.general.emergencyContactPhone}
								oninput={markDirty}
							/></label
						>
					</div>
				{:else if step === 1}
					<div class="branch-grid">
						{#each branchCodes as branch (branch)}<fieldset>
								<legend
									><label class="check"
										><input
											type="checkbox"
											bind:checked={draft.branches[branch].enabled}
											onchange={markDirty}
										/>
										{branchLabels[branch]}</label
									></legend
								><label
									>Început<input
										type="date"
										bind:value={draft.branches[branch].startDate}
										oninput={markDirty}
										disabled={!draft.branches[branch].enabled}
									/></label
								><label
									>Final<input
										type="date"
										bind:value={draft.branches[branch].endDate}
										oninput={markDirty}
										disabled={!draft.branches[branch].enabled}
									/></label
								><label
									>Interval vârstă<input
										bind:value={draft.branches[branch].ageRange}
										oninput={markDirty}
										disabled={!draft.branches[branch].enabled}
										placeholder="ex. 11–14 ani"
									/></label
								>
							</fieldset>{/each}
					</div>
				{:else if step === 2}
					<div class="branch-grid">
						{#each enabledBranches as branch (branch)}<fieldset>
								<legend>{branchLabels[branch]}</legend><label
									>Transport tur<textarea
										bind:value={draft.branches[branch].outboundTransport}
										oninput={markDirty}
									></textarea></label
								><label
									>Transport retur<textarea
										bind:value={draft.branches[branch].returnTransport}
										oninput={markDirty}
									></textarea></label
								><label
									>Preluare / punct întâlnire<textarea
										bind:value={draft.branches[branch].pickupDetails}
										oninput={markDirty}
									></textarea></label
								>
							</fieldset>{/each}
					</div>
				{:else if step === 3}
					<div class="fields two">
						<label class="check"
							><input
								type="checkbox"
								bind:checked={draft.accommodation.enabled}
								onchange={markDirty}
							/> Există cazare</label
						><label class="check"
							><input
								type="checkbox"
								bind:checked={draft.accommodation.overnight}
								onchange={markDirty}
							/> Include înnoptare</label
						><label class="wide"
							>Detalii cazare<textarea bind:value={draft.accommodation.details} oninput={markDirty}
							></textarea></label
						>
					</div>
					<div class="branch-grid">
						{#each enabledBranches as branch (branch)}<fieldset>
								<legend>Program {branchLabels[branch]}</legend><label
									>Activități (una pe linie)<textarea
										rows="6"
										value={toLines(draft.branches[branch].activities)}
										oninput={(event) =>
											updateBranchList(branch, 'activities', event.currentTarget.value)}
									></textarea></label
								>
							</fieldset>{/each}
					</div>
				{:else if step === 4}
					<div class="module-grid">
						<fieldset>
							<legend>Apă / tobogan / plută</legend><label class="check"
								><input type="checkbox" bind:checked={draft.water.enabled} onchange={markDirty} /> Activ</label
							><label
								>Activități<textarea
									value={toLines(draft.water.activities)}
									oninput={(event) => updateWaterActivities(event.currentTarget.value)}
								></textarea></label
							><label class="check"
								><input
									type="checkbox"
									bind:checked={draft.water.raftConstructionOnly}
									onchange={markDirty}
								/> Pluta este doar construită la mal</label
							><label
								>Detalii<textarea bind:value={draft.water.details} oninput={markDirty}
								></textarea></label
							>
						</fieldset>
						<fieldset>
							<legend>Unelte / obiecte ascuțite</legend><label class="check"
								><input type="checkbox" bind:checked={draft.tools.enabled} onchange={markDirty} /> Activ</label
							>{#each branchCodes as branch (branch)}<label class="check"
									><input
										type="checkbox"
										value={branch}
										bind:group={draft.tools.branches}
										onchange={markDirty}
									/>
									{branchLabels[branch]}</label
								>{/each}<label
								>Detalii<textarea bind:value={draft.tools.details} oninput={markDirty}
								></textarea></label
							>
						</fieldset>
						<fieldset>
							<legend>Foc / gătit / fierărie</legend><label class="check"
								><input
									type="checkbox"
									bind:checked={draft.fireCookingBlacksmithing.enabled}
									onchange={markDirty}
								/> Activ</label
							>{#each branchCodes as branch (branch)}<label class="check"
									><input
										type="checkbox"
										value={branch}
										bind:group={draft.fireCookingBlacksmithing.branches}
										onchange={markDirty}
									/>
									{branchLabels[branch]}</label
								>{/each}<label
								>Detalii<textarea
									bind:value={draft.fireCookingBlacksmithing.details}
									oninput={markDirty}
								></textarea></label
							>
						</fieldset>
					</div>
				{:else if step === 5}
					<div class="module-grid">
						<fieldset>
							<legend>Drumeție și adăpost</legend><label class="check"
								><input type="checkbox" bind:checked={draft.hiking.enabled} onchange={markDirty} /> Activ</label
							><label class="check"
								><input
									type="checkbox"
									bind:checked={draft.hiking.overnightShelter}
									onchange={markDirty}
								/> Înnoptare în adăpost</label
							><label
								>Detalii<textarea bind:value={draft.hiking.details} oninput={markDirty}
								></textarea></label
							>
						</fieldset>
						<fieldset>
							<legend>Prim ajutor</legend><label
								>Responsabili (unul pe linie)<textarea
									value={toLines(draft.firstAid.responsiblePeople)}
									oninput={(event) => updatePeople(event.currentTarget.value)}
								></textarea></label
							><label
								>Unitate medicală de referință<input
									bind:value={draft.firstAid.facility}
									oninput={markDirty}
								/></label
							><label
								>Detalii<textarea bind:value={draft.firstAid.details} oninput={markDirty}
								></textarea></label
							>
						</fieldset>
					</div>
				{:else}
					<div class="module-grid">
						<fieldset>
							<legend>Hrană și alergii</legend><label class="check"
								><input
									type="checkbox"
									bind:checked={draft.foodAllergies.mealsProvided}
									onchange={markDirty}
								/> Sunt oferite mese</label
							><label
								>Gestionarea alergiilor<textarea
									bind:value={draft.foodAllergies.allergyHandling}
									oninput={markDirty}
								></textarea></label
							><label
								>Detalii<textarea bind:value={draft.foodAllergies.details} oninput={markDirty}
								></textarea></label
							>
						</fieldset>
						<fieldset>
							<legend>Echipament pe ramură</legend>{#each enabledBranches as branch (branch)}<label
									>{branchLabels[branch]}<textarea
										value={toLines(draft.branches[branch].equipment)}
										oninput={(event) =>
											updateBranchList(branch, 'equipment', event.currentTarget.value)}
									></textarea></label
								>{/each}
						</fieldset>
						<fieldset>
							<legend>Conduită și Safe from Harm</legend><label
								>Link regulament<input
									type="url"
									bind:value={draft.conductSfh.regulationUrl}
									oninput={markDirty}
								/></label
							><label
								>Safe from Harm<textarea
									bind:value={draft.conductSfh.safeFromHarmDetails}
									oninput={markDirty}
								></textarea></label
							><label
								>Alte reguli<textarea bind:value={draft.conductSfh.details} oninput={markDirty}
								></textarea></label
							>
						</fieldset>
					</div>
				{/if}
				<div class="step-actions">
					<button
						type="button"
						class="secondary"
						onclick={() => (step = Math.max(0, step - 1))}
						disabled={step === 0}>Înapoi</button
					><span>Pasul {step + 1} din {steps.length}</span><button
						type="button"
						class="secondary"
						onclick={() => (step = Math.min(steps.length - 1, step + 1))}
						disabled={step === steps.length - 1}>Continuă</button
					>
				</div>
			</div>
		</section>

		<form
			bind:this={saveForm}
			method="POST"
			action="?/save"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					await update({ reset: false, invalidateAll: false });
					saving = false;
					if (result.type === 'success') {
						const response = result.data as { revision?: number; issues?: ValidationIssue[] };
						if (response.revision) revision = response.revision;
						if (response.issues) issues = response.issues;
						dirty = false;
					}
				};
			}}
			class="publish-bar"
		>
			<input type="hidden" name="revision" value={revision} /><input
				type="hidden"
				name="draft"
				value={JSON.stringify(draft)}
			/>
			<button type="submit" class="secondary" disabled={!dirty || saving}>Salvează acum</button>
			<div class="preview-links">
				{#each enabledBranches as branch (branch)}<a
						target="_blank"
						href={resolve(`/activities/${data.activity.id}/parental-consent/preview/${branch}`)}
						>Preview {branchLabels[branch]}</a
					>{/each}
			</div>
		</form>
		<form
			method="POST"
			action="?/publish"
			class="publish-card"
			onsubmit={(event) =>
				(dirty ||
					blockingIssues.length ||
					!confirm(
						data.publication
							? 'Republici acordurile? Versiunea curentă va fi arhivată.'
							: 'Publici acordurile parentale?'
					)) &&
				event.preventDefault()}
		>
			<div>
				<h2>{data.publication ? 'Republicare' : 'Publicare'}</h2>
				<p>Se generează și se stochează câte un PDF imuabil pentru fiecare ramură activă.</p>
				{#if data.draft?.changedPaths.length}<small
						>{data.draft.changedPaths.length} câmpuri diferă de publicația curentă.</small
					>{/if}
			</div>
			<button disabled={dirty || blockingIssues.length > 0 || !enabledBranches.length}
				>{data.publication ? 'Republică' : 'Publică'}</button
			>
		</form>

		{#if data.history.length}
			<section class="panel history">
				<h2>Istoric publicații</h2>
				{#each data.history as publication (publication.id)}<details>
						<summary
							><strong>Publicație {publication.reference}</strong> · {formatDate(
								publication.createdAt
							)} · template v{publication.templateVersion} · {publication.status}</summary
						>
						<div>
							{#each publication.documents as document (document.id)}<a
									href={resolve(
										`/activities/${data.activity.id}/parental-consent/publications/${publication.id}/documents/${document.id}/file`
									)}>{branchLabels[document.branch]} · {document.checksumSha256.slice(0, 16)}…</a
								>{/each}
						</div>
					</details>{/each}
			</section>
		{/if}
	{/if}
</section>

<style>
	.page {
		display: grid;
		gap: 15px;
		max-width: 1240px;
		margin: 0 auto;
		color: #172033;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		align-items: end;
	}
	.eyebrow {
		margin: 0;
		color: #991b1b;
		font-size: 0.75rem;
		font-weight: 900;
		text-transform: uppercase;
	}
	h1 {
		margin: 5px 0 0;
	}
	header p {
		margin: 4px 0 0;
		color: #64748b;
	}
	.save-state {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #047857;
		font-size: 0.82rem;
		font-weight: 800;
	}
	.save-state.dirty {
		color: #9a3412;
	}
	progress {
		width: 100px;
		accent-color: #047857;
	}
	.panel {
		border: 1px solid #dbe3ef;
		border-radius: 11px;
		background: #fff;
		padding: 16px;
		box-shadow: 0 10px 25px rgba(15, 23, 42, 0.04);
	}
	.panel-heading {
		display: flex;
		justify-content: space-between;
		gap: 15px;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.panel-heading p,
	.publish-card p {
		margin: 5px 0 0;
		color: #64748b;
		font-size: 0.88rem;
	}
	.document-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 9px;
		margin-top: 12px;
	}
	.document-grid a {
		display: grid;
		gap: 5px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 12px;
		color: inherit;
		text-decoration: none;
	}
	.document-grid a:hover {
		border-color: #991b1b;
	}
	.document-grid span,
	.document-grid code {
		color: #64748b;
		font-size: 0.75rem;
	}
	.document-grid b {
		color: #991b1b;
	}
	.empty {
		margin-top: 12px;
		border-radius: 8px;
		background: #f8fafc;
		padding: 12px;
		color: #64748b;
	}
	.workspace {
		display: grid;
		grid-template-columns: 230px 1fr;
		gap: 12px;
		align-items: start;
	}
	nav {
		position: sticky;
		top: 12px;
		display: grid;
		gap: 5px;
	}
	nav button {
		min-height: 42px;
		display: flex;
		gap: 8px;
		align-items: center;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		padding: 7px 9px;
		color: #475569;
		text-align: left;
		cursor: pointer;
	}
	nav button.active {
		border-color: #991b1b;
		background: #fef2f2;
		color: #991b1b;
	}
	nav button span {
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #f1f5f9;
		font-size: 0.72rem;
		font-weight: 900;
	}
	nav button i {
		margin-left: auto;
		color: #b91c1c;
	}
	.wizard {
		min-height: 480px;
		display: grid;
		gap: 14px;
	}
	.fields {
		display: grid;
		gap: 10px;
	}
	.fields.two {
		grid-template-columns: repeat(2, 1fr);
	}
	.wide {
		grid-column: 1/-1;
	}
	label {
		display: grid;
		gap: 5px;
		color: #475569;
		font-size: 0.82rem;
		font-weight: 800;
	}
	label.check {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	label.check input {
		width: auto;
	}
	input,
	textarea,
	button {
		font: inherit;
	}
	input,
	textarea {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		padding: 8px;
		color: #172033;
	}
	textarea {
		min-height: 70px;
		resize: vertical;
	}
	input:disabled {
		background: #f1f5f9;
	}
	.branch-grid,
	.module-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		align-items: start;
	}
	fieldset {
		display: grid;
		gap: 9px;
		border: 1px solid #dbe3ef;
		border-radius: 9px;
		padding: 12px;
	}
	legend {
		padding: 0 5px;
		font-weight: 900;
	}
	.issue-list {
		display: grid;
		gap: 5px;
		border-radius: 8px;
		background: #fef2f2;
		padding: 10px;
		color: #991b1b;
	}
	.issue-list p {
		margin: 0;
		font-size: 0.82rem;
	}
	.issue-list p.warning {
		color: #9a3412;
	}
	.step-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid #edf2f7;
		padding-top: 12px;
	}
	button,
	.preview-links a {
		min-height: 38px;
		border: 0;
		border-radius: 7px;
		background: #991b1b;
		padding: 8px 13px;
		color: #fff;
		font-weight: 850;
		cursor: pointer;
	}
	button.secondary,
	.preview-links a {
		border: 1px solid #cbd5e1;
		background: #fff;
		color: #334155;
		text-decoration: none;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.publish-bar,
	.publish-card {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
		border: 1px solid #dbe3ef;
		border-radius: 10px;
		background: #fff;
		padding: 12px;
	}
	.preview-links {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.publish-card {
		border-color: #fecaca;
		background: #fffafa;
	}
	.notice {
		border-radius: 8px;
		padding: 10px;
	}
	.notice.error {
		background: #fef2f2;
		color: #991b1b;
	}
	.notice.success {
		background: #ecfdf5;
		color: #047857;
	}
	.history {
		display: grid;
		gap: 8px;
	}
	details {
		border-top: 1px solid #e2e8f0;
		padding-top: 8px;
	}
	details div {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 8px;
	}
	details a {
		color: #991b1b;
	}
	@media (max-width: 900px) {
		header,
		.panel-heading,
		.publish-bar,
		.publish-card {
			display: grid;
		}
		.workspace {
			grid-template-columns: 1fr;
		}
		nav {
			position: static;
			grid-template-columns: repeat(2, 1fr);
		}
		.branch-grid,
		.module-grid,
		.document-grid {
			grid-template-columns: 1fr;
		}
		.fields.two {
			grid-template-columns: 1fr;
		}
		.wide {
			grid-column: auto;
		}
	}
</style>
