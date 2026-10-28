<script lang="ts">
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	let failed = $state(false);
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import {
		participationFields,
		participationFieldVisible,
		type FormField
	} from '@scouts-cluj/parental-consent-schema';
	import { registrationRequest, type Answer, type Registration } from './registration';
	let { row, activityId, token }: { row: Registration; activityId: number; token: string } =
		$props();
	let editing = $state(false),
		busy = $state(false),
		message = $state('');
	let answers = $state<Record<string, Answer>>(untrack(() => structuredClone(row.answers ?? {})));
	const fields = $derived<FormField[]>([
		...participationFields.filter(
			(f) =>
				participationFieldVisible(f.code, editing ? answers : (row.answers ?? {})) &&
				f.type !== 'signature' &&
				(row.minor ||
					![
						'guardian_name',
						'guardian_relation',
						'guardian_phone',
						'secondary_phone',
						'acknowledgement'
					].includes(f.code))
		),
		...(row.questions ?? [])
			.filter((q) => !q.branches.length || q.branches.includes(row.branch))
			.map((q) => ({
				code: `custom_${q.code}`,
				label: q.label,
				required: q.required,
				type:
					q.type === 'multiple'
						? ('multiple_choice' as const)
						: q.type === 'choice'
							? ('single_choice' as const)
							: q.type === 'text'
								? ('long_text' as const)
								: q.type,
				options: q.options.map((o) => ({ value: o, label: o }))
			}))
	]);
	function label(field: FormField, value: Answer | undefined) {
		if (value === undefined || value === '') return 'Nedeclarat';
		if (typeof value === 'boolean') return value ? 'Da' : 'Nu';
		const values = Array.isArray(value) ? value : [String(value)];
		return (
			values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(', ') ||
			'Niciun consimțământ'
		);
	}
	function select(code: string, value: string, checked: boolean) {
		const previous = Array.isArray(answers[code]) ? (answers[code] as string[]) : [];
		answers[code] = checked ? [...previous, value] : previous.filter((v) => v !== value);
	}
	async function save() {
		busy = true;
		message = '';
		failed = false;
		try {
			await registrationRequest(
				activityId,
				`registrations/${row.id}/answers`,
				{ revision: row.revision, answers },
				token
			);
			editing = false;
			await invalidateAll();
			message =
				'Informațiile au fost actualizate. Descarcă și semnează din nou acordul actualizat, dacă este necesar.';
		} catch (e) {
			failed = true;
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<section>
	<h2>Informațiile declarate</h2>
	{#if !editing}<dl>
			{#each fields as field (field.code)}<dt>{field.label}</dt>
				<dd>{label(field, row.answers?.[field.code])}</dd>{/each}
		</dl>
		{#if row.canEdit && !['withdrawn', 'rejected'].includes(row.state)}<button
				onclick={() => {
					answers = structuredClone(row.answers ?? {});
					editing = true;
				}}>Actualizează informațiile</button
			>{/if}
	{:else}<form
			onsubmit={(e) => {
				e.preventDefault();
				void save();
			}}
		>
			{#each fields as field (field.code)}
				{#if field.type === 'multiple_choice'}<fieldset>
						<legend>{field.label}</legend>{#each field.options ?? [] as option (option.value)}<label
								class="choice"
								><input
									type="checkbox"
									checked={Array.isArray(answers[field.code]) &&
										(answers[field.code] as string[]).includes(option.value)}
									onchange={(e) => select(field.code, option.value, e.currentTarget.checked)}
								/>{option.label}</label
							>{/each}
					</fieldset>
				{:else if field.type === 'acknowledgement'}<label class="choice"
						><input
							type="checkbox"
							required
							checked={answers[field.code] === true}
							onchange={(e) => (answers[field.code] = e.currentTarget.checked)}
						/>{field.label}</label
					>
				{:else}<label
						>{field.label}{#if field.options?.length}<select
								required={field.required}
								value={String(answers[field.code] ?? '')}
								onchange={(e) => (answers[field.code] = e.currentTarget.value)}
								><option value="">Alege</option
								>{#each field.options as option (option.value)}<option value={option.value}
										>{option.label}</option
									>{/each}</select
							>{:else if field.type === 'long_text'}<textarea
								required={field.required}
								value={String(answers[field.code] ?? '')}
								oninput={(e) => (answers[field.code] = e.currentTarget.value)}
							></textarea>{:else if field.type === 'date'}<DateInput
								value={String(answers[field.code] ?? '')}
								required={field.required}
								disabled={field.code === 'birth_date'}
								onValueChange={(value) => (answers[field.code] = value)}
							/>{:else}<input
								type={field.type === 'number' ? 'number' : 'text'}
								required={field.required}
								disabled={field.code === 'birth_date'}
								value={String(answers[field.code] ?? '')}
								oninput={(e) =>
									(answers[field.code] =
										field.type === 'number'
											? Number(e.currentTarget.value)
											: e.currentTarget.value)}
							/>{/if}</label
					>{/if}
			{/each}
			<p>
				Modificarea datelor păstrează documentele anterioare și necesită un acord actualizat pentru
				minori.
			</p>
			<div class="actions">
				<button disabled={busy}>Salvează informațiile</button><button
					type="button"
					onclick={() => (editing = false)}
					disabled={busy}>Renunță</button
				>
			</div>
		</form>{/if}
	{#if message}<FormFeedback {message} kind={failed ? 'error' : 'success'} />{/if}
</section>

<style>
	section,
	form {
		display: grid;
		gap: 16px;
	}
	h2 {
		font-size: 1.25rem;
		margin: 0;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 8px;
	}
	dt {
		font-weight: 600;
		margin-top: 8px;
	}
	dd {
		margin: 0;
		color: var(--sc-ink-muted);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.6;
	}
	label {
		display: grid;
		gap: 6px;
	}
	.choice,
	.actions {
		display: flex;
		gap: 8px;
		align-items: start;
	}
	fieldset {
		border: 1px solid var(--sc-border);
		display: grid;
		gap: 12px;
		padding: 12px;
		min-width: 0;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		padding: 10px;
		width: 100%;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
	}
	button {
		width: fit-content;
		min-height: 38px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		padding: 10px 16px;
		background: var(--sc-surface);
		color: var(--sc-accent);
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
	}
	p {
		line-height: 1.6;
	}
</style>
