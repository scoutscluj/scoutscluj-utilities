<script lang="ts">
	import { resolve } from '$app/paths';
	import { money } from '$lib/membership/types';
	let { data, form } = $props();
	let search = $state('');
	let selected = $state<string[]>([]);
	let memberCard = $state('');
	const ledger = $derived(data.ledger);
	const paid = (id: string) =>
		ledger.allocations
			.filter((a) => a.obligationId === id && !a.reversed)
			.reduce((sum, a) => sum + a.amountBani, 0);
	const available = (id: string, total: number) =>
		total -
		ledger.allocations
			.filter((a) => a.receiptId === id && !a.reversed)
			.reduce((sum, a) => sum + a.amountBani, 0);
	const receiptAvailable = (receipt: (typeof ledger.receipts)[number]) =>
		available(receipt.id, receipt.amountBani - receipt.refundedBani);
	const filtered = $derived(
		ledger.obligations.filter((o) =>
			`${o.memberName} ${o.orgoUserId} ${o.cardId ?? ''}`
				.toUpperCase()
				.includes(search.toUpperCase())
		)
	);
	const batchTotal = $derived(
		ledger.obligations
			.filter((o) => selected.includes(o.id))
			.reduce((sum, o) => sum + o.nationalBani, 0)
	);
	const plans = [
		['normal', 'Normală', 300],
		['fam1', 'Fam 1', 300],
		['fam2', 'Fam 2', 150],
		['fam3', 'Fam 3', 75],
		['social', 'Socială', 100]
	] as const;
	const stateLabels: Record<string, string> = {
		awaiting_access: 'ORGO: acces API indisponibil',
		manually_confirmed: 'ORGO: verificat manual',
		correction_required: 'Necesită corecție'
	};
</script>

<svelte:head><title>Administrare cotizații</title></svelte:head>
<h1>Cotizații</h1>
<p><a href={resolve('/cotizatie')}>Pagina de plată →</a></p>
<p class="notice">
	Pilot sandbox. Accesul administrativ ORGO nu este configurat. Verifică membrii și planurile în
	ORGO înainte de a crea cotizațiile. Transferul național și confirmarea ORGO se urmăresc separat.
</p>
{#if form?.message}<p role="status" class="notice">{form.message}</p>{/if}

<section>
	<h2>Procesator card</h2>
	<p>
		Procesator activ: <strong
			>{ledger.paymentConfiguration.providers.find(
				(provider) => provider.id === ledger.paymentConfiguration.activeProvider
			)?.label ?? ledger.paymentConfiguration.activeProvider}</strong
		>.
	</p>
	<p>
		<a href={resolve('/admin/finance/payment-processor')}>Configurează în Admin → Financiar</a>
	</p>
</section>

<details>
	<summary>Perioade și tarife</summary>
	{#each ledger.periods as p (p.id)}<div class="row">
			<span>{p.name} · {p.startsOn} – {p.endsOn} {p.active ? '· Activă' : ''}</span>
		</div>{/each}
	<form method="POST" class="grid">
		<input type="hidden" name="action" value="period" />
		<label>Denumirea perioadei ORGO<input name="name" required maxlength="100" /></label><label
			>Început<input type="date" name="startsOn" required /></label
		><label>Sfârșit<input type="date" name="endsOn" required /></label>
		{#each plans as [key, label, total] (key)}<label
				>{label} — total RON<input
					name={key}
					type="number"
					min="0.01"
					step="0.01"
					value={total}
					required
				/></label
			>{/each}
		<p>
			Aceleași tarife se folosesc pentru card și bancă. Perioada corespunzătoare devine activă
			automat la 1 septembrie. Dacă nu este pregătită în avans, sistemul o creează și copiază
			tarifele celei mai recente perioade.
		</p>
		<button>Creează perioada</button>
	</form>
</details>

<details>
	<summary>Adaugă o cotizație verificată</summary>
	<form method="POST" class="grid">
		<input type="hidden" name="action" value="obligation" />
		<label
			>Perioadă<select name="periodId" required
				>{#each ledger.periods as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select
			></label
		>
		<label
			>ID ORGO<input name="orgoUserId" inputmode="numeric" pattern="[1-9][0-9]*" required /></label
		>
		<label
			>ID Card (opțional)<input
				name="cardId"
				bind:value={memberCard}
				oninput={(e) => {
					e.currentTarget.value = e.currentTarget.value.toUpperCase();
					memberCard = e.currentTarget.value;
				}}
				autocapitalize="characters"
			/></label
		>
		<label>Nume membru<input name="memberName" required /></label>
		<label
			>Plan ORGO<select name="plan"
				>{#each plans as [key, label] (key)}<option value={key}>{label}</option>{/each}</select
			></label
		>
		<label
			>Dovada verificării în ORGO / apartenența la Cluj<textarea
				name="verificationNote"
				required
				maxlength="2000"
			></textarea></label
		><button>Înregistrează cotizația</button>
	</form>
</details>

<section>
	<h2>Membri și transfer național</h2>
	<label>Caută nume sau ID<input bind:value={search} type="search" /></label>
	<form method="POST">
		<input type="hidden" name="action" value="batch" />
		<div class="scroll">
			<table>
				<thead
					><tr
						><th>Transfer</th><th>Membru</th><th>Perioadă</th><th>Datorat</th><th>Încasat</th><th
							>Național</th
						><th>Stare</th></tr
					></thead
				><tbody>
					{#each filtered as o (o.id)}{@const item = ledger.nationalItems.find(
							(n) => n.obligationId === o.id
						)}<tr>
							<td
								>{#if !item && paid(o.id) >= o.totalBani}<input
										type="checkbox"
										name="obligationIds"
										value={o.id}
										bind:group={selected}
										aria-label={`Include ${o.memberName}`}
									/>{/if}</td
							>
							<td>{o.memberName}<small>{o.orgoUserId} {o.cardId ?? ''}</small></td><td
								>{ledger.periods.find((p) => p.id === o.periodId)?.name}</td
							><td>{money(o.totalBani)}</td><td>{money(paid(o.id))}</td><td
								>{money(o.nationalBani)}</td
							><td
								>{item
									? (stateLabels[item.orgoState] ?? item.orgoState)
									: paid(o.id) >= o.totalBani
										? 'Plătit · netransferat'
										: paid(o.id) > 0
											? 'Parțial'
											: 'Neplătit'}</td
							>
						</tr>{/each}
				</tbody>
			</table>
		</div>
		<p>Total național selectat: <strong>{money(batchTotal)}</strong></p>
		<div class="grid">
			<label>Data transferului efectuat<input type="date" name="transferredOn" required /></label
			><label>Referință bancară<input name="reference" required /></label><label
				>Detalii transfer<textarea name="note" required></textarea></label
			>
		</div>
		<p>
			Confirmă numai după efectuarea transferului bancar. Această acțiune nu trimite bani și nu
			marchează automat cotizațiile în ORGO.
		</p>
		<button disabled={selected.length === 0}>Confirmă transferul național</button>
	</form>
</section>

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

<section>
	<h2>Încasări și verificarea plăților prin ID</h2>
	<div class="scroll">
		<table>
			<thead><tr><th>Încasare</th><th>Sumă</th><th>Nealocat</th><th>Detalii</th></tr></thead><tbody>
				{#each ledger.receipts as r (r.id)}{@const checkout = ledger.checkouts.find(
						(c) => c.id === r.checkoutId
					)}<tr
						><td
							>{r.receivedOn} · {r.method === 'card' ? 'Card' : 'Bancă'}<small>{r.reference}</small
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
</section>

<details>
	<summary>Reconciliază refund sau dispută</summary>
	<form method="POST" class="grid">
		<input type="hidden" name="action" value="reconcile" />
		<label
			>Încasare card<select name="id" required
				><option value="">Selectează</option
				>{#each ledger.receipts.filter((r) => r.method === 'card') as r (r.id)}<option value={r.id}
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
		<label>Dovadă și explicație<textarea name="note" maxlength="2000" required></textarea></label>
		<p>
			Dacă refundul afectează bani deja alocați, anulează mai întâi alocările respective.
			Transferurile naționale rămân în istoric și vor cere corecție.
		</p>
		<button>Salvează reconcilierea</button>
	</form>
</details>

<details>
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
	<summary>Transferuri și confirmări ORGO</summary>
	{#each ledger.batches as batch (batch.id)}<p>
			{batch.transferredOn} · {batch.reference} · {money(batch.totalBani)}
		</p>{/each}
	<form method="POST" class="grid">
		<input type="hidden" name="action" value="confirm" /><label
			>Cotizație transferată<select name="id" required
				>{#each ledger.nationalItems.filter((i) => i.orgoState === 'awaiting_access') as i (i.id)}<option
						value={i.id}
						>{ledger.obligations.find((o) => o.id === i.obligationId)?.memberName} · {money(
							i.amountBani
						)}</option
					>{/each}</select
			></label
		><label>Dovada confirmării finale în ORGO<textarea name="evidence" required></textarea></label
		><button>Înregistrează verificarea manuală în ORGO</button>
	</form>
</details>

<details>
	<summary>Încercări de plată care necesită verificare</summary
	>{#each ledger.checkouts.filter((c) => c.state === 'unknown' || c.reviewRequired) as c (c.id)}
		<p>{c.id} · {c.identifier} · {money(c.amountBani)} · {c.provider} · {c.state}</p>
		{#if c.state === 'unknown'}<form method="POST" class="grid">
				<input type="hidden" name="action" value="close" /><input
					type="hidden"
					name="id"
					value={c.id}
				/><label
					>Dovadă că nu există încasare la procesator<textarea
						name="evidence"
						required
						maxlength="2000"
					></textarea></label
				><button>Închide încercarea fără plată</button>
			</form>{/if}
	{/each}
	<p>
		Verifică aceste tranzacții la procesatorul indicat înainte de a cere o nouă plată. Nu se
		reîncearcă automat o inițiere cu rezultat necunoscut.
	</p>
</details>

<style>
	section,
	details {
		margin: 24px 0;
		border: 1px solid #d8dee6;
		border-radius: 12px;
		padding: 20px;
		background: white;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
		margin-top: 20px;
	}
	label {
		display: grid;
		gap: 6px;
	}
	fieldset {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 12px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	input,
	textarea,
	select,
	button {
		font: inherit;
		padding: 10px;
		border: 1px solid #94a3b8;
		border-radius: 6px;
		max-width: 100%;
	}
	button {
		background: #166534;
		color: white;
		cursor: pointer;
		margin-top: 12px;
	}
	button:disabled {
		opacity: 0.5;
	}
	.notice {
		background: #fff7ed;
		padding: 16px;
		border-radius: 8px;
	}
	.scroll {
		overflow: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}
	th,
	td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #e2e8f0;
	}
	small {
		display: block;
		color: #64748b;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	p {
		line-height: 1.6;
	}
</style>
