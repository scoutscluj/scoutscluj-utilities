<script lang="ts">
	import InfoHint from '$lib/components/ui/InfoHint.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import UserRound from '@lucide/svelte/icons/user-round';
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { AdmissionUnit } from './admissions';
	let {
		units,
		requestKey,
		action = '',
		values = {},
		existingPhotoUrl = '',
		submitLabel = 'Trimite cererea de înscriere'
	}: {
		units: AdmissionUnit[];
		requestKey: string;
		action?: string;
		values?: Record<string, unknown>;
		existingPhotoUrl?: string;
		submitLabel?: string;
	} = $props();
	let registrationFor = $state(
		untrack(() =>
			String(values.registrationFor ?? (values.id ? (values.forChild ? 'other' : 'self') : ''))
		)
	);
	let firstName = $state(untrack(() => String(values.firstName ?? '')));
	let lastName = $state(untrack(() => String(values.lastName ?? '')));
	let photoInput = $state<HTMLInputElement>();
	const initials = $derived(
		[firstName, lastName].map((name) => name.trim().charAt(0).toLocaleUpperCase('ro-RO')).join('')
	);
	let birthDate = $state(untrack(() => String(values.birthDate ?? '')));
	let schooling = $state(untrack(() => String(values.schooling ?? '')));
	let structureId = $state(
		untrack(() =>
			String(values.structureId ?? units.find((u) => u.id === values.unitId)?.structureId ?? '')
		)
	);
	let unitId = $state(untrack(() => String(values.unitId ?? '')));
	let photo = $state(untrack(() => String(values.photo ?? '')));
	let keepPhoto = $state(true);
	let photoError = $state('');
	let readingPhoto = $state(false);
	let pending = $state(false);
	let photoSelection = 0;
	const other = $derived(registrationFor === 'other');
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
	const person = $derived(other ? ' copilului / persoanei' : '');
	const preview = $derived(photo || (keepPhoto ? existingPhotoUrl : ''));
	async function selectPhoto(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const selection = ++photoSelection;
		readingPhoto = false;
		photoError = '';
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2097152) {
			photoError = 'Alege o fotografie JPG, PNG sau WebP de maximum 2 MB.';
			input.value = '';
			return;
		}
		readingPhoto = true;
		try {
			const data = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(new Error('read'));
				reader.readAsDataURL(file);
			});
			if (selection === photoSelection) photo = data;
		} catch {
			if (selection === photoSelection)
				photoError = 'Fotografia nu a putut fi citită. Alege din nou fișierul.';
		} finally {
			if (selection === photoSelection) readingPhoto = false;
			input.value = '';
		}
	}
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			try {
				await update({ reset: false });
			} finally {
				pending = false;
			}
		};
	}}
>
	<input type="hidden" name="requestKey" value={String(values.requestKey ?? requestKey)} />
	{#if values.id}<input type="hidden" name="id" value={String(values.id)} /><input
			type="hidden"
			name="revision"
			value={String(values.revision)}
		/>{/if}
	<fieldset class="mode-choice">
		<legend>Pentru cine completezi înscrierea?</legend>
		<div class="choices">
			<label class:selected={registrationFor === 'self'}
				><input
					type="radio"
					name="registrationFor"
					value="self"
					required
					bind:group={registrationFor}
				/><span
					><strong>Pentru mine</strong><small>Vreau să mă înscriu în centrul local.</small></span
				></label
			>
			<label class:selected={other}
				><input
					type="radio"
					name="registrationFor"
					value="other"
					required
					bind:group={registrationFor}
				/><span
					><strong>Pentru copilul meu / altă persoană</strong><small
						>Completez datele persoanei pe care o înscriu.</small
					></span
				></label
			>
		</div>
	</fieldset>
	{#if registrationFor}
		<fieldset>
			<legend>{other ? 'Datele copilului / persoanei înscrise' : 'Datele tale'}</legend>
			<div class="fields">
				<label
					>Prenumele{person}<input
						name="firstName"
						autocomplete={other ? 'off' : 'given-name'}
						required
						maxlength="120"
						bind:value={firstName}
					/></label
				>
				<label
					>Numele de familie{other ? ' al copilului / persoanei' : ''}<input
						name="lastName"
						autocomplete={other ? 'off' : 'family-name'}
						required
						maxlength="120"
						bind:value={lastName}
					/></label
				>
				<label
					>Data nașterii{person}<DateInput
						name="birthDate"
						bind:value={birthDate}
						max={today}
						required
					/></label
				>
				<label
					>Genul{person}<select name="gender" required value={String(values.gender ?? '')}
						><option value="" disabled>Alege genul</option><option value="F">Feminin</option><option
							value="M">Masculin</option
						></select
					></label
				>
				<p class="age full">
					{age === null ? 'Vârsta se calculează din data nașterii.' : `${age} ani`}
				</p>
				<div class="photo-field full">
					<div class="avatar-upload">
						<button
							class="photo-avatar"
							type="button"
							aria-label={preview
								? 'Schimbă fotografia de profil'
								: 'Adaugă o fotografie de profil'}
							onclick={() => photoInput?.click()}
							disabled={pending || readingPhoto}
						>
							{#if preview}<img
									src={preview}
									alt="Previzualizare fotografie de profil"
								/>{:else if initials}<span class="initials" aria-hidden="true">{initials}</span
								>{:else}<UserRound size={40} aria-hidden="true" />{/if}
							<span class="camera-badge"><Camera size={17} aria-hidden="true" /></span>
						</button>
						<input
							class="photo-input"
							tabindex="-1"
							bind:this={photoInput}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onchange={selectPhoto}
							aria-label={other ? 'Fotografia copilului / persoanei' : 'Fotografie'}
						/>
					</div>
					<div class="photo-controls">
						<div class="photo-heading">
							<strong>Fotografie <span class="optional">(opțional)</span></strong><InfoHint
								label="Informații despre fotografia de profil"
								text="JPG, PNG sau WebP, maximum 2 MB. Fotografia va fi adăugată în profilul Orgo după aprobare. Apasă pe cerc pentru a o alege sau înlocui."
							/>
						</div>
						<p class="hint">
							{other
								? 'O poză bună ne ajută să recunoaștem persoana la început.'
								: 'O poză bună ne ajută să te recunoaștem la început.'}
						</p>
						{#if preview}<button
								class="text-button"
								type="button"
								onclick={() => {
									++photoSelection;
									photo = '';
									keepPhoto = false;
									readingPhoto = false;
									photoError = '';
								}}>Elimină fotografia</button
							>{/if}
						{#if photoError}<p class="error" role="alert">{photoError}</p>{/if}
						{#if readingPhoto}<p class="hint" role="status">Se pregătește fotografia…</p>{/if}
					</div>
					<input type="hidden" name="photo" value={photo} /><input
						type="hidden"
						name="keepPhoto"
						value={keepPhoto ? 'true' : 'false'}
					/>
				</div>
				<label
					>Situație școlară<select name="schooling" required bind:value={schooling}
						><option value="" disabled>Alege o variantă</option><option value="grade"
							>{other ? 'Este elev' : 'Sunt elev'}</option
						><option value="not-in-school">{other ? 'Nu este elev' : 'Nu sunt elev'}</option
						></select
					></label
				>
				{#if schooling === 'grade'}<label
						>Clasă<select name="grade" required value={String(values.grade ?? '')}
							><option value="" disabled>Alege clasa</option
							>{#each Array.from({ length: 13 }, (_, n) => n) as grade (grade)}<option value={grade}
									>{grade === 0 ? 'Pregătitoare' : `Clasa ${grade}`}</option
								>{/each}</select
						></label
					>{/if}
				<label
					>Structură<select
						name="structureId"
						required
						bind:value={structureId}
						onchange={() => {
							unitId = '';
						}}
						><option value="" disabled>Alege structura</option><option value="cluj">Cluj</option
						><option value="floresti">Florești</option></select
					></label
				>
				<label
					>Ramura de vârstă<select name="unitId" bind:value={unitId} disabled={!structureId}
						><option value="">Am nevoie de îndrumare</option
						>{#each units.filter((u) => u.structureId === structureId) as unit (unit.id)}<option
								value={unit.id}>{branchLabels[unit.branch ?? ''] ?? unit.name}</option
							>{/each}</select
					></label
				>
				<div class="email-field full" class:self-email={!other}>
					<label
						>{other ? 'Emailul copilului / persoanei' : 'Email'}<input
							type="email"
							name="email"
							required
							aria-describedby={other ? 'member-email-hint' : undefined}
							autocomplete={other ? 'off' : 'email'}
							maxlength="254"
							value={String(values.email ?? '')}
						/></label
					>
					{#if other}<div class="email-guidance">
							<small id="member-email-hint" class="hint"
								>De preferat, emailul copilului. Fiecare cont are nevoie de o adresă unică.</small
							><InfoHint
								label="Informații despre emailul contului"
								text="Dacă persoana înscrisă nu are email propriu, poți folosi o adresă a părintelui neutilizată pentru alt cont Orgo sau alt membru. Aceasta devine adresa de autentificare. Contactul părintelui se completează separat."
							/>
						</div>{/if}
				</div>
				<label
					>{other ? 'Telefonul copilului / persoanei' : 'Telefon'}
					<span class="optional">(opțional)</span><input
						type="tel"
						name="phone"
						autocomplete={other ? 'off' : 'tel'}
						maxlength="40"
						value={String(values.phone ?? '')}
					/></label
				>
			</div>
		</fieldset>
		{#if minor}
			<fieldset>
				<legend>Părinte / tutore</legend>
				<p class="hint section-intro">
					Pentru persoanele sub 18 ani, avem nevoie și de contactul unui părinte sau tutore. Aceste
					date sunt păstrate separat de contul membrului și pot fi refolosite la activități și
					acorduri.
				</p>
				<div class="fields">
					<label
						>Nume părinte<input
							name="guardianName"
							required
							maxlength="120"
							value={String(values.guardianName ?? '')}
						/></label
					>
					<label
						>Relația cu copilul<select
							name="guardianRelation"
							required
							value={String(values.guardianRelation ?? '')}
							><option value="" disabled>Alege relația</option><option>Părinte</option><option
								>Tutore legal</option
							></select
						></label
					>
					<label
						>Email părinte<input
							type="email"
							name="guardianEmail"
							required
							maxlength="254"
							value={String(values.guardianEmail ?? '')}
						/></label
					>
					<label
						>Telefon părinte<input
							type="tel"
							name="guardianPhone"
							required
							maxlength="40"
							value={String(values.guardianPhone ?? '')}
						/></label
					>
				</div>
			</fieldset>
		{:else if other && birthDate}
			<fieldset>
				<legend>Datele tale de contact</legend>
				<p class="hint section-intro">
					Tu trimiți cererea pentru un alt adult. Păstrăm contactul tău pentru clarificări, separat
					de contul persoanei înscrise.
				</p>
				<div class="fields">
					<label
						>Numele tău complet<input
							name="submitterName"
							required
							maxlength="120"
							value={String(values.submitterName ?? '')}
						/></label
					><label
						>Emailul tău de contact<input
							type="email"
							name="submitterEmail"
							required
							maxlength="254"
							value={String(values.submitterEmail ?? '')}
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
			participării la cercetășie, inclusiv pregătirea profilului în platforma națională Orgo.</label
		>
		<p class="hint">
			Cererea va fi verificată de un administrator sau un lider autorizat. Contul în Orgo
			(membri.scout.ro) se pregătește numai după aprobare.
		</p>
		<button class="submit" type="submit" disabled={pending || readingPhoto}
			>{pending ? 'Se trimite cererea…' : submitLabel}</button
		>
	{/if}
</form>

<style>
	form {
		display: grid;
		gap: 28px;
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
	.fields,
	.choices {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.choices label {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		padding: 16px;
		cursor: pointer;
	}
	.choices label.selected {
		border-color: var(--sc-accent);
		background: var(--sc-accent-soft);
	}
	.choices input {
		width: 18px;
		min-height: 18px;
		margin: 3px 0 0;
		flex-shrink: 0;
		accent-color: var(--sc-accent);
	}
	.choices span {
		display: grid;
		gap: 8px;
	}
	.choices strong {
		font-size: 0.95rem;
		line-height: 1.4;
	}
	.choices small {
		color: var(--sc-muted);
		font-weight: 400;
		line-height: 1.5;
	}
	.full {
		grid-column: 1 / -1;
	}
	.email-field {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		align-items: center;
	}
	.self-email {
		grid-template-columns: 1fr;
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
	.age,
	.optional {
		color: var(--sc-muted);
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
		font-weight: 400;
	}
	.optional {
		display: inline;
	}
	.section-intro {
		margin-bottom: 16px;
	}
	.photo-field {
		display: flex;
		gap: 20px;
		align-items: flex-start;
		padding: 16px;
		background: var(--sc-inset);
		border-radius: 10px;
	}
	.photo-controls {
		display: grid;
		gap: 10px;
		min-width: 0;
		flex: 1;
	}
	.avatar-upload {
		position: relative;
		flex-shrink: 0;
	}
	.photo-avatar {
		width: 112px;
		height: 112px;
		border-radius: 50%;
		border: 0;
		padding: 0;
		background: var(--sc-accent);
		color: var(--sc-surface);
		position: relative;
		display: grid;
		place-items: center;
	}
	.photo-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}
	.initials {
		font-size: 38px;
		font-weight: 600;
	}
	.camera-badge {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--sc-surface);
		color: var(--sc-accent);
		border: 1px solid var(--sc-border);
		display: grid;
		place-items: center;
	}
	.photo-input {
		position: absolute;
		width: 1px;
		height: 1px;
		min-height: 0;
		padding: 0;
		border: 0;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.photo-heading,
	.email-guidance {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.photo-heading strong {
		font-size: 14px;
	}

	input[type='file'] {
		background: var(--sc-surface);
		font-size: 0.8rem;
		padding: 8px;
	}
	.error {
		color: var(--sc-accent-hover);
		margin: 0;
		font-size: 0.85rem;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	.submit {
		min-height: 48px;
		padding: 12px 20px;
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: var(--sc-surface);
		font-weight: 600;
	}
	.submit:hover {
		background: var(--sc-accent-hover);
	}
	.submit:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.text-button {
		border: 0;
		background: transparent;
		color: var(--sc-accent);
		padding: 0;
		text-align: left;
		justify-self: start;
		text-decoration: underline;
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	@media (max-width: 600px) {
		.fields,
		.choices,
		.email-field {
			grid-template-columns: 1fr;
		}
		.photo-field {
			flex-direction: column;
		}
	}
</style>
