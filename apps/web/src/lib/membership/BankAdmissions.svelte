<script lang="ts">
	import { enhance } from '$app/forms';
	import { unallocatedAmount } from './admin-ledger';
	import { money, type Dashboard } from './types';
	let { ledger }: { ledger: Dashboard } = $props();
	let mode = $state('new'),
		receiptId = $state('');
	let periodId = $derived(ledger.periods.find((p) => p.active)?.id ?? ledger.periods[0]?.id ?? '');
	let rows = $state([
		{ purpose: 'admission', orgoUserId: '', obligationId: '', amount: '', expected: '', note: '' }
	]);
	let busy = $state(false);
	let search = $state('');
	let historyOnly = $state(false);
	const available = $derived(
		ledger.receipts.filter(
			(r) =>
				!r.checkoutId && ['bank', 'cash'].includes(r.method) && unallocatedAmount(ledger, r) > 0
		)
	);
	const total = $derived(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
	let amount = $derived(total.toFixed(2));
	const history = $derived(
		(ledger.admissionAllocations ?? []).filter(
			(a) =>
				!search ||
				`${ledger.admissionMembers?.find((m) => m.orgoUserId === a.orgoUserId)?.name ?? a.orgoUserId}`
					.toLocaleLowerCase('ro')
					.includes(search.toLocaleLowerCase('ro'))
		)
	);
	const selectedReceipt = $derived(available.find((r) => r.id === receiptId));
	const candidates = $derived(
		(ledger.admissionMembers ?? []).filter((m) => !m.paid && Boolean(m.inactive) === historyOnly)
	);
	const row = $derived(rows[0]);
</script>

<details>
	<summary>Adeziuni și plăți din extras</summary>
	<p>
		Înregistrează transferul real o singură dată. Îl poți împărți între persoane, adeziuni și
		cotizații. Dacă încasarea există deja în aplicație, alege-o din listă.
	</p>
	<label
		>Încasare<select bind:value={mode}
			><option value="new">Transfer nou din extras</option><option value="existing"
				>Încasare deja înregistrată</option
			></select
		></label
	>
	<details>
		<summary>Membri inactivi din istoric</summary>
		<p>
			Istoricul nu apare în lista obișnuită de membri. Activează acest mod doar pentru o încasare
			istorică verificată.
		</p>
		<label
			><input
				type="checkbox"
				bind:checked={historyOnly}
				onchange={() =>
					(rows = [
						{
							purpose: 'admission',
							orgoUserId: '',
							obligationId: '',
							amount: '',
							expected: '',
							note: ''
						}
					])}
			/>Selectez un membru din istoricul inactiv</label
		>
	</details>
	{#if historyOnly}<p role="status">
			Înregistrare pentru istoricul inactiv. Lista arată doar acești membri.
		</p>{/if}
	<form
		method="POST"
		use:enhance={() => {
			busy = true;
			return async ({ update, result }) => {
				try {
					await update({ reset: result.type === 'success' });
					if (result.type === 'success')
						rows = [
							{
								purpose: 'admission',
								orgoUserId: '',
								obligationId: '',
								amount: '',
								expected: '',
								note: ''
							}
						];
				} finally {
					busy = false;
				}
			};
		}}
	>
		<input
			type="hidden"
			name="action"
			value={mode === 'new' ? 'bankAllocations' : 'allocateAdmission'}
		/>
		{#if mode === 'new'}
			<input type="hidden" name="method" value="bank" /><input
				type="hidden"
				name="allocations"
				value={JSON.stringify(rows)}
			/>
			<div class="grid">
				<label
					>Perioada încasării<select name="periodId" bind:value={periodId} required
						>{#each ledger.periods as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select
					></label
				>
				<label>Data din extras<input type="date" name="receivedOn" required /></label><label
					>Referința unică din extras<input name="reference" required maxlength="200" /></label
				>
				<label
					>Suma totală primită (RON)<input
						type="number"
						step="0.01"
						min={Math.max(0.01, total)}
						name="amount"
						bind:value={amount}
						required
					/></label
				>
				<label
					>Detalii din extras<textarea name="note" required maxlength="2000" rows="2"
					></textarea></label
				>
			</div>
		{:else}
			<label
				>Încasare disponibilă<select name="receiptId" bind:value={receiptId} required
					><option value="">Alege încasarea</option>{#each available as r (r.id)}<option
							value={r.id}
							>{r.receivedOn} · {r.reference} · disponibil {money(
								unallocatedAmount(ledger, r)
							)}</option
						>{/each}</select
				></label
			>
			<p>Alocă aici adeziunea. Pentru cotizație folosește alocările existente ale încasării.</p>
		{/if}
		{#each mode === 'new' ? rows : [row] as r, index (index)}
			<fieldset disabled={busy}>
				<legend>{mode === 'new' ? `Alocarea ${index + 1}` : 'Adeziune'}</legend>
				<div class="grid">
					{#if mode === 'new'}<label
							>Destinație<select
								bind:value={r.purpose}
								onchange={() => {
									r.orgoUserId = '';
									r.obligationId = '';
									r.amount = '';
									r.expected = '';
								}}
								><option value="admission">Adeziune</option><option value="membership"
									>Cotizație</option
								></select
							></label
						>{/if}
					{#if mode === 'existing' || r.purpose === 'admission'}
						<label
							>Membru<select
								name={mode === 'existing' ? 'orgoUserId' : undefined}
								bind:value={r.orgoUserId}
								required
								onchange={() => {
									const m = candidates.find((m) => String(m.orgoUserId) === r.orgoUserId);
									r.amount = m ? ((m.expectedBani - m.receivedBani) / 100).toFixed(2) : '';
								}}
								><option value="">Alege membrul</option
								>{#each candidates as m (m.orgoUserId)}<option value={String(m.orgoUserId)}
										>{m.name} · Orgo #{m.orgoUserId} · rămas {money(
											m.expectedBani - m.receivedBani
										)}</option
									>{/each}</select
							></label
						>
					{:else}<label
							>Membru și cotizație<select bind:value={r.obligationId} required
								><option value="">Alege cotizația</option
								>{#each ledger.obligations.filter((o) => o.periodId === periodId) as o (o.id)}<option
										value={o.id}>{o.memberName} · Orgo #{o.orgoUserId}</option
									>{/each}</select
							></label
						>{/if}
					<label
						>Sumă alocată (RON)<input
							name={mode === 'existing' ? 'amount' : undefined}
							type="number"
							step="0.01"
							min="0.01"
							max={mode === 'existing' && selectedReceipt
								? unallocatedAmount(ledger, selectedReceipt) / 100
								: undefined}
							bind:value={r.amount}
							required
						/></label
					>
					<label
						>Observații<input
							name={mode === 'existing' ? 'note' : undefined}
							bind:value={r.note}
							required
							maxlength="2000"
						/></label
					>
				</div>
				{#if mode === 'existing' || r.purpose === 'admission'}<details>
						<summary>Tarif istoric diferit</summary>
						<p>
							Completează doar dacă documentul confirmă alt tarif integral. Explică motivul în
							observații.
						</p>
						<label
							>Tarif integral confirmat (RON)<input
								type="number"
								min="0.01"
								step="0.01"
								name={mode === 'existing' ? 'expected' : undefined}
								bind:value={r.expected}
							/></label
						>
					</details>{/if}
				{#if mode === 'new' && rows.length > 1}<button
						type="button"
						class="secondary"
						onclick={() => rows.splice(index, 1)}>Elimină alocarea</button
					>{/if}
			</fieldset>{/each}
		{#if mode === 'new'}<button
				type="button"
				class="secondary"
				disabled={busy || rows.length >= 100}
				onclick={() =>
					rows.push({
						purpose: 'admission',
						orgoUserId: '',
						obligationId: '',
						amount: '',
						expected: '',
						note: ''
					})}>Adaugă alt membru sau altă destinație</button
			>
			<p>
				Total alocat: {money(Math.round(total * 100))}. Diferența față de încasare rămâne
				disponibilă.
			</p>{/if}
		<button disabled={busy}
			>{busy
				? 'Se salvează…'
				: mode === 'new'
					? 'Înregistrează transferul și alocările'
					: 'Alocă adeziunea'}</button
		>
	</form>
	<details>
		<summary>Istoric adeziuni și corecții</summary><label
			>Caută în adeziuni<input bind:value={search} /></label
		>
		{#each history.slice(0, 50) as a (a.id)}<article>
				<p>
					<strong
						>{ledger.admissionMembers?.find((m) => m.orgoUserId === a.orgoUserId)?.name ??
							`Orgo #${a.orgoUserId}`}</strong
					>
					· {money(a.amountBani)} · {ledger.receipts.find((r) => r.id === a.receiptId)?.reference} · {a.reversed
						? 'Anulată'
						: 'Alocată'}
				</p>
				<p>{a.note}</p>
				{#if !a.reversed}<form method="POST">
						<input type="hidden" name="action" value="reverseAdmission" /><input
							type="hidden"
							name="id"
							value={a.id}
						/><label>Motivul corecției<input name="note" required maxlength="2000" /></label><button
							class="secondary">Anulează alocarea</button
						>
					</form>{/if}
			</article>{:else}<p>Nicio alocare manuală.</p>{/each}{#if history.length > 50}<p>
				Sunt afișate primele 50. Restrânge căutarea.
			</p>{/if}
	</details>
</details>

<style>
	fieldset {
		border: 1px solid #dce5df;
		border-radius: 10px;
		margin: 20px 0;
		padding: 16px;
		min-width: 0;
	}
	legend {
		font-weight: 600;
	}
	article {
		border-bottom: 1px solid #dce5df;
		padding: 12px 0;
	}
	.secondary {
		background: white !important;
		color: var(--sc-accent) !important;
	}
</style>
