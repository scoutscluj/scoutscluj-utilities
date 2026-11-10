<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { untrack } from 'svelte';
	import type { AdmissionUnit } from './admissions';
	let {
		units,
		requestKey,
		action = '',
		values = {},
		submitLabel = 'Trimite cererea de înscriere'
	}: {
		units: AdmissionUnit[];
		requestKey: string;
		action?: string;
		values?: Record<string, unknown>;
		submitLabel?: string;
	} = $props();
	let birthDate = $state(untrack(() => String(values.birthDate ?? '')));
	let forChild = $state(untrack(() => values.forChild === 'on' || values.forChild === true));
	let schooling = $state(untrack(() => String(values.schooling ?? '')));
	let structureId = $state(
		untrack(() =>
			String(values.structureId ?? units.find((u) => u.id === values.unitId)?.structureId ?? '')
		)
	);
	let unitId = $state(untrack(() => String(values.unitId ?? '')));
	const branchLabels: Record<string, string> = {
		lupisori: 'Lupișori',
		temerari: 'Temerari',
		exploratori: 'Exploratori',
		seniori: 'Seniori',
		voluntari: 'Voluntari adulți'
	};
	const today = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Bucharest',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
	const minor = $derived(
		!!birthDate && birthDate > `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`
	);
	const age = $derived(
		birthDate
			? Number(today.slice(0, 4)) -
					Number(birthDate.slice(0, 4)) -
					(today.slice(5) < birthDate.slice(5) ? 1 : 0)
			: null
	);
</script>

<form method="POST" {action}>
	<input type="hidden" name="requestKey" value={String(values.requestKey ?? requestKey)} />
	{#if values.id}<input type="hidden" name="id" value={String(values.id)} /><input
			type="hidden"
			name="revision"
			value={String(values.revision)}
		/>{/if}
	<label class="check"
		><input type="checkbox" name="forChild" bind:checked={forChild} /> Completez pentru copilul meu /
		un copil aflat în tutela mea</label
	>
	<fieldset>
		<legend>{forChild ? 'Datele copilului' : 'Datele viitorului membru'}</legend>
		<div class="fields">
			<label
				>Prenume <input
					name="firstName"
					autocomplete="given-name"
					required
					maxlength="120"
					value={String(values.firstName ?? '')}
				/></label
			>
			<label
				>Nume de familie <input
					name="lastName"
					autocomplete="family-name"
					required
					maxlength="120"
					value={String(values.lastName ?? '')}
				/></label
			>
			<label
				>Data nașterii <DateInput
					name="birthDate"
					bind:value={birthDate}
					max={today}
					required
				/></label
			>
			<p class="age">{age === null ? 'Vârsta se calculează din data nașterii.' : `${age} ani`}</p>
			<label
				>Situație școlară <select name="schooling" required bind:value={schooling}
					><option value="" disabled>Alege o variantă</option><option value="grade"
						>Sunt elev / copilul este elev</option
					><option value="not-in-school">Nu sunt elev / copilul nu este elev</option></select
				></label
			>
			{#if schooling === 'grade'}<label
					>Clasă <select name="grade" required value={String(values.grade ?? '')}
						><option value="" disabled>Alege clasa</option
						>{#each Array.from({ length: 13 }, (_, n) => n) as grade (grade)}<option value={grade}
								>{grade === 0 ? 'Pregătitoare' : `Clasa ${grade}`}</option
							>{/each}</select
					></label
				>{/if}
			<label
				>Structură <select
					name="structureId"
					required
					bind:value={structureId}
					onchange={() => {
						unitId = '';
					}}
				>
					<option value="" disabled>Alege structura</option>
					<option value="cluj">Cluj</option><option value="floresti">Florești</option>
				</select></label
			>
			<label
				>Ramura de vârstă <select name="unitId" bind:value={unitId} disabled={!structureId}
					><option value="">Am nevoie de îndrumare</option
					>{#each units.filter((u) => u.structureId === structureId) as unit (unit.id)}<option
							value={unit.id}>{branchLabels[unit.branch ?? ''] ?? unit.name}</option
						>{/each}</select
				></label
			>
			<div class="email-field">
				<label
					>Email{minor || forChild ? ' propriu, dacă există' : ''}
					<input
						type="email"
						name="email"
						aria-describedby="member-email-hint"
						autocomplete="email"
						required={!minor && !forChild}
						value={String(values.email ?? '')}
					/></label
				>
				<small id="member-email-hint" class="hint"
					><span class="email-guidance"
						>Emailul folosit e de preferat să fie al persoanei ce deține contul.</span
					>{#if minor || forChild}De preferat emailul propriu al copilului, dacă are. Dacă nu are,
						lasă câmpul gol. Nu folosi emailul părintelui sau o adresă folosită deja pentru alt cont
						Orgo ori alt membru.{:else}Folosește emailul tău propriu. Dacă ai deja un cont Orgo cu
						această adresă, autentifică-te în loc să trimiți o cerere nouă.{/if} Verificăm adresa înainte
					de trimiterea cererii.</small
				>
			</div>
			<label
				>Telefon{minor || forChild ? ' propriu, dacă există' : ''}
				<input
					type="tel"
					name="phone"
					autocomplete="tel"
					maxlength="40"
					value={String(values.phone ?? '')}
				/></label
			>
		</div>
	</fieldset>
	{#if minor || forChild}
		<fieldset>
			<legend>Părinte / tutore</legend>
			<p class="hint">
				Aceste date rămân în Resurse Scouts Cluj și pot fi refolosite la înscrierile la activități
				și la acorduri.
			</p>
			<div class="fields">
				<label
					>Nume complet <input
						name="guardianName"
						required
						value={String(values.guardianName ?? '')}
					/></label
				>
				<label
					>Relația cu copilul <select
						name="guardianRelation"
						required
						value={String(values.guardianRelation ?? '')}
						><option value="" disabled>Alege relația</option><option>Părinte</option><option
							>Tutore legal</option
						></select
					></label
				>
				<label
					>Email părinte / tutore <input
						type="email"
						name="guardianEmail"
						required
						value={String(values.guardianEmail ?? '')}
					/></label
				>
				<label
					>Telefon părinte / tutore <input
						type="tel"
						name="guardianPhone"
						required
						maxlength="40"
						value={String(values.guardianPhone ?? '')}
					/></label
				>
			</div>
		</fieldset>
	{/if}
	<label class="check"
		><input
			type="checkbox"
			name="consent"
			required
			checked={values.consent === 'on' || values.consent === true}
		/> Sunt de acord ca datele să fie folosite pentru procesarea înscrierii în centrul local și administrarea
		participării la cercetășie.</label
	>
	<p class="hint">
		Cererea va fi verificată de un admin sau de un lider al unității alese. Contul Orgo este creat
		sau asociat numai după confirmare.
	</p>
	<button type="submit">{submitLabel}</button>
</form>

<style>
	form {
		display: grid;
		gap: 24px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		font-weight: 600;
		font-size: 1.15rem;
		margin-bottom: 16px;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.email-field {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		align-items: center;
	}
	.email-guidance {
		display: block;
		color: var(--sc-ink);
		margin-bottom: 8px;
	}
	label {
		display: grid;
		gap: 8px;
		font-weight: 500;
		font-size: 0.9rem;
	}
	input,
	select {
		width: 100%;
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		box-sizing: border-box;
	}
	.check {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		line-height: 1.5;
		font-weight: 400;
	}
	.check input {
		width: 20px;
		min-height: 20px;
		flex-shrink: 0;
		margin-top: 2px;
		accent-color: var(--sc-accent);
	}
	.hint,
	.age {
		color: var(--sc-muted);
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
	}
	.age {
		align-self: center;
	}
	button {
		min-height: 44px;
		padding: 12px 20px;
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: var(--sc-surface);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-accent-hover);
	}
	:global(input:focus-visible),
	select:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	@media (max-width: 600px) {
		.fields,
		.email-field {
			grid-template-columns: 1fr;
		}
	}
</style>
