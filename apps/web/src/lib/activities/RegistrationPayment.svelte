<script lang="ts">
	import { untrack, onMount } from 'svelte';
	import { registrationRequest, money, states } from './registration';
	let {
		activityId,
		identifier: initialIdentifier = ''
	}: { activityId: number; identifier?: string } = $props();
	let identifier = $state(untrack(() => initialIdentifier)),
		busy = $state(false),
		message = $state(''),
		full = $state(false),
		terms = $state(false);
	let lookup = $state<{
		memberName: string;
		remainingBani: number;
		installment: { amountBani: number; due: string };
		payable: boolean;
		state: string;
		paymentState: string;
		cardEnabled?: boolean;
		environment?: string;
	} | null>(null);
	onMount(() => {
		if (initialIdentifier) void check();
	});
	async function check() {
		busy = true;
		message = '';
		lookup = null;
		try {
			lookup = await registrationRequest(activityId, 'lookup', { identifier });
		} catch (e) {
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	async function pay() {
		if (!lookup) return;
		busy = true;
		message = '';
		try {
			const result = await registrationRequest<{ paymentUrl: string }>(activityId, 'checkout', {
				identifier,
				full,
				amountBani: full ? lookup.remainingBani : lookup.installment.amountBani,
				acceptTerms: terms
			});
			window.location.assign(result.paymentUrl);
		} catch (e) {
			message = (e as Error).message;
			busy = false;
		}
	}
</script>

<section aria-label="Plata participării">
	<h2>Plătește participarea</h2>
	<p>Plata este disponibilă după înscriere și acceptare. Poți plăti și pentru alt membru.</p>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			void check();
		}}
	>
		<label>ID Orgo sau ID card<input bind:value={identifier} required autocomplete="off" /></label
		><button disabled={busy}>{busy ? 'Se verifică…' : 'Verifică înscrierea'}</button>
	</form>
	{#if message}<p role="alert">{message}</p>{/if}
	{#if lookup}<div class="summary">
			<strong>{lookup.memberName}</strong>
			<p>{states[lookup.state] ?? lookup.state} · {states[lookup.paymentState]}</p>
			<p>Sold rămas: <strong>{money(lookup.remainingBani)}</strong></p>
			{#if lookup.payable}<label
					><input type="checkbox" bind:checked={full} /> Achit întregul sold rămas</label
				>
				<p>
					Suma de plată: <strong
						>{money(full ? lookup.remainingBani : lookup.installment.amountBani)}</strong
					>{!full && lookup.installment.due ? ` · Scadență ${lookup.installment.due}` : ''}
				</p>
				<label
					><input type="checkbox" bind:checked={terms} /> Confirm suma și condițiile activității.</label
				><button onclick={pay} disabled={busy || !terms || lookup.cardEnabled === false}
					>{busy ? 'Se deschide plata…' : 'Plătește cu cardul'}</button
				>
				{#if lookup.cardEnabled === false}<p>
						Plata cu cardul nu este disponibilă momentan. Contactează coordonatorul pentru transfer
						bancar sau numerar.
					</p>{:else if lookup.environment && lookup.environment !== 'live'}<p>
						Mediu de test — această plată nu încasează bani reali.
					</p>{/if}
			{:else}<p>
					Plata nu este necesară sau înscrierea așteaptă acceptarea și un loc disponibil.
				</p>{/if}
		</div>{/if}
</section>

<style>
	section {
		display: grid;
		gap: 12px;
	}
	h2,
	p {
		margin: 0;
	}
	p {
		line-height: 1.6;
	}
	form {
		display: flex;
		align-items: end;
		gap: 12px;
		flex-wrap: wrap;
	}
	label {
		display: grid;
		gap: 6px;
	}
	label:has([type='checkbox']) {
		display: flex;
		align-items: start;
		gap: 8px;
	}
	input:not([type='checkbox']) {
		padding: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	button {
		padding: 10px 16px;
		min-height: 38px;
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: white;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	.summary {
		display: grid;
		gap: 12px;
		padding: 16px;
		background: var(--sc-canvas);
		border-radius: 10px;
	}
	[role='alert'] {
		color: var(--sc-accent);
	}
</style>
