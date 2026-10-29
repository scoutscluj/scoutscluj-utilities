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
		capabilities
	}: { activityId: number; row: Registration; capabilities: Overview['capabilities'] } = $props();
	let busy = $state(false),
		message = $state(''),
		failed = $state(false),
		documentsOpen = $state(false);
	let detail = $state<Registration | null>(null);
	const eligible = $derived(['accepted', 'reserved'].includes(row.state));
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

<div class="receipt" aria-label={`Primire ${row.memberName}`} aria-busy={busy}>
	<span>{states[row.consentState] ?? row.consentState}</span>
	{#if capabilities.sensitive && ['uploaded', 'signed_accepted'].includes(row.consentState)}
		<button class="secondary" disabled={busy} onclick={documents}>Deschide acordul digital</button>
	{/if}
	{#if paper && row.handoffPaperReady}
		<button class="secondary" disabled={busy} onclick={() => receive(true)}
			>Acord fizic primit</button
		>
	{:else if paper}<small
			>Generează PDF-ul actual din fișa înscrierii înainte de confirmarea acordului fizic.</small
		>{/if}
	{#each cash as item (item.key)}
		<button class="secondary" disabled={busy} onclick={() => receive(false, [item.key])}
			>Cash {money(item.remainingBani)} primit</button
		>
	{/each}
	{#if capabilities.finance && eligible && !cash.length}<small>Nimic de încasat cash</small>{/if}
	{#if paper && row.handoffPaperReady && cash.length}
		<button
			disabled={busy}
			onclick={() =>
				receive(
					true,
					cash.map((i) => i.key)
				)}>Confirmă acord + cash {money(cash.reduce((sum, i) => sum + i.remainingBani, 0))}</button
		>
	{/if}
	{#if message && !documentsOpen}
		{#if failed}<FormFeedback {message} kind="error" />{:else}<small role="status"
				>✓ {message}</small
			>{/if}
	{/if}
</div>
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
	.receipt {
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	button {
		min-height: 40px;
		padding: 8px 12px;
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		background: var(--sc-accent);
		color: white;
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
	button:disabled {
		opacity: 0.5;
		cursor: wait;
	}
	a {
		color: var(--sc-accent);
		overflow-wrap: anywhere;
	}
	small {
		color: var(--sc-ink-muted);
		font-size: 12px;
		line-height: 1.5;
	}
</style>
