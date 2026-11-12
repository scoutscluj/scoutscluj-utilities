<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import type { Detail } from './types';
	let {
		fee,
		expanded = false,
		canRecord = false,
		submit
	}: {
		fee: Detail['fees'][number];
		expanded?: boolean;
		canRecord?: boolean;
		submit?: SubmitFunction;
	} = $props();
</script>

{#if fee.reviewReason}<p role="status">De verificat: {fee.reviewReason}</p>{/if}
{#if fee.obligationId}
	{#if !fee.current}
		<form method="POST" use:enhance={submit}>
			<input type="hidden" name="action" value="national-status" />
			<input type="hidden" name="obligationId" value={fee.obligationId} />
			<button>Verifică naționalul în Orgo pentru {fee.period}</button>
		</form>
	{/if}
	{#if canRecord && fee.current && fee.collectible && fee.remainingBani > 0 && !fee.reviewReason}
		<details open={expanded}>
			<summary>Înregistrează o plată manuală</summary>
			<form method="POST" use:enhance={submit}>
				<input type="hidden" name="action" value="manual-fee" />
				<input type="hidden" name="obligationId" value={fee.obligationId} />
				<input type="hidden" name="periodId" value={fee.periodId} />
				<p>
					Introdu doar suma încasată de centru. Naționalul confirmat în Orgo este deja scăzut din
					restul de plată.
				</p>
				<label
					>Suma încasată (lei)<input
						name="amount"
						type="number"
						min="0.01"
						max={fee.remainingBani / 100}
						step="0.01"
						value={fee.remainingBani / 100}
						required
					/></label
				>
				<label
					>Metoda de plată<select name="method"
						><option value="bank">Transfer bancar</option><option value="cash">Numerar</option
						></select
					></label
				>
				<label>Data încasării<DateInput name="receivedOn" type="date" required /></label>
				<label
					>Referință transfer / chitanță<input name="reference" maxlength="200" required /></label
				>
				<label
					>Detalii despre încasare<textarea name="note" maxlength="2000" required></textarea></label
				>
				<button>Confirmă încasarea</button>
			</form>
		</details>
	{/if}
{/if}

<style>
	form {
		display: grid;
		gap: 12px;
		margin-block: 12px;
	}
	label {
		display: grid;
		gap: 4px;
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		align-content: center;
		color: var(--sc-link);
	}
	input,
	select,
	textarea {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid var(--sc-control-border);
		border-radius: 8px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
	}
	textarea {
		min-height: 96px;
		resize: vertical;
	}
	button {
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		font: inherit;
		cursor: pointer;
	}
	:is(input, select, textarea, button, summary):focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	p {
		color: var(--sc-muted);
		line-height: 1.5;
	}
	p[role='status'] {
		padding: 10px 12px;
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
		border-radius: 8px;
	}
</style>
