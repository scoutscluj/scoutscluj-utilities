<script lang="ts">
	import type { Dashboard } from './types';
	import { money } from './types';
	import { feePlans, allocatedAmount, needsPaymentReview } from './admin-ledger';
	let { ledger, transfers = false }: { ledger: Dashboard; transfers?: boolean } = $props();
	let search = $state('');
	let periodFilter = $state('');
	let paymentFilter = $state('all');
	let selected = $state<string[]>([]);
	const activePeriod = $derived(ledger.periods.find((period) => period.active));
	const paid = (id: string) => allocatedAmount(ledger, id);
	const needsReview = (o: Dashboard['obligations'][number]) => needsPaymentReview(ledger, o);
	const paymentState = (o: Dashboard['obligations'][number]) =>
		needsReview(o)
			? 'review'
			: paid(o.id) >= o.totalBani
				? 'paid'
				: paid(o.id) > 0
					? 'partial'
					: 'unpaid';
	const labels: Record<string, string> = {
		review: 'De verificat',
		paid: 'Plătit',
		partial: 'Parțial',
		unpaid: 'Neplătit'
	};
	const nationalLabels: Record<string, string> = {
		awaiting_access: 'ORGO: acces API indisponibil',
		manually_confirmed: 'ORGO: verificat manual',
		correction_required: 'Necesită corecție'
	};
	const obligations = $derived(
		ledger.obligations.filter((o) => o.periodId === (periodFilter || activePeriod?.id))
	);
	const totals = $derived({
		members: obligations.length,
		paid: obligations.filter((o) => paid(o.id) >= o.totalBani).length,
		collected: obligations.reduce((sum, o) => sum + paid(o.id), 0),
		remaining: obligations.reduce((sum, o) => sum + Math.max(0, o.totalBani - paid(o.id)), 0)
	});
	const filtered = $derived(
		obligations.filter(
			(o) =>
				(paymentFilter === 'all' || paymentState(o) === paymentFilter) &&
				`${o.memberName} ${o.orgoUserId} ${o.cardId ?? ''}`
					.toUpperCase()
					.includes(search.toUpperCase())
		)
	);
	const batchTotal = $derived(
		obligations.filter((o) => selected.includes(o.id)).reduce((sum, o) => sum + o.nationalBani, 0)
	);
</script>

{#if !transfers}
	<div class="stats-grid" aria-label="Totaluri cotizații">
		<div class="stat"><span>Membri</span><strong>{totals.members}</strong></div>
		<div class="stat"><span>Cotizații achitate</span><strong>{totals.paid}</strong></div>
		<div class="stat"><span>Încasat</span><strong>{money(totals.collected)}</strong></div>
		<div class="stat"><span>Restant</span><strong>{money(totals.remaining)}</strong></div>
	</div>
{/if}

<section aria-label={transfers ? 'Selecția membrilor pentru transfer' : 'Registrul membrilor'}>
	<div class="filters">
		<label
			>Perioadă<select
				value={periodFilter || activePeriod?.id}
				onchange={(e) => {
					periodFilter = e.currentTarget.value;
					selected = [];
				}}
			>
				{#each ledger.periods as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
			</select></label
		>
		<label
			>Starea cotizației<select
				bind:value={paymentFilter}
				onchange={() => {
					selected = [];
				}}
			>
				<option value="all">Toate</option><option value="paid">Plătit</option><option
					value="partial">Parțial</option
				><option value="unpaid">Neplătit</option><option value="review">De verificat</option>
			</select></label
		>
		<label
			>Caută nume sau ID<input
				type="search"
				bind:value={search}
				placeholder="Nume, ID ORGO sau ID Card"
			/></label
		>
	</div>
	<p>{filtered.length} membri afișați.</p>
	{#if transfers}<p>
			Selectează membrii cu cotizația integral achitată pentru a înregistra transferul național.
		</p>{/if}
	{#snippet memberRows()}
		<div class="scroll">
			<table>
				<thead
					><tr
						>{#if transfers}<th>Transfer</th>{/if}<th>Membru</th><th>Plan</th><th>Datorat</th><th
							>Încasat</th
						><th>Restant</th>{#if transfers}<th>Național</th>{/if}<th>Stare</th></tr
					></thead
				>
				<tbody>
					{#each filtered as o (o.id)}
						{@const item = ledger.nationalItems.find((n) => n.obligationId === o.id)}
						<tr>
							{#if transfers}<td
									>{#if !item && paid(o.id) >= o.totalBani}<input
											type="checkbox"
											name="obligationIds"
											value={o.id}
											bind:group={selected}
											aria-label={`Include ${o.memberName}`}
										/>{/if}</td
								>{/if}
							<td>{o.memberName}<small>{o.orgoUserId} {o.cardId ?? ''}</small></td>
							<td>{feePlans.find((p) => p[0] === o.plan)?.[1] ?? o.plan}</td>
							<td>{money(o.totalBani)}</td>
							<td
								>{money(paid(o.id))}
								{#if !transfers}<details>
										<summary>Detalii plată</summary>
										{#each ledger.allocations.filter((a) => a.obligationId === o.id && !a.reversed) as allocation (allocation.id)}
											{@const receipt = ledger.receipts.find((r) => r.id === allocation.receiptId)}
											<p>
												{money(allocation.amountBani)} · {receipt?.method === 'card'
													? 'Card'
													: 'Transfer bancar'}<small
													>{receipt?.receivedOn} · {receipt?.reference}</small
												><small>{receipt?.note}</small>
											</p>
										{:else}<small>Nu există încasări alocate.</small>{/each}
									</details>{/if}
							</td>
							<td>{money(Math.max(0, o.totalBani - paid(o.id)))}</td>
							{#if transfers}<td>{money(o.nationalBani)}</td>{/if}
							<td
								>{transfers && item && !needsReview(o)
									? (nationalLabels[item.orgoState] ?? item.orgoState)
									: transfers && paymentState(o) === 'paid'
										? 'Plătit · netransferat'
										: labels[paymentState(o)]}
								{#if o.reviewState}<small>Necesită verificare: {o.reviewReason}</small>{/if}
							</td>
						</tr>
					{:else}<tr
							><td colspan={transfers ? 8 : 6}>Nu există membri pentru filtrele selectate.</td></tr
						>{/each}
				</tbody>
			</table>
		</div>
	{/snippet}
	{#if transfers}
		<form method="POST">
			<input type="hidden" name="action" value="batch" />
			{@render memberRows()}
			<div class="transfer-confirmation">
				<p>
					{selected.length} membri selectați · Total național: <strong>{money(batchTotal)}</strong>
				</p>
				<div class="grid">
					<label
						>Data transferului efectuat<input type="date" name="transferredOn" required /></label
					><label>Referință bancară<input name="reference" required /></label><label
						>Detalii transfer<textarea name="note" required></textarea></label
					>
				</div>
				<p>
					Confirmă numai după efectuarea transferului bancar. Această acțiune nu trimite bani și nu
					marchează automat cotizațiile în ORGO.
				</p>
				<button disabled={selected.length === 0}>Confirmă transferul național</button>
			</div>
		</form>
	{:else}{@render memberRows()}{/if}
</section>

<style>
	.transfer-confirmation {
		margin-top: 24px;
		border-top: 1px solid #e2e8f0;
		padding-top: 12px;
	}
</style>
