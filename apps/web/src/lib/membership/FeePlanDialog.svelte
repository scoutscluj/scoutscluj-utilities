<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { feePlans } from './admin-ledger';
	import { money, type ObligationReview } from './types';
	let {
		open = $bindable(false),
		obligationId,
		memberName,
		currentPlan = 'normal'
	}: {
		open?: boolean;
		obligationId?: string;
		memberName?: string;
		currentPlan?: string;
	} = $props();
	let selected = $state('normal'),
		error = $state(''),
		saved = $state('');
	let busy = $state(false);
	let preview = $state<ObligationReview & { selectedPlan: string }>();
	$effect(() => {
		if (open && obligationId)
			untrack(() => {
				selected = currentPlan;
				preview = undefined;
				error = '';
				saved = '';
			});
	});
	async function submit(confirm: boolean) {
		if (!obligationId || busy) return;
		const id = obligationId,
			plan = selected;
		busy = true;
		error = '';
		try {
			const response = await fetch(resolve('/units/fee-plan'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id, plan, preview: !confirm, version: preview?.version })
			});
			const result = await response.json();
			if (id !== obligationId || plan !== selected) return;
			if (!response.ok) {
				error = result.message ?? 'Modificarea nu a putut fi salvată.';
				if (response.status === 409) preview = undefined;
				return;
			}
			if (!confirm) preview = result;
			else {
				open = false;
				saved = 'Tipul cotizației a fost salvat. Sincronizarea cu Orgo este în așteptare.';
				await invalidateAll();
			}
		} catch {
			error = 'Operațiunea nu este disponibilă. Reîncearcă.';
		} finally {
			busy = false;
		}
	}
</script>

{#if saved}<p role="status">{saved}</p>{/if}
<Modal
	bind:open
	title="Schimbă tipul cotizației"
	description="Se recalculează perioada curentă. Plățile și istoricul se păstrează."
>
	<form
		onsubmit={(event) => {
			event.preventDefault();
			void submit(!!preview);
		}}
		class="fee-plan-form"
	>
		<strong>{memberName}</strong>
		<label
			>Tip cotizație<select
				bind:value={selected}
				disabled={busy}
				onchange={() => {
					preview = undefined;
					error = '';
				}}
			>
				{#each feePlans as [value, label] (value)}<option {value}>{label}</option>{/each}
			</select></label
		>
		{#if error}<p role="alert">{error}</p>{/if}
		{#if preview}
			<p>
				{preview.periodName}: {money(preview.currentTotalBani)} →
				<strong>{money(preview.proposedTotalBani ?? 0)}</strong>
			</p>
			<p>Achitat: {money(preview.paidBani)} · Rămas: {money(preview.remainingBani ?? 0)}</p>
			{#each preview.blockers as blocker (blocker.message)}<p role="alert">
					{blocker.message}
				</p>{/each}
			<p>
				Tipul ales se salvează în Resurse și se trimite către Orgo. În caz de modificări concurente,
				Orgo are prioritate.
			</p>
		{/if}
		<button type="submit" disabled={busy || (preview && !preview.canResolve)}
			>{busy
				? 'Se verifică…'
				: preview
					? 'Confirmă tipul și recalculează'
					: 'Previzualizează recalcularea'}</button
		>
	</form>
</Modal>

<style>
	.fee-plan-form {
		display: grid;
		gap: 16px;
	}
	label {
		display: grid;
		gap: 6px;
	}
	[role='alert'] {
		color: var(--sc-danger, #b51d2a);
	}
</style>
