<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { getContext, onDestroy, untrack } from 'svelte';
	import { activityEditContext, type ActivityEditState } from './activity-edit-state';
	const editing = getContext<ActivityEditState | undefined>(activityEditContext);
	onDestroy(() => {
		if (editing) editing.dirty = false;
	});
	import { invalidateAll } from '$app/navigation';
	import { registrationSettingsPayload } from './settings-payload';
	import ConsentEditor from './ConsentEditor.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ParticipationFeeField from './ParticipationFeeField.svelte';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import { focusSettingIssue } from './setting-issues';
	import { emptyFixedConsent } from '@scouts-cluj/parental-consent-schema';
	import {
		registrationRequest,
		RegistrationError,
		type RegistrationIssue,
		type RegistrationSettings,
		type Overview
	} from './registration';
	let {
		activityId,
		initial,
		revision,
		lists,
		fee,
		embedded = false,
		section = 'all',
		activity,
		submissionIssues = [],
		value = $bindable()
	}: {
		activityId: number;
		submissionIssues?: RegistrationIssue[];
		activity?: { title?: string; location?: string; startDate?: string; endDate?: string };
		initial: RegistrationSettings;
		revision: number;
		lists: Overview['lists'];
		fee: { percentageBasisPoints: number; fixedBani: number };
		embedded?: boolean;
		section?: 'all' | 'registration' | 'consent' | 'payment';
		value?: RegistrationSettings;
	} = $props();
	function localInput(value: string) {
		if (!value || !value.includes('Z')) return value;
		const date = new Date(value);
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
	}
	let internal = $state(
		untrack(() => ({
			...structuredClone(initial),
			opensAt: localInput(initial.opensAt),
			closesAt: localInput(initial.closesAt)
		}))
	);
	const settings = $derived(value ?? internal);
	const eligibleUnits = $derived(
		(lists?.units ?? []).filter(
			(u) => !settings.structureIds.length || settings.structureIds.includes(u.structureId)
		)
	);
	const eligibleGroups = $derived(
		(lists?.groups ?? []).filter(
			(g) =>
				eligibleUnits.some((u) => u.id === g.parentId) &&
				(!settings.unitIds.length || settings.unitIds.includes(g.parentId))
		)
	);
	const multipleStructures = $derived(
		(settings.structureIds.length || lists?.structures.length || 0) > 1
	);
	const structureName = (id: string) => lists?.structures.find((s) => s.id === id)?.name ?? id;
	let baseRevision = $state(untrack(() => revision));
	let baseline = $state(untrack(() => JSON.stringify(internal)));
	$effect(() => {
		if (editing) editing.dirty = JSON.stringify(settings) !== baseline;
	});
	$effect(() => {
		if (
			!embedded &&
			revision !== baseRevision &&
			revision === editing?.publicationRevision &&
			JSON.stringify(settings) === baseline
		) {
			internal = {
				...structuredClone(initial),
				opensAt: localInput(initial.opensAt),
				closesAt: localInput(initial.closesAt)
			};
			baseline = JSON.stringify(internal);
			baseRevision = revision;
		}
	});
	let busy = $state(false),
		message = $state('');
	let failed = $state(false),
		issues = $state<RegistrationIssue[]>([]),
		applyOpen = $state(false);
	async function applyPlan() {
		busy = true;
		message = '';
		try {
			const result = await registrationRequest<{ count: number }>(
				activityId,
				'apply-installments',
				{ revision: baseRevision, confirm: true }
			);
			applyOpen = false;
			failed = false;
			message = `Planul de plată a fost aplicat pentru ${result.count} înscrieri. Taxele și încasările au fost păstrate.`;
			await invalidateAll();
		} catch (error) {
			failed = true;
			message = (error as Error).message;
			applyOpen = false;
		} finally {
			busy = false;
		}
	}
	const branches = [
		{ id: 'lupisori', name: 'Lupișori' },
		{ id: 'temerari', name: 'Temerari' },
		{ id: 'exploratori', name: 'Exploratori' },
		{ id: 'seniori', name: 'Seniori' }
	];
	function number(value: string) {
		return value === '' ? null : Number(value);
	}
	function selectGroup(kind: 'structureIds' | 'unitIds' | 'groupIds', values: string[]) {
		settings[kind] = values;
		if (kind === 'structureIds')
			settings.unitIds = settings.unitIds.filter(
				(id) =>
					!values.length || lists?.units.some((u) => u.id === id && values.includes(u.structureId))
			);
		if (kind !== 'groupIds')
			settings.groupIds = settings.groupIds.filter((id) => eligibleGroups.some((g) => g.id === id));
	}
	async function save() {
		busy = true;
		message = '';
		failed = false;
		issues = [];
		try {
			const saved = await registrationRequest<{ revision: number; data: RegistrationSettings }>(
				activityId,
				'settings',
				{
					revision: baseRevision,
					data: registrationSettingsPayload(settings)
				}
			);
			baseRevision = saved.revision;
			internal = {
				...structuredClone(saved.data),
				opensAt: localInput(saved.data.opensAt),
				closesAt: localInput(saved.data.closesAt)
			};
			baseline = JSON.stringify(internal);
			await invalidateAll();
			message =
				section === 'payment'
					? 'Setările de plată au fost salvate. Taxele înscrierilor existente se modifică doar explicit.'
					: section === 'consent'
						? 'Datele acordului au fost salvate. Documentele existente rămân în istoric.'
						: 'Setările înscrierilor au fost salvate.';
		} catch (e) {
			failed = true;
			issues = e instanceof RegistrationError ? e.issues : [];
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:element
	this={embedded ? 'div' : 'form'}
	class="settings-form"
	onsubmit={(e: SubmitEvent) => {
		e.preventDefault();
		void save();
	}}
>
	{#if message}<FormFeedback
			{message}
			kind={failed ? 'error' : 'success'}
			{issues}
			onField={(field) => void focusSettingIssue(activityId, field)}
		/>{/if}
	<fieldset
		id="inscrieri"
		hidden={section !== 'all' && section !== 'registration'}
		disabled={section !== 'all' && section !== 'registration'}
	>
		<legend>Publicare și înscriere</legend>
		<label
			>Imaginea activității (opțional, adresă HTTPS)<input
				type="url"
				bind:value={settings.coverImageUrl}
				placeholder="https://…"
			/></label
		>
		<div class="grid">
			<label>Deschidere<DateInput type="datetime-local" bind:value={settings.opensAt} /></label
			><label>Închidere<DateInput type="datetime-local" bind:value={settings.closesAt} /></label>
		</div>
		<label class="choice"
			><input type="checkbox" bind:checked={settings.approvalRequired} />Înscrierile beneficiarilor
			necesită aprobare</label
		>
	</fieldset>
	<fieldset
		id="acord"
		hidden={section !== 'all' && section !== 'consent'}
		disabled={section !== 'all' && section !== 'consent'}
	>
		<legend>Acord parental · format fix</legend>
		<p>
			Folosim formatul documentului Cântul Vâlvelor 2026. Textele generale și structura documentului
			sunt fixe; editorul de șabloane este suspendat temporar. Completează mai jos informațiile
			specifice acestei activități. Numele, perioada și locația sunt preluate din activitate.
		</p>
		{#if !settings.consent}<button
				type="button"
				onclick={() => (settings.consent = emptyFixedConsent())}
				>Pregătește acordul acestei activități</button
			>{/if}
		{#if settings.consent && (section === 'all' || section === 'consent')}
			<ConsentEditor
				{settings}
				{lists}
				{activityId}
				{activity}
				issues={[...issues, ...submissionIssues]}
				saved={!embedded && !!initial.consent}
			/>
		{/if}
	</fieldset>
	<fieldset
		id="locuri"
		hidden={section !== 'all' && section !== 'registration'}
		disabled={section !== 'all' && section !== 'registration'}
	>
		<legend>Locuri</legend>
		<div class="grid">
			{#each [{ key: 'beneficiaryCapacity', label: 'Beneficiari' }, { key: 'staffCapacity', label: 'Echipa adultă' }, { key: 'totalCapacity', label: 'Capacitate totală' }] as item (item.key)}
				<label
					>{item.label}<input
						type="number"
						min="0"
						step="1"
						value={settings[item.key as 'beneficiaryCapacity'] ?? ''}
						oninput={(e) =>
							(settings[item.key as 'beneficiaryCapacity'] = number(e.currentTarget.value))}
						placeholder="Fără limită"
					/></label
				>
			{/each}
			{#each branches as branch (branch.id)}<label
					>{branch.name}<input
						type="number"
						min="0"
						step="1"
						value={settings.branchCapacities[branch.id] ?? ''}
						placeholder="Fără limită"
						oninput={(e) => {
							if (e.currentTarget.value === '') delete settings.branchCapacities[branch.id];
							else settings.branchCapacities[branch.id] = Number(e.currentTarget.value);
						}}
					/></label
				>{/each}
		</div>
	</fieldset>
	<fieldset
		id="eligibilitate"
		hidden={section !== 'all' && section !== 'registration'}
		disabled={section !== 'all' && section !== 'registration'}
	>
		<legend>Grupuri eligibile</legend>
		<p>
			Fără selecții înseamnă toți membrii. Dacă alegi mai multe niveluri, participantul trebuie să
			corespundă fiecărui nivel.
		</p>
		<div class="grid">
			<label
				>Structuri<select
					multiple
					value={settings.structureIds}
					onchange={(e) =>
						selectGroup(
							'structureIds',
							Array.from(e.currentTarget.selectedOptions, (o) => o.value)
						)}
					>{#each lists?.structures ?? [] as structure (structure.id)}<option value={structure.id}
							>{structure.name}</option
						>{/each}</select
				></label
			>
			<label
				>Unități<select
					multiple
					value={settings.unitIds}
					onchange={(e) =>
						selectGroup(
							'unitIds',
							Array.from(e.currentTarget.selectedOptions, (o) => o.value)
						)}
					>{#each eligibleUnits as unit (unit.id)}<option value={unit.id}
							>{multipleStructures
								? `${structureName(unit.structureId)} · `
								: ''}{unit.name}</option
						>{/each}</select
				></label
			>
			<label
				>Subunități<select
					multiple
					value={settings.groupIds}
					onchange={(e) =>
						selectGroup(
							'groupIds',
							Array.from(e.currentTarget.selectedOptions, (o) => o.value)
						)}
					>{#each eligibleGroups as group (group.id)}<option value={group.id}
							>{multipleStructures
								? `${structureName(eligibleUnits.find((u) => u.id === group.parentId)!.structureId)} · `
								: ''}{group.name}</option
						>{/each}</select
				></label
			>
		</div>
	</fieldset>
	<fieldset
		id="plati"
		hidden={section !== 'all' && section !== 'payment'}
		disabled={section !== 'all' && section !== 'payment'}
	>
		<legend>Taxă de participare</legend>
		<ParticipationFeeField bind:value={settings.feeBani} {fee} />
		<details>
			<summary>Tarife pe ramuri</summary>
			<div class="grid">
				{#each branches as branch (branch.id)}<label
						>{branch.name}, lei<input
							type="number"
							min="0"
							step="0.01"
							value={settings.branchFees[branch.id] == null
								? ''
								: settings.branchFees[branch.id] / 100}
							placeholder="Taxa implicită"
							oninput={(e) => {
								if (e.currentTarget.value === '') delete settings.branchFees[branch.id];
								else
									settings.branchFees[branch.id] = Math.round(Number(e.currentTarget.value) * 100);
							}}
						/></label
					>{/each}
			</div>
		</details>
	</fieldset>
	<fieldset
		id="familie"
		hidden={section !== 'all' && section !== 'payment'}
		disabled={section !== 'all' && section !== 'payment'}
	>
		<legend>Confirmare și termene de plată</legend>
		<label class="choice"
			><input type="checkbox" bind:checked={settings.paymentConfirmsPlace} />Confirmă locul numai
			după acoperirea taxei</label
		>
		<label>Termen de plată<DateInput type="date" bind:value={settings.paymentDue} /></label>
		<p>
			Restanțele sunt semnalate. Eliberarea locurilor și promovarea de pe lista de așteptare se
			decid manual.
		</p>
	</fieldset>
	<fieldset
		id="reduceri-familie"
		hidden={section !== 'all' && section !== 'payment'}
		disabled={section !== 'all' && section !== 'payment'}
	>
		<legend>Reduceri de familie</legend>
		<p>
			Tarifele se aplică după confirmarea grupului familial participant la aceeași activitate.
			Ultimul tarif se aplică și următorilor membri.
		</p>
		{#each settings.familyFees as value, index (index)}<div class="row">
				<label
					>Membrul {index + 1}, lei<input
						type="number"
						min="0"
						step="0.01"
						value={value / 100}
						oninput={(e) =>
							(settings.familyFees[index] = Math.round(Number(e.currentTarget.value) * 100))}
					/></label
				><button
					type="button"
					class="secondary"
					onclick={() => settings.familyFees.splice(index, 1)}>Elimină tariful {index + 1}</button
				>
			</div>{/each}
		<button
			type="button"
			class="secondary"
			onclick={() => settings.familyFees.push(settings.feeBani)}>Adaugă tarif de familie</button
		>
	</fieldset>
	<fieldset
		id="transe"
		hidden={section !== 'all' && section !== 'payment'}
		disabled={section !== 'all' && section !== 'payment'}
	>
		<legend>Tranșe</legend>
		<p>
			Fără tranșe, se achită soldul integral. Pentru taxele reduse, tranșele se limitează la taxa
			participantului; soldul neacoperit de tranșe rămâne achitabil. Tranșele cash rămân în sold și
			se validează la primirea participantului. Plata cu cardul le exclude.
		</p>
		{#each settings.installments as installment, index (index)}<div class="row">
				<label
					>Suma, lei<input
						type="number"
						min="0.01"
						step="0.01"
						required
						value={installment.amountBani / 100}
						oninput={(e) =>
							(installment.amountBani = Math.round(Number(e.currentTarget.value) * 100))}
					/></label
				><label
					>Modalitate<select
						value={installment.method ?? 'platform'}
						onchange={(e) => (installment.method = e.currentTarget.value as 'platform' | 'cash')}
						><option value="platform">Card / transfer / înregistrare manuală</option><option
							value="cash">Doar cash la predare</option
						></select
					></label
				><label>Scadența<DateInput type="date" bind:value={installment.due} required /></label
				><button
					type="button"
					class="secondary"
					onclick={() => settings.installments.splice(index, 1)}>Elimină tranșa {index + 1}</button
				>
			</div>{/each}
		<button
			type="button"
			class="secondary"
			onclick={() =>
				settings.installments.push({
					amountBani: 0,
					due: '',
					key: crypto.randomUUID(),
					method: 'platform'
				})}>Adaugă tranșă</button
		>
		{#if !embedded}<p>
				Modificările se aplică înscrierilor viitoare. Pentru cele existente, salvează și aplică
				explicit planul.
			</p>
			<button
				type="button"
				class="secondary"
				disabled={busy || JSON.stringify(settings) !== baseline}
				onclick={() => (applyOpen = true)}>Aplică planul salvat înscrierilor existente</button
			>{/if}
	</fieldset>
	<fieldset
		id="intrebari"
		hidden={section !== 'all' && section !== 'registration'}
		disabled={section !== 'all' && section !== 'registration'}
	>
		<legend>Întrebări suplimentare</legend>
		{#each settings.questions as question, index (index)}<div class="question">
				<div class="grid">
					<label
						>Identificator<input
							bind:value={question.code}
							pattern="[a-z][a-z0-9_]*"
							required
						/></label
					><label>Întrebare<input bind:value={question.label} required /></label><label
						>Tip<select bind:value={question.type}
							><option value="text">Text</option><option value="choice">O singură alegere</option
							><option value="multiple">Alegeri multiple</option><option value="number"
								>Număr</option
							><option value="date">Dată</option></select
						></label
					>
				</div>
				{#if ['choice', 'multiple'].includes(question.type)}<label
						>Opțiuni, câte una pe linie<textarea
							value={question.options.join('\n')}
							oninput={(e) =>
								(question.options = e.currentTarget.value.split('\n').filter(Boolean))}
							required
						></textarea></label
					>{/if}
				<label
					>Ramuri — fără selecție înseamnă toate<select multiple bind:value={question.branches}
						>{#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option
							>{/each}</select
					></label
				>
				<label class="choice"
					><input type="checkbox" bind:checked={question.required} />Obligatorie</label
				><label class="choice"
					><input type="checkbox" bind:checked={question.inPdf} />Include răspunsul în acordul PDF</label
				><button type="button" class="secondary" onclick={() => settings.questions.splice(index, 1)}
					>Elimină întrebarea</button
				>
			</div>{/each}
		<button
			type="button"
			class="secondary"
			onclick={() =>
				settings.questions.push({
					code: `intrebare_${settings.questions.length + 1}`,
					label: '',
					type: 'text',
					required: false,
					options: [],
					branches: [],
					inPdf: false
				})}>Adaugă întrebare</button
		>
	</fieldset>
	<fieldset
		id="conditii"
		hidden={section !== 'all' && section !== 'payment'}
		disabled={section !== 'all' && section !== 'payment'}
	>
		<legend>Condiții de participare și plată</legend><label
			>Condiții publice de participare, plată și retragere<textarea
				bind:value={settings.terms}
				rows="5"
			></textarea></label
		>
	</fieldset>
	<fieldset
		id="acces-inscrieri"
		hidden={section !== 'all' && section !== 'registration'}
		disabled={section !== 'all' && section !== 'registration'}
	>
		<legend>Acces la înscrieri</legend>
		<details>
			<summary>Acces delegat la înscrieri</summary>
			<p>
				Introdu ID-urile conturilor din Resurse, separate prin virgulă. Acordă acces numai
				persoanelor desemnate.
			</p>
			<label
				>Responsabili medicali<input
					value={settings.medicalUserIds.join(', ')}
					oninput={(e) =>
						(settings.medicalUserIds = e.currentTarget.value
							.split(',')
							.map((v) => Number(v.trim()))
							.filter((v) => v > 0))}
				/></label
			><label
				>Responsabili administrativi<input
					value={settings.administrativeUserIds.join(', ')}
					oninput={(e) =>
						(settings.administrativeUserIds = e.currentTarget.value
							.split(',')
							.map((v) => Number(v.trim()))
							.filter((v) => v > 0))}
				/></label
			>
		</details>
	</fieldset>
	{#if !embedded}<button disabled={busy}
			>{busy
				? 'Se salvează…'
				: section === 'payment'
					? 'Salvează setările de plată'
					: section === 'consent'
						? 'Salvează acordul'
						: 'Salvează setările înscrierilor'}</button
		>{/if}
</svelte:element>

<Modal
	bind:open={applyOpen}
	title="Aplică planul de plată înscrierilor existente"
	description="Toate înscrierile active primesc tranșele salvate. Taxele individuale și încasările rămân aceleași. Plățile cu cardul în curs trebuie rezolvate înainte."
	><button type="button" disabled={busy} onclick={applyPlan}>Confirmă aplicarea planului</button
	></Modal
>

<style>
	fieldset[hidden] {
		display: none;
	}
	fieldset {
		scroll-margin-top: 24px;
	}
	.settings-form,
	fieldset,
	.question {
		display: grid;
		gap: 16px;
	}
	fieldset {
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		padding: 20px;
		min-width: 0;
	}
	legend {
		font-weight: 600;
	}
	label {
		display: grid;
		gap: 6px;
	}
	.choice {
		display: flex;
		align-items: start;
		gap: 8px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}
	.row {
		display: flex;
		align-items: end;
		gap: 12px;
		flex-wrap: wrap;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		padding: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		width: 100%;
	}
	select[multiple] {
		min-height: 110px;
	}
	button {
		width: fit-content;
		min-height: 38px;
		padding: 10px 16px;
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: #fff;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
	}
	.secondary {
		background: var(--sc-canvas);
		color: var(--sc-ink);
		border: 1px solid var(--sc-border);
	}
	p {
		margin: 0;
		line-height: 1.6;
		color: var(--sc-ink-muted);
	}
	.question {
		padding: 16px;
		background: var(--sc-canvas);
		border-radius: 10px;
		display: grid;
		gap: 12px;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
		margin-bottom: 12px;
	}
	@media (max-width: 600px) {
		fieldset {
			padding: 12px;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
