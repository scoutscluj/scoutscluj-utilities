<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import {
		registrationRequest,
		money,
		type RegistrationSettings,
		type Overview
	} from './registration';
	let {
		activityId,
		initial,
		revision,
		lists,
		fee
	}: {
		activityId: number;
		initial: RegistrationSettings;
		revision: number;
		lists: Overview['lists'];
		fee: { percentageBasisPoints: number; fixedBani: number };
	} = $props();
	function localInput(value: string) {
		if (!value || !value.includes('Z')) return value;
		const date = new Date(value);
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
	}
	let settings = $state(
		untrack(() => ({
			...structuredClone(initial),
			opensAt: localInput(initial.opensAt),
			closesAt: localInput(initial.closesAt)
		}))
	);
	let busy = $state(false),
		message = $state('');
	let desired = $state(untrack(() => initial.feeBani / 100));
	const branches = [
		{ id: 'lupisori', name: 'Lupișori' },
		{ id: 'temerari', name: 'Temerari' },
		{ id: 'exploratori', name: 'Exploratori' },
		{ id: 'seniori', name: 'Seniori' }
	];
	const suggestion = $derived(
		desired > 0
			? Math.ceil(
					((Math.round(desired * 100) + fee.fixedBani) * 10000) /
						((10000 - fee.percentageBasisPoints) * 500)
				) * 500
			: 0
	);
	const estimatedFee = $derived(
		suggestion > 0 ? Math.ceil((suggestion * fee.percentageBasisPoints) / 10000) + fee.fixedBani : 0
	);
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
			settings.groupIds = settings.groupIds.filter(
				(id) =>
					!settings.unitIds.length ||
					lists?.groups.some((g) => g.id === id && settings.unitIds.includes(g.parentId))
			);
	}
	async function save() {
		busy = true;
		message = '';
		try {
			await registrationRequest(activityId, 'settings', {
				revision,
				data: {
					...settings,
					opensAt: settings.opensAt ? new Date(settings.opensAt).toISOString() : '',
					closesAt: settings.closesAt ? new Date(settings.closesAt).toISOString() : ''
				}
			});
			await invalidateAll();
			message =
				'Setările au fost salvate. Taxele înscrierilor existente se modifică doar explicit.';
		} catch (e) {
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		void save();
	}}
>
	<fieldset>
		<legend>Publicare și înscriere</legend>
		<label class="choice"
			><input type="checkbox" bind:checked={settings.published} />Publică pagina activității și
			înscrierile</label
		>
		<div class="grid">
			<label>Deschidere<input type="datetime-local" bind:value={settings.opensAt} /></label><label
				>Închidere<input type="datetime-local" bind:value={settings.closesAt} /></label
			>
		</div>
		<label class="choice"
			><input type="checkbox" bind:checked={settings.approvalRequired} />Înscrierile beneficiarilor
			necesită aprobare</label
		>
		<label class="choice"
			><input type="checkbox" bind:checked={settings.paymentConfirmsPlace} />Confirmă locul numai
			după acoperirea taxei</label
		>
		<label>Termen de plată<input type="date" bind:value={settings.paymentDue} /></label>
		<p>
			Restanțele sunt semnalate. Eliberarea locurilor și promovarea de pe lista de așteptare se
			decid manual.
		</p>
	</fieldset>
	<fieldset>
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
	<fieldset>
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
					>{#each (lists?.units ?? []).filter((u) => !settings.structureIds.length || settings.structureIds.includes(u.structureId)) as unit (unit.id)}<option
							value={unit.id}>{unit.name}</option
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
					>{#each (lists?.groups ?? []).filter((g) => !settings.unitIds.length || settings.unitIds.includes(g.parentId)) as group (group.id)}<option
							value={group.id}>{group.name}</option
						>{/each}</select
				></label
			>
		</div>
	</fieldset>
	<fieldset>
		<legend>Taxă și comisionul procesatorului</legend>
		<label
			>Suma netă dorită, în lei<input
				type="number"
				min="0"
				step="0.01"
				bind:value={desired}
			/></label
		>
		<div class="notice">
			<p>
				Comision configurat: {fee.percentageBasisPoints / 100}% + {money(fee.fixedBani)}. Pentru o
				sumă netă de {money(Math.round((desired || 0) * 100))}, prețul recomandat, rotunjit în sus
				la 5 lei, este <strong>{money(suggestion)}</strong>.
			</p>
			<p>
				Comision estimat: {money(estimatedFee)} · Net estimat: {money(suggestion - estimatedFee)}.
			</p>
			<button type="button" class="secondary" onclick={() => (settings.feeBani = suggestion)}
				>Folosește prețul recomandat</button
			>
		</div>
		<label
			>Taxa finală, în lei<input
				type="number"
				min="0"
				step="0.01"
				required
				value={settings.feeBani / 100}
				oninput={(e) => (settings.feeBani = Math.round(Number(e.currentTarget.value) * 100))}
			/></label
		>
		<p>
			Aceeași taxă se aplică tuturor metodelor de plată. Comisionul este o estimare; susținerea
			centrului se înregistrează distinct.
		</p>
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
	<fieldset>
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
	<fieldset>
		<legend>Tranșe</legend>
		<p>
			Fără tranșe, se achită soldul integral. Pentru taxele reduse, tranșele se limitează la taxa
			participantului; soldul neacoperit de tranșe rămâne achitabil.
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
				><label>Scadența<input type="date" bind:value={installment.due} required /></label><button
					type="button"
					class="secondary"
					onclick={() => settings.installments.splice(index, 1)}>Elimină tranșa {index + 1}</button
				>
			</div>{/each}
		<button
			type="button"
			class="secondary"
			onclick={() => settings.installments.push({ amountBani: 0, due: '' })}>Adaugă tranșă</button
		>
	</fieldset>
	<fieldset>
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
	<fieldset>
		<legend>Condiții și responsabilități</legend><label
			>Condiții publice de participare, plată și retragere<textarea
				bind:value={settings.terms}
				rows="5"
			></textarea></label
		>
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
	{#if message}<p role="status">{message}</p>{/if}<button disabled={busy}
		>{busy ? 'Se salvează…' : 'Salvează setările înscrierilor'}</button
	>
</form>

<style>
	form,
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
	.notice,
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
