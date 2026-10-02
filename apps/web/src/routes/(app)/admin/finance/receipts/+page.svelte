<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { resolve } from '$app/paths';
	import { money } from '$lib/membership/types';
	import { unallocatedAmount } from '$lib/membership/admin-ledger';
	let { data, form } = $props();
	const ledger = $derived(data.ledger);
	const receiptAvailable = (receipt: (typeof ledger.receipts)[number]) =>
		unallocatedAmount(ledger, receipt);
</script>

<MembershipAdminPage
	title="Încasări și alocări"
	description="Urmărește plățile primite și alocă sumele la cotizațiile membrilor."
	{form}
>
	<details>
		<summary>Înregistrează încasare bancară</summary>
		<form method="POST" class="grid">
			<input type="hidden" name="action" value="bank" />
			<label
				>Perioadă<select name="periodId" required
					>{#each ledger.periods as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select
				></label
			>
			<label>Suma în RON<input type="number" name="amount" min="0.01" step="0.01" required /></label
			><label>Data încasării<input type="date" name="receivedOn" required /></label><label
				>Referință unică din extras<input name="reference" required /></label
			><label>Detalii transfer<textarea name="note" required></textarea></label><button
				>Înregistrează încasarea</button
			>
		</form>
	</details>

	<section id="incasari">
		<h2>Încasări și verificarea plăților prin ID</h2>
		<div class="scroll">
			<table>
				<thead><tr><th>Încasare</th><th>Sumă</th><th>Nealocat</th><th>Detalii</th></tr></thead
				><tbody>
					{#each ledger.receipts as r (r.id)}{@const checkout = ledger.checkouts.find(
							(c) => c.id === r.checkoutId
						)}<tr
							><td
								>{r.receivedOn} · {r.method === 'card' ? 'Card' : 'Bancă'}<small
									>{r.reference}</small
								></td
							><td
								>{money(r.amountBani)}{#if r.refundedBani > 0}<small
										>Restituit: {money(r.refundedBani)}</small
									>{/if}</td
							><td
								>{money(receiptAvailable(r))}{r.reviewRequired ? ' · De verificat' : ''}{r.payoutId
									? ' · Decontat'
									: ''}</td
							><td
								>{r.note}{#if checkout}<small
										>ID declarat: {checkout.identifier} · Plan declarat: {checkout.plan}</small
									>{/if}</td
							></tr
						>{/each}
				</tbody>
			</table>
		</div>
		<details>
			<summary>Alocă o plată unui membru</summary>
			<form method="POST" class="grid">
				<input type="hidden" name="action" value="allocate" />
				<label
					>Încasare<select name="receiptId" required
						><option value="">Selectează</option
						>{#each ledger.receipts.filter((r) => receiptAvailable(r) > 0) as r (r.id)}<option
								value={r.id}>{r.reference} · nealocat {money(receiptAvailable(r))}</option
							>{/each}</select
					></label
				>
				<label
					>Membru verificat<select name="obligationId" required
						><option value="">Selectează</option>{#each ledger.obligations as o (o.id)}<option
								value={o.id}
								>{o.memberName} · {o.orgoUserId} · {ledger.periods.find((p) => p.id === o.periodId)
									?.name}</option
							>{/each}</select
					></label
				>
				<label
					>Suma alocată (RON)<input
						type="number"
						name="amount"
						min="0.01"
						step="0.01"
						required
					/></label
				><label
					>Verificarea beneficiarului și a planului / detalii<textarea name="note" required
					></textarea></label
				><button>Verifică și alocă plata</button>
			</form>
		</details>
	</section>

	<details>
		<summary>Corecții și reconciliere</summary>
		<details>
			<summary>Corectează o alocare</summary>
			<form method="POST" class="grid">
				<input type="hidden" name="action" value="reverse" />
				<label
					>Alocare<select name="id" required
						>{#each ledger.allocations.filter((a) => !a.reversed) as a (a.id)}<option value={a.id}
								>{ledger.obligations.find((o) => o.id === a.obligationId)?.memberName} · {money(
									a.amountBani
								)} · {ledger.receipts.find((r) => r.id === a.receiptId)?.reference}</option
							>{/each}</select
					></label
				><label>Motiv<textarea name="note" required></textarea></label><button
					>Anulează alocarea, păstrând istoricul</button
				>
			</form>
		</details>

		<details>
			<summary>Reconciliază refund sau dispută</summary>
			<form method="POST" class="grid">
				<input type="hidden" name="action" value="reconcile" />
				<label
					>Încasare card<select name="id" required
						><option value="">Selectează</option
						>{#each ledger.receipts.filter((r) => r.method === 'card') as r (r.id)}<option
								value={r.id}
								>{r.reference} · {money(r.amountBani)} · restituit {money(r.refundedBani)}</option
							>{/each}</select
					></label
				>
				<label
					>Sumă restituită cumulată (RON)<input
						name="refunded"
						type="number"
						min="0"
						step="0.01"
						value="0"
						required
					/></label
				>
				<label
					>Dovadă și explicație<textarea name="note" maxlength="2000" required></textarea></label
				>
				<p>
					Dacă refundul afectează bani deja alocați, anulează mai întâi alocările respective.
					Transferurile naționale rămân în istoric și vor cere corecție.
				</p>
				<button>Salvează reconcilierea</button>
			</form>
		</details>

		<details id="decontari">
			<summary>Reconciliază decontul procesatorului în bancă</summary>
			<form method="POST" class="grid">
				<input type="hidden" name="action" value="payout" />
				<fieldset>
					<legend>Plăți incluse în decont</legend
					>{#each ledger.receipts.filter((r) => r.method === 'card' && !r.payoutId && !r.reviewRequired) as r (r.id)}<label
							class="check"
							><input type="checkbox" name="receiptIds" value={r.id} />{r.reference} · brut {money(
								r.amountBani
							)} · refund {money(r.refundedBani)}</label
						>{/each}
				</fieldset>
				<label>Referință decont / extras<input name="reference" required /></label>
				<label>Data intrării în bancă<input name="receivedOn" type="date" required /></label>
				<label
					>Costuri reținute, inclusiv TVA (RON)<input
						name="charges"
						type="number"
						min="0"
						step="0.01"
						value="0"
						required
					/></label
				>
				<label
					>Net intrat în bancă (RON)<input
						name="net"
						type="number"
						min="0.01"
						step="0.01"
						required
					/></label
				>
				<label>Detalii<textarea name="note" maxlength="2000" required></textarea></label>
				<p>
					Aplicația verifică: brut − refunduri − costuri = net. Costurile procesatorului nu reduc
					cotizația membrului.
				</p>
				<button>Înregistrează decontul</button>
			</form>
			{#each ledger.payouts as payout (payout.id)}<p>
					{payout.receivedOn} · {payout.reference}: brut {money(payout.grossBani)}, refunduri {money(
						payout.refundedBani
					)}, costuri {money(payout.chargesBani)}, net {money(payout.netBani)}
				</p>{/each}
		</details>
	</details>

	<details>
		<summary>Încercări de plată care necesită verificare</summary
		>{#each ledger.checkouts.filter((c) => c.state === 'unknown' || c.reviewRequired) as c (c.id)}
			<p>{c.id} · {c.identifier} · {money(c.amountBani)} · {c.provider} · {c.state}</p>
		{/each}
		<a href={resolve('/admin/finance/payments')}>Verifică și anulează plățile în curs</a>
		<p>
			Verifică aceste tranzacții la procesatorul indicat înainte de a cere o nouă plată. Nu se
			reîncearcă automat o inițiere cu rezultat necunoscut.
		</p>
	</details>
</MembershipAdminPage>
