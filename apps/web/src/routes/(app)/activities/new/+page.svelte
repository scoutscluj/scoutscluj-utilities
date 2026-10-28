<script lang="ts">
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { untrack, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import RegistrationSettingsEditor from '$lib/activities/RegistrationSettings.svelte';
	import ActivityTeamFields from '$lib/activities/ActivityTeamFields.svelte';
	import {
		money,
		registrationIssues,
		type RegistrationSettings
	} from '$lib/activities/registration';
	import { departmentOptions, activityTypeOptions } from '../[activityId]/activity-meta';
	let { data, form } = $props();
	type Values = {
		title: string;
		type: string;
		startDate: string;
		endDate: string;
		location: string;
		description: string;
		departments: string[];
		coordinatorId: number;
		administratorIds: number[];
		registrationSettings: RegistrationSettings;
	};
	let value = $state<Values>(
		untrack(
			() =>
				(form && 'values' in form && form.values
					? form.values
					: {
							title: '',
							type: 'camp',
							startDate: '',
							endDate: '',
							location: '',
							description: '',
							departments: ['administrative', 'finance'],
							coordinatorId: data.user.id,
							administratorIds: [data.user.id],
							registrationSettings: structuredClone(data.setup.settings)
						}) as Values
		)
	);
	let step = $state(untrack(() => (form?.message ? 5 : 0)));
	let busy = $state(false);
	let node = $state<HTMLFormElement>();
	const submissionIssues = $derived(
		registrationIssues(form && 'issues' in form ? form.issues : [])
	);
	const steps = [
		'Detalii',
		'Echipă și departamente',
		'Înscrieri',
		'Acord de participare',
		'Taxă și plată',
		'Verificare'
	];
	const section = $derived(step === 3 ? 'consent' : step === 4 ? 'payment' : 'registration');
	const payload = $derived(
		JSON.stringify({
			...value,
			registrationSettings: {
				...value.registrationSettings,
				opensAt: value.registrationSettings.opensAt
					? new Date(value.registrationSettings.opensAt).toISOString()
					: '',
				closesAt: value.registrationSettings.closesAt
					? new Date(value.registrationSettings.closesAt).toISOString()
					: ''
			}
		})
	);
	function next() {
		if (node?.reportValidity()) step = Math.min(5, step + 1);
	}
</script>

<svelte:head><title>Activitate nouă | Scouts Cluj</title></svelte:head>
<main>
	<a href={resolve('/activities')}>← Activități</a>
	<h1>Pregătește o activitate nouă</h1>
	<p>
		Parcurge configurarea inițială. Toate informațiile pot fi modificate ulterior din Setările
		activității.
	</p>
	<nav aria-label="Pașii configurării">
		{#each steps as label, index (index)}<span
				aria-current={index === step ? 'step' : undefined}
				class:active={index === step}>{index + 1}. {label}</span
			>{/each}
	</nav>
	<form
		method="POST"
		bind:this={node}
		use:enhance={({ cancel }) => {
			if (step < 5) {
				cancel();
				next();
				return;
			}
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<input type="hidden" name="payload" value={payload} />
		{#if step === 0}<section>
				<h2>1. Detalii despre activitate</h2>
				<label>Nume<input bind:value={value.title} maxlength="255" required /></label><label
					>Tip<select bind:value={value.type}
						>{#each activityTypeOptions as option (option.value)}<option value={option.value}
								>{option.label}</option
							>{/each}</select
					></label
				>
				<div class="grid">
					<label>Început<DateInput type="date" bind:value={value.startDate} required /></label
					><label
						>Final<DateInput
							type="date"
							bind:value={value.endDate}
							min={value.startDate}
							required
						/></label
					>
				</div>
				<label>Locație<input bind:value={value.location} maxlength="255" required /></label><label
					>Descriere pentru participanți<textarea rows="5" bind:value={value.description}
					></textarea></label
				>
			</section>{/if}
		{#if step === 1}<section>
				<h2>2. Cine organizează și ce departamente folosiți?</h2>
				<ActivityTeamFields
					users={data.teamOptions}
					bind:coordinatorId={value.coordinatorId}
					bind:administratorIds={value.administratorIds}
				/>
				<fieldset>
					<legend>Departamente</legend>{#each departmentOptions as department (department.id)}<label
							class="choice"
							><input type="checkbox" bind:group={value.departments} value={department.id} /><span
								><strong>{department.label}</strong> — {department.description}</span
							></label
						>{/each}
				</fieldset>
			</section>{/if}
		{#if step >= 2 && step <= 4}<section>
				<h2>{step + 1}. {steps[step]}</h2>
				<RegistrationSettingsEditor
					{submissionIssues}
					activity={value}
					embedded
					{section}
					activityId={0}
					initial={data.setup.settings}
					bind:value={value.registrationSettings}
					revision={0}
					lists={data.setup.lists}
					fee={data.setup.fee}
				/>
			</section>{/if}
		{#if step === 5}<section>
				<h2>6. Verifică înainte de creare</h2>
				<label class="choice"
					><input type="checkbox" bind:checked={value.registrationSettings.published} />Publică
					activitatea imediat după creare</label
				>
				<dl>
					<dt>Activitate</dt>
					<dd>{value.title}</dd>
					<dt>Perioadă și locație</dt>
					<dd>{value.startDate} – {value.endDate} · {value.location}</dd>
					<dt>Organizator</dt>
					<dd>{data.teamOptions.find((user) => user.id === value.coordinatorId)?.displayName}</dd>
					<dt>Administratori</dt>
					<dd>{value.administratorIds.length}</dd>
					<dt>Taxă</dt>
					<dd>{money(value.registrationSettings.feeBani)}</dd>
					<dt>Acord parental</dt>
					<dd>
						{value.registrationSettings.consent
							? 'Date completate — verifică PDF-ul după creare'
							: 'Neconfigurat; minorii nu se pot înscrie încă.'}
					</dd>
				</dl>
				<label class="choice"
					><input type="checkbox" bind:checked={value.registrationSettings.published} />Publică
					pagina și deschide înscrierile conform perioadei configurate</label
				>
				<p>
					Dacă nu publici acum, activitatea se salvează intern. Poți continua configurarea și
					verifica PDF-ul din Setări înainte să distribui pagina.
				</p>
			</section>{/if}
		{#if form?.message}<FormFeedback
				message={form.message}
				issues={submissionIssues}
				onField={async (field) => {
					if (field.startsWith('consent.')) {
						step = 3;
						await tick();
						const node = document.getElementById(`consent-${field.slice(8)}`);
						node?.scrollIntoView({ block: 'center' });
						node?.focus();
					}
				}}
			/>{/if}
		<footer>
			{#if step > 0}<button type="button" class="secondary" onclick={() => step--} disabled={busy}
					>Înapoi</button
				>{/if}{#if step < 5}<button type="button" onclick={next}>Continuă →</button>{:else}<button
					disabled={busy}>{busy ? 'Se creează…' : 'Creează activitatea'}</button
				>{/if}
		</footer>
	</form>
</main>

<style>
	main {
		max-width: 1000px;
		display: grid;
		gap: 20px;
	}
	h1,
	h2,
	p {
		margin: 0;
	}
	p {
		line-height: 1.6;
		color: var(--sc-ink-muted);
	}
	nav,
	footer,
	.choice {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}
	nav span {
		padding: 8px 12px;
		background: var(--sc-surface);
		border-radius: 7px;
		color: var(--sc-ink-muted);
	}
	nav .active {
		background: var(--sc-accent);
		color: white;
	}
	section {
		display: grid;
		gap: 18px;
	}
	label {
		display: grid;
		gap: 8px;
	}
	form {
		display: grid;
		gap: 24px;
	}
	fieldset {
		border: 1px solid var(--sc-border);
		padding: 18px;
		border-radius: 10px;
		display: grid;
		gap: 12px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
	}
	button {
		padding: 12px 20px;
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: white;
		font: inherit;
		cursor: pointer;
	}
	.secondary {
		background: var(--sc-surface);
		color: var(--sc-ink);
		border: 1px solid var(--sc-border);
	}
	dl {
		display: grid;
		grid-template-columns: 160px 1fr;
		gap: 12px;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 0;
	}
	a {
		color: var(--sc-accent);
	}
	@media (max-width: 600px) {
		.grid,
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
