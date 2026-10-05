<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { money, receiptMethodLabels } from '$lib/membership/types';
	import Plus from '@lucide/svelte/icons/plus';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import Search from '@lucide/svelte/icons/search';
	import ManualReceiptDialog from '$lib/membership/ManualReceiptDialog.svelte';
	import FinanceStatus from '$lib/membership/FinanceStatus.svelte';
	import { unallocatedAmount } from '$lib/membership/admin-ledger';
	let { data, form } = $props();
	const ledger = $derived(data.ledger);
	const receiptAvailable = (receipt: (typeof ledger.receipts)[number]) =>
		unallocatedAmount(ledger, receipt);
	let receiptOpen = $state(false);
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	let search = $state('');
	let methodFilter = $state('all');
	const received = $derived(
		ledger.receipts.reduce((sum, r) => sum + r.amountBani - r.refundedBani, 0)
	);
	const available = $derived(
		ledger.receipts.reduce((sum, r) => sum + Math.max(0, receiptAvailable(r)), 0)
	);
	const visible = $derived(
		ledger.receipts.filter(
			(r) =>
				(methodFilter === 'all' || r.method === methodFilter) &&
				`${r.reference} ${r.note} ${r.receivedOn}`
					.toLocaleLowerCase('ro')
					.includes(search.toLocaleLowerCase('ro'))
		)
	);
</script>

<MembershipAdminPage
	title="Încasări și alocări"
	description="Urmărește plățile primite și alocă sumele la cotizațiile membrilor."
	{form}
>
	<div class="stats-grid receipt-stats" aria-label="Rezumat încasări">
		<div class="stat">
			<Wallet size={18} /><span>Încasări înregistrate</span><strong>{ledger.receipts.length}</strong
			>
		</div>
		<div class="stat">
			<span>Total încasat, după restituiri</span><strong>{money(received)}</strong>
		</div>
		<div class="stat">
			<ArrowRightLeft size={18} /><span>Rămas de alocat</span><strong>{money(available)}</strong>
		</div>
		<div class="stat">
			<span>Încasări de verificat</span><strong
				>{ledger.receipts.filter((r) => r.reviewRequired).length}</strong
			>
		</div>
	</div>
	<section class="new-receipt">
		<div class="panel-heading">
			<div>
				<h2>Ai primit o plată?</h2>
				<p>Înregistrează transferul bancar sau numerarul, apoi alocă suma membrilor.</p>
			</div>
			<button
				type="button"
				disabled={!ready}
				onclick={() => {
					receiptOpen = true;
				}}><Plus size={17} /> Adaugă încasare</button
			>
		</div>
	</section>

	<section id="incasari">
		<div class="panel-heading">
			<div>
				<h2>Istoricul încasărilor</h2>
				<p>Banii primiți, documentele de referință și sumele de alocat.</p>
			</div>
		</div>
		<div class="receipt-filters">
			<label
				>Caută încasare<input
					type="search"
					bind:value={search}
					placeholder="Referință, dată sau detalii"
				/></label
			><label
				>Metoda de plată<select bind:value={methodFilter}
					><option value="all">Toate metodele</option><option value="bank">Transfer bancar</option
					><option value="cash">Numerar</option><option value="card">Card</option></select
				></label
			>
		</div>
		<div class="scroll">
			<table>
				<thead><tr><th>Încasare</th><th>Sumă</th><th>Nealocat</th><th>Detalii</th></tr></thead
				><tbody>
					{#each visible as r (r.id)}{@const checkout = ledger.checkouts.find(
							(c) => c.id === r.checkoutId
						)}<tr
							><td
								><strong>{receiptMethodLabels[r.method] ?? r.method}</strong><small
									>{r.receivedOn} · {ledger.periods.find((p) => p.id === r.periodId)?.name}</small
								><small>{r.reference}</small></td
							><td
								>{money(r.amountBani)}{#if r.refundedBani > 0}<small
										>Restituit: {money(r.refundedBani)}</small
									>{/if}</td
							><td
								>{money(receiptAvailable(r))}
								<div class="receipt-state">
									<FinanceStatus
										state={r.reviewRequired
											? 'review'
											: receiptAvailable(r) > 0
												? 'unallocated'
												: 'allocated'}
										label={r.reviewRequired
											? 'De verificat'
											: receiptAvailable(r) > 0
												? 'De alocat'
												: 'Alocat integral'}
									/>{#if r.payoutId}<small>Decontat în bancă</small>{/if}
								</div></td
							><td
								>{r.note}{#if checkout}<small
										>ID declarat: {checkout.identifier} · Plan declarat: {checkout.plan}</small
									>{/if}</td
							></tr
						>{:else}<tr
							><td colspan="4"
								><div class="empty-state">
									<Search size={28} />
									<p>
										{ledger.receipts.length
											? 'Nicio încasare nu corespunde filtrelor.'
											: 'Nu există încă încasări. Adaugă prima plată primită.'}
									</p>
								</div></td
							></tr
						>{/each}
				</tbody>
			</table>
		</div>
		<details>
			<summary>Alocă o încasare existentă unui membru</summary>
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

<ManualReceiptDialog {ledger} bind:open={receiptOpen} />

<style>
	.new-receipt {
		background: #f0fdf4 !important;
		border-color: #cee7d5 !important;
	}
	.receipt-filters {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 16px;
		margin-top: 22px;
	}
	.receipt-state {
		margin-top: 7px;
	}
	.stat :global(svg) {
		color: #15803d;
		margin-bottom: 10px;
	}
	@media (max-width: 600px) {
		.receipt-filters {
			grid-template-columns: 1fr;
		}
	}
</style>
