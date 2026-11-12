<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Modal from '$lib/components/ui/Modal.svelte';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import {
		registrationRequest,
		money,
		states,
		type Registration,
		type Overview
	} from './registration';
	let {
		activityId,
		row,
		capabilities,
		compact = false
	}: {
		activityId: number;
		row: Registration;
		capabilities: Overview['capabilities'];
		compact?: boolean;
	} = $props();
	let receiptOpen = $state(false);
	let undoOpen = $state(false),
		undoTarget = $state<'paper' | 'cash'>('paper');
	let undoRevision = $state(0),
		undoAmount = $state(0),
		undoEntryIds = $state<string[]>([]);
	let busy = $state(false),
		message = $state(''),
		failed = $state(false),
		documentsOpen = $state(false);
	let detail = $state<Registration | null>(null);
	const eligible = $derived(['accepted', 'reserved'].includes(row.state));
	const agreementReceived = $derived(
		['paper_received', 'signed_accepted'].includes(row.consentState)
	);
	const cashReceived = $derived(
		capabilities.finance &&
			eligible &&
			(row.cashInstallments ?? []).some((item) => item.amountBani > 0) &&
			(row.cashInstallments ?? []).every((item) => item.remainingBani === 0)
	);
	const paper = $derived(
		capabilities.consent &&
			eligible &&
			row.minor &&
			row.role !== 'staff' &&
			!['paper_received', 'signed_accepted', 'not_required'].includes(row.consentState)
	);
	const cash = $derived(
		capabilities.finance && eligible
			? (row.cashInstallments ?? []).filter((i) => i.remainingBani > 0)
			: []
	);
	const cashTotal = $derived(cash.reduce((sum, item) => sum + item.remainingBani, 0));
	const compactCash = $derived(
		new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(cashTotal / 100)
	);
	const cashReceipts = $derived(
		(row.entries ?? []).filter(
			(entry) =>
				entry.method === 'cash' &&
				entry.amountBani > 0 &&
				entry.installmentKey &&
				!entry.checkoutId &&
				!entry.reversedEntryId &&
				!(row.entries ?? []).some((other) => other.reversedEntryId === entry.id)
		)
	);
	function askUndo(target: 'paper' | 'cash') {
		undoTarget = target;
		undoRevision = row.revision;
		undoEntryIds = cashReceipts.map((entry) => entry.id);
		undoAmount = cashReceipts.reduce((sum, entry) => sum + entry.amountBani, 0);
		message = '';
		failed = false;
		undoOpen = true;
	}
	async function undoReceipt() {
		if (busy || undoRevision !== row.revision) return;
		busy = true;
		message = '';
		failed = false;
		try {
			await registrationRequest(activityId, `registrations/${row.id}/check-in`, {
				revision: undoRevision,
				undo: undoTarget,
				confirm: true,
				...(undoTarget === 'cash' ? { entryIds: undoEntryIds, amountBani: undoAmount } : {})
			});
			undoOpen = false;
			receiptOpen = false;
		} catch (error) {
			failed = true;
			message = (error as Error).message;
		} finally {
			await invalidateAll();
			busy = false;
		}
	}
	async function receive(paper: boolean, cashKeys: string[] = []) {
		if (busy) return;
		busy = true;
		message = '';
		failed = false;
		try {
			await registrationRequest(activityId, `registrations/${row.id}/check-in`, {
				revision: row.revision,
				paper,
				cashKeys,
				cashBani: cash
					.filter((i) => cashKeys.includes(i.key))
					.reduce((sum, i) => sum + i.remainingBani, 0)
			});
			message = `${row.memberName}: ${paper ? 'acord fizic primit' : ''}${paper && cashKeys.length ? ' și ' : ''}${cashKeys.length ? 'numerar încasat' : ''}.`;
		} catch (error) {
			failed = true;
			message = (error as Error).message;
		} finally {
			await invalidateAll();
			busy = false;
		}
	}
	async function documents() {
		if (busy) return;
		busy = true;
		message = '';
		failed = false;
		detail = null;
		try {
			detail = await registrationRequest<Registration>(
				activityId,
				`registrations/${row.id}`,
				undefined,
				undefined,
				'GET'
			);
			documentsOpen = true;
		} catch (error) {
			failed = true;
			message = (error as Error).message;
			if (compact) receiptOpen = true;
		} finally {
			busy = false;
		}
	}
	async function accept() {
		if (!detail || busy) return;
		busy = true;
		message = '';
		failed = false;
		try {
			await registrationRequest(
				activityId,
				`registrations/${row.id}`,
				{ action: 'signed_accepted', revision: detail.revision },
				undefined,
				'PATCH'
			);
			documentsOpen = false;
			message = `${row.memberName}: acord digital acceptat.`;
		} catch (error) {
			failed = true;
			message = (error as Error).message;
		} finally {
			await invalidateAll();
			busy = false;
		}
	}
</script>

{#snippet receiptContent()}
	<div class="receipt" aria-label={`Primire ${row.memberName}`} aria-busy={busy}>
		<span>{states[row.consentState] ?? row.consentState}</span>
		{#if capabilities.sensitive && ['uploaded', 'signed_accepted', 'update_required'].includes(row.consentState)}
			<button class="secondary" disabled={busy} onclick={documents}
				>{row.consentState === 'update_required'
					? 'Acorduri digitale anterioare'
					: 'Deschide acordul digital'}</button
			>
		{/if}
		{#if paper && row.handoffPaperReady}
			<button class="secondary" disabled={busy} onclick={() => receive(true)}
				>Acord fizic primit</button
			>
		{:else if paper}<small
				>Generează PDF-ul actual din fișa înscrierii înainte de confirmarea acordului fizic.</small
			>{/if}
		{#each cash as item, index (item.key)}
			<button class="secondary" disabled={busy} onclick={() => receive(false, [item.key])}
				>Cash {money(item.remainingBani)} primit{cash.length > 1
					? ` · tranșa ${index + 1}`
					: ''}</button
			>
		{/each}
		{#if capabilities.finance && eligible && !cash.length}<small>Nimic de încasat cash</small>{/if}
		{#if eligible && agreementReceived && capabilities.consent}
			<button class="secondary received" disabled={busy} onclick={() => askUndo('paper')}
				>AP ✓ · corectează primirea</button
			>
		{/if}
		{#if eligible && capabilities.finance && cashReceipts.length}
			<button class="secondary received" disabled={busy} onclick={() => askUndo('cash')}
				>Corectează cash primit · {money(
					cashReceipts.reduce((sum, entry) => sum + entry.amountBani, 0)
				)}</button
			>
		{:else if cashReceived}<small
				>Tranșele cash sunt acoperite prin alte încasări sau susținere. Corecțiile se fac din meniul
				de acțiuni.</small
			>{/if}
		{#if paper && row.handoffPaperReady && cash.length}
			<button
				disabled={busy}
				onclick={() =>
					receive(
						true,
						cash.map((i) => i.key)
					)}
				>Confirmă acord + cash {money(cash.reduce((sum, i) => sum + i.remainingBani, 0))}</button
			>
		{/if}
		{#if message && !documentsOpen}
			{#if failed}<FormFeedback {message} kind="error" />{:else}<small role="status"
					>✓ {message}</small
				>{/if}
		{/if}
	</div>
{/snippet}
{#if compact}
	<div class="compact-receipt" aria-label={`Primire ${row.memberName}`} aria-busy={busy}>
		{#if eligible && row.minor && row.role !== 'staff' && (capabilities.consent || capabilities.sensitive)}
			<button
				class="secondary compact-trigger"
				class:received={agreementReceived}
				aria-pressed={agreementReceived}
				disabled={busy}
				aria-label={`Acord pentru ${row.memberName}: ${states[row.consentState] ?? row.consentState}`}
				onclick={() =>
					agreementReceived && capabilities.consent
						? askUndo('paper')
						: capabilities.sensitive &&
							  ['uploaded', 'signed_accepted', 'update_required'].includes(row.consentState)
							? documents()
							: (receiptOpen = true)}>AP{agreementReceived ? ' ✓' : ''}</button
			>
		{/if}
		{#if cash.length}
			<button
				class="secondary compact-trigger"
				aria-pressed="false"
				disabled={busy}
				aria-label={`Cash ${money(cashTotal)} de primit de la ${row.memberName}`}
				onclick={() => (receiptOpen = true)}>Cash {compactCash} lei</button
			>
		{:else if cashReceived}
			<button
				class="secondary compact-trigger received"
				disabled={busy}
				aria-label={`Tranșe cash acoperite pentru ${row.memberName}`}
				aria-pressed="true"
				onclick={() => (cashReceipts.length ? askUndo('cash') : (receiptOpen = true))}
				>Cash ✓</button
			>
		{/if}
	</div>
	<Modal
		bind:open={receiptOpen}
		title={`Primire · ${row.memberName}`}
		description="Verifică acordul și suma exactă înainte de confirmarea primirii."
	>
		{@render receiptContent()}
	</Modal>
{:else}
	{@render receiptContent()}
{/if}
<Modal
	bind:open={undoOpen}
	title={undoTarget === 'paper'
		? `Anulează primirea acordului · ${row.memberName}`
		: `Corectează numerarul primit · ${row.memberName}`}
	description="Verifică această corecție înainte de confirmare."
>
	<div class="receipt">
		{#if undoTarget === 'paper'}
			<p>
				Marchezi acordul ca neprimit / neverificat? Documentele încărcate rămân păstrate și pot fi
				verificate din nou.
			</p>
			{#if capabilities.sensitive && ['signed_accepted', 'uploaded', 'update_required'].includes(row.consentState)}
				<button
					class="secondary"
					disabled={busy}
					onclick={() => {
						undoOpen = false;
						void documents();
					}}>Deschide acordul digital</button
				>
			{/if}
		{:else}
			<p>
				Anulezi înregistrarea primirii a <strong>{money(undoAmount)}</strong> cash? Suma va reveni la
				soldul de plată.
			</p>
			<p>
				Confirmă doar dacă numerarul a fost marcat din greșeală ca primit. Această corecție
				păstrează istoricul; nu reprezintă o restituire de bani.
			</p>
		{/if}
		{#if message && failed}<FormFeedback {message} kind="error" />{/if}
		{#if undoRevision !== row.revision}<p role="alert">
				Înregistrarea s-a schimbat. Închide și verifică din nou.
			</p>{/if}
		<div class="confirmation-actions">
			<button class="secondary" disabled={busy} onclick={() => (undoOpen = false)}
				>Păstrează confirmarea</button
			>
			<button disabled={busy || undoRevision !== row.revision} onclick={undoReceipt}
				>{busy
					? 'Se salvează…'
					: undoTarget === 'paper'
						? 'Confirmă: acord neprimit'
						: 'Confirmă: cash neprimit'}</button
			>
		</div>
	</div>
</Modal>
<Modal
	bind:open={documentsOpen}
	title={`Acord digital · ${row.memberName}`}
	description="Descarcă și verifică documentul înainte de acceptare."
>
	<div class="receipt">
		{#each detail?.documents?.filter((d) => d.kind === 'signed') ?? [] as document (document.id)}
			<a href={resolve(`/activitati/${activityId}/inscriere/${row.id}/documente/${document.id}`)}
				>{document.filename}</a
			>
			<small
				>{document.publicationId === detail?.consentPublicationId &&
				document.answerRevision === detail?.answerRevision
					? 'Versiunea curentă'
					: 'Versiune anterioară'} · {new Intl.DateTimeFormat('ro-RO', {
					dateStyle: 'medium',
					timeStyle: 'short',
					timeZone: 'Europe/Bucharest'
				}).format(new Date(document.createdAt))}</small
			>
		{:else}<p>Nu există un PDF semnat încărcat disponibil.</p>{/each}
		{#if capabilities.consent && detail?.consentState === 'uploaded'}<button
				disabled={busy}
				onclick={accept}>Am verificat PDF-ul — acceptă acordul digital</button
			>{/if}
		{#if message}<FormFeedback {message} kind={failed ? 'error' : 'success'} />{/if}
	</div>
</Modal>

<style>
	.compact-receipt {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.confirmation-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	button.compact-trigger {
		min-height: 44px;
		padding: 6px 8px;
		white-space: nowrap;
		font-size: 12px;
	}
	.receipt {
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	button {
		min-height: 44px;
		padding: 8px 12px;
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		font: inherit;
		font-size: 13px;
		text-align: left;
		cursor: pointer;
	}
	button.secondary {
		background: var(--sc-surface);
		color: var(--sc-ink);
		border-color: var(--sc-border);
	}
	button.secondary.received {
		background: var(--sc-success-soft);
		color: var(--sc-success);
		border-color: color-mix(in srgb, var(--sc-success) 24%, var(--sc-success-soft));
	}
	button.secondary.received:hover {
		background: color-mix(in srgb, var(--sc-success) 8%, var(--sc-success-soft));
	}
	button:disabled {
		opacity: 0.5;
		cursor: wait;
	}
	a {
		color: var(--sc-link);
		overflow-wrap: anywhere;
	}
	small {
		color: var(--sc-ink-muted);
		font-size: 12px;
		line-height: 1.5;
	}
</style>
