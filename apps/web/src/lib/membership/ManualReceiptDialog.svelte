<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Banknote from '@lucide/svelte/icons/banknote';
	import Landmark from '@lucide/svelte/icons/landmark';
	import X from '@lucide/svelte/icons/x';
	import { enhance } from '$app/forms';
	import { allocatedAmount } from './admin-ledger';
	import { money, type Dashboard, type Obligation } from './types';
	let {
		ledger,
		obligation,
		open = $bindable(false)
	}: { ledger: Dashboard; obligation?: Obligation; open?: boolean } = $props();
	let method = $state('bank');
	let periodId = $state('');
	let amount = $state('');
	let receivedOn = $state('');
	let busy = $state(false);
	let errorMessage = $state('');
	const remaining = $derived(
		obligation ? Math.max(0, obligation.totalBani - allocatedAmount(ledger, obligation.id)) : null
	);
	$effect(() => {
		if (open) {
			periodId =
				obligation?.periodId ??
				ledger.periods.find((p) => p.active)?.id ??
				ledger.periods[0]?.id ??
				'';
			amount = obligation
				? (
						Math.max(0, obligation.totalBani - allocatedAmount(ledger, obligation.id)) / 100
					).toFixed(2)
				: '';
			receivedOn = new Intl.DateTimeFormat('en-CA', {
				timeZone: 'Europe/Bucharest',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			}).format(new Date());
			method = 'bank';
			errorMessage = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="receipt-dialog-overlay" />
		<Dialog.Content
			class="receipt-dialog"
			onEscapeKeydown={(event) => {
				if (busy) event.preventDefault();
			}}
			onInteractOutside={(event) => {
				if (busy) event.preventDefault();
			}}
		>
			<div class="dialog-heading">
				<div>
					<p class="eyebrow">Încasare manuală</p>
					<Dialog.Title class="receipt-dialog-title">Adaugă o plată</Dialog.Title>
				</div>
				<Dialog.Close class="dialog-close" disabled={busy} aria-label="Închide"
					><X size={20} /></Dialog.Close
				>
			</div>
			<Dialog.Description class="receipt-dialog-description"
				>{obligation
					? 'Înregistrează banii primiți și alocă-i direct cotizației acestui membru.'
					: 'Înregistrează banii deja primiți prin transfer bancar sau numerar.'}</Dialog.Description
			>
			{#if obligation}
				<div class="member-summary">
					<strong>{obligation.memberName}</strong><span
						>ID Orgo {obligation.orgoUserId} · {ledger.periods.find(
							(p) => p.id === obligation.periodId
						)?.name}</span
					><span>Rest de plată <b>{money(remaining ?? 0)}</b></span>
				</div>
			{/if}
			<form
				method="POST"
				aria-busy={busy}
				use:enhance={() => {
					busy = true;
					errorMessage = '';
					return async ({ result, update }) => {
						try {
							if (result.type === 'success') {
								await update();
								open = false;
							} else if (result.type === 'failure') {
								errorMessage = String(result.data?.message ?? 'Plata nu a putut fi salvată.');
							} else {
								errorMessage =
									'Plata nu a putut fi confirmată. Verifică încasările înainte de a reîncerca.';
							}
						} finally {
							busy = false;
						}
					};
				}}
			>
				<input type="hidden" name="action" value="bank" />
				{#if obligation}<input type="hidden" name="obligationId" value={obligation.id} /><input
						type="hidden"
						name="periodId"
						value={obligation.periodId}
					/>{/if}
				<fieldset disabled={busy}>
					<legend>Metoda de plată</legend>
					<div class="method-options">
						<label class:chosen={method === 'bank'}
							><input type="radio" name="method" value="bank" bind:group={method} /><Landmark
								size={19}
							/>Transfer bancar</label
						>
						<label class:chosen={method === 'cash'}
							><input type="radio" name="method" value="cash" bind:group={method} /><Banknote
								size={19}
							/>Numerar</label
						>
					</div>
					<div class="form-fields">
						{#if !obligation}<label class="full"
								>Perioadă<select name="periodId" bind:value={periodId} required
									>{#each ledger.periods as p (p.id)}<option value={p.id}>{p.name}</option
										>{/each}</select
								></label
							>{/if}
						<label
							>Sumă (RON)<input
								name="amount"
								type="number"
								min="0.01"
								max={remaining === null ? undefined : remaining / 100}
								step="0.01"
								bind:value={amount}
								required
							/></label
						>
						<label
							>Data încasării<input
								name="receivedOn"
								type="date"
								bind:value={receivedOn}
								required
							/></label
						>
						<label class="full"
							>{method === 'cash'
								? 'Referință unică a chitanței / documentului'
								: 'Referință unică din extras'}<input
								name="reference"
								maxlength="200"
								placeholder={method === 'cash'
									? 'Ex.: CH-2026-0042'
									: 'Referința tranzacției bancare'}
								required
							/></label
						>
						<label class="full"
							>Detalii plată<textarea
								name="note"
								maxlength="2000"
								rows="3"
								placeholder="Cine a plătit și ce document confirmă încasarea"
								required
							></textarea></label
						>
					</div>
				</fieldset>
				{#if errorMessage}<p class="form-error" role="alert">{errorMessage}</p>{/if}
				<p class="form-hint">
					{obligation
						? 'Suma se alocă automat acestui membru. Poți înregistra și o plată parțială.'
						: 'După înregistrare, alocă suma membrilor din secțiunea de alocări.'}
				</p>
				<div class="dialog-actions">
					<Dialog.Close class="cancel" type="button" disabled={busy}>Renunță</Dialog.Close><button
						class="save"
						disabled={busy}
						>{busy
							? 'Se salvează…'
							: obligation
								? 'Înregistrează și alocă'
								: 'Înregistrează încasarea'}</button
					>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.receipt-dialog-overlay) {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: #10281d66;
		backdrop-filter: blur(3px);
	}
	:global(.receipt-dialog) {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 61;
		width: min(560px, calc(100vw - 28px));
		max-height: calc(100dvh - 32px);
		overflow-y: auto;
		padding: 28px;
		border-radius: 20px;
		background: white;
		color: #1e293b;
		box-shadow: 0 24px 80px #0f172a40;
	}
	.dialog-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.eyebrow {
		color: #15803d;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0 0 6px;
	}
	:global(.receipt-dialog-title) {
		font-size: 1.5rem;
		margin: 0;
	}
	:global(.receipt-dialog-description) {
		color: #64748b;
		font-size: 0.9rem;
		line-height: 1.6;
		margin: 12px 0 20px;
	}
	:global(.dialog-close) {
		border: 0;
		background: #f1f5f9;
		color: #475569;
		border-radius: 50%;
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.member-summary {
		display: grid;
		gap: 5px;
		padding: 16px;
		border-radius: 12px;
		background: #f0fdf4;
		margin-bottom: 20px;
	}
	.member-summary span {
		color: #52665a;
		font-size: 0.85rem;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: 8px;
	}
	.method-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 20px;
	}
	.method-options label {
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid #dce5df;
		border-radius: 10px;
		padding: 12px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.method-options label.chosen {
		border-color: #15803d;
		background: #f0fdf4;
		color: #166534;
	}
	input[type='radio'] {
		accent-color: #15803d;
	}
	.form-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.form-fields label {
		display: grid;
		gap: 7px;
		font-size: 0.85rem;
		font-weight: 500;
		color: #475569;
	}
	.full {
		grid-column: 1 / -1;
	}
	.form-fields :is(input, select, textarea) {
		width: 100%;
		min-width: 0;
		padding: 11px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		font: inherit;
		color: #1e293b;
		background: white;
	}
	.form-hint {
		font-size: 0.8rem;
		line-height: 1.6;
		color: #64748b;
		margin: 16px 0;
	}
	.form-error {
		background: #fff1f2;
		color: #b42318;
		border-radius: 10px;
		padding: 12px;
		font-size: 0.85rem;
	}
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding-top: 16px;
		border-top: 1px solid #e2e8f0;
	}
	:global(.receipt-dialog .cancel),
	.save {
		border-radius: 10px;
		padding: 11px 16px;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	:global(.receipt-dialog .cancel) {
		background: white;
		color: #475569;
		border: 1px solid #cbd5e1;
	}
	.save {
		background: #166534;
		color: white;
		border: 1px solid #166534;
	}
	:global(.receipt-dialog :disabled) {
		opacity: 0.6;
		cursor: wait;
	}
	:global(.receipt-dialog :focus-visible) {
		outline: 3px solid #86efac;
		outline-offset: 3px;
	}
	@media (max-width: 480px) {
		:global(.receipt-dialog) {
			padding: 20px;
		}
		.form-fields,
		.method-options {
			grid-template-columns: 1fr;
		}
		.dialog-actions {
			flex-wrap: wrap;
		}
	}
</style>
