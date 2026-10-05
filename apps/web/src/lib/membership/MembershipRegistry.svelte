<script lang="ts">
	import type { Dashboard, Obligation } from './types';
	import { onMount } from 'svelte';
	import { money } from './types';
	import {
		feePlans,
		allocatedAmount,
		needsPaymentReview,
		membershipProgress
	} from './admin-ledger';
	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Clock from '@lucide/svelte/icons/clock';
	import FinanceStatus from './FinanceStatus.svelte';
	import PaymentDetailsTooltip from './PaymentDetailsTooltip.svelte';
	import ManualReceiptDialog from './ManualReceiptDialog.svelte';
	let { ledger, transfers = false }: { ledger: Dashboard; transfers?: boolean } = $props();
	let search = $state('');
	let periodFilter = $state('');
	let paymentFilter = $state('all');
	let selected = $state<string[]>([]);
	let receiptOpen = $state(false);
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
	let receiptMember = $state<Obligation>();
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
		queued: 'ORGO: programat',
		syncing: 'ORGO: sincronizare în curs',
		synced: 'ORGO: cotizație confirmată',
		pending_approval: 'ORGO: așteaptă confirmarea',
		failed: 'ORGO: sincronizare nereușită',
		unknown: 'ORGO: rezultat de verificat',
		manually_confirmed: 'ORGO: verificat manual',
		correction_required: 'Necesită corecție'
	};
	const obligations = $derived(
		ledger.obligations.filter((o) => o.periodId === (periodFilter || activePeriod?.id))
	);
	const totals = $derived(membershipProgress(ledger, periodFilter || activePeriod?.id));
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
	<section class="collection-progress" aria-label="Progresul cotizațiilor">
		<div class="progress-heading">
			<div>
				<span class="eyebrow"
					>Cotizații · {ledger.periods.find((p) => p.id === (periodFilter || activePeriod?.id))
						?.name ?? 'Nicio perioadă'}</span
				>
				<h2>{totals.paidMembers} <span>din {totals.members} membri au achitat integral</span></h2>
			</div>
			<strong class="progress-percent">{totals.percent}<span>%</span></strong>
		</div>
		<progress
			max={100}
			value={totals.percent}
			aria-label="Procent din suma totală a cotizațiilor încasat">{totals.percent}%</progress
		>
		<div class="progress-caption">
			<span><b>{money(totals.collectedBani)}</b> încasat din {money(totals.totalBani)}</span><span
				>{totals.members - totals.paidMembers} cotizații de finalizat</span
			>
		</div>
	</section>
	<div class="stats-grid" aria-label="Totaluri cotizații">
		<div class="stat"><Users size={18} /><span>Membri</span><strong>{totals.members}</strong></div>
		<div class="stat">
			<CircleCheck size={18} /><span>Cotizații achitate</span><strong>{totals.paidMembers}</strong>
		</div>
		<div class="stat">
			<Wallet size={18} /><span>Încasat</span><strong>{money(totals.collectedBani)}</strong>
		</div>
		<div class="stat">
			<Clock size={18} /><span>Restant</span><strong>{money(totals.remainingBani)}</strong>
		</div>
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
						><th>Restant</th>{#if transfers}<th>Național</th>{/if}<th>Stare</th>{#if !transfers}<th
								>Acțiuni</th
							>{/if}</tr
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
							<td
								><strong>{o.memberName}</strong><small
									>ID Orgo {o.orgoUserId} {o.cardId ? `· ${o.cardId}` : ''}</small
								></td
							>
							<td>{feePlans.find((p) => p[0] === o.plan)?.[1] ?? o.plan}</td>
							<td>{money(o.totalBani)}</td>
							<td
								>{money(paid(o.id))}
								{#if !transfers}<PaymentDetailsTooltip {ledger} obligation={o} />{/if}
							</td>
							<td>{money(Math.max(0, o.totalBani - paid(o.id)))}</td>
							{#if transfers}<td>{money(o.nationalBani)}</td>{/if}
							<td
								><FinanceStatus
									state={paymentState(o)}
									label={transfers && item && !needsReview(o)
										? (nationalLabels[item.orgoState] ?? item.orgoState)
										: transfers && paymentState(o) === 'paid'
											? 'Plătit · netransferat'
											: labels[paymentState(o)]}
								/>
								{#if o.reviewState}<small>Necesită verificare: {o.reviewReason}</small>{/if}
							</td>
							{#if !transfers}<td
									><button
										type="button"
										class="add-payment"
										disabled={!ready || paid(o.id) >= o.totalBani}
										aria-label={`Adaugă plată pentru ${o.memberName}`}
										onclick={() => {
											receiptMember = o;
											receiptOpen = true;
										}}><Plus size={15} aria-hidden="true" /> Adaugă plată</button
									></td
								>{/if}
						</tr>
					{:else}<tr
							><td colspan={transfers ? 8 : 7}>Nu există membri pentru filtrele selectate.</td></tr
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
					Confirmă numai după efectuarea transferului bancar. Această acțiune nu trimite bani. După
					înregistrare, aplicația verifică și marchează cotizațiile în ORGO folosind tokenul tău,
					dacă ai drepturile financiare necesare.
				</p>
				<button disabled={selected.length === 0}>Confirmă transferul național</button>
			</div>
		</form>
	{:else}{@render memberRows()}{/if}
</section>

{#if !transfers}<ManualReceiptDialog
		{ledger}
		obligation={receiptMember}
		bind:open={receiptOpen}
	/>{/if}

<style>
	.collection-progress {
		background: linear-gradient(120deg, #f0fdf4, #f7faf8) !important;
		border-color: #cee7d5 !important;
	}
	.progress-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}
	.eyebrow {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		font-weight: 700;
		color: #15803d;
	}
	.progress-heading h2 {
		margin: 8px 0 0;
		font-size: 1.4rem;
		color: #14532d;
	}
	.progress-heading h2 span {
		font-size: 0.98rem;
		font-weight: 400;
		color: #52665a;
	}
	.progress-percent {
		font-size: 2.3rem;
		color: #166534;
	}
	.progress-percent span {
		font-size: 1.2rem;
	}
	progress {
		appearance: none;
		width: 100%;
		height: 12px;
		border: 0;
		border-radius: 999px;
		overflow: hidden;
		margin: 22px 0 10px;
		background: #dcebe0;
	}
	progress::-webkit-progress-bar {
		background: #dcebe0;
		border-radius: 999px;
	}
	progress::-webkit-progress-value {
		background: #22a35b;
		border-radius: 999px;
		transition: width 0.3s;
	}
	progress::-moz-progress-bar {
		background: #22a35b;
		border-radius: 999px;
	}
	.progress-caption {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
		color: #52665a;
		font-size: 0.82rem;
	}
	.stat :global(svg) {
		color: #15803d;
		margin-bottom: 10px;
	}
	.add-payment {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		white-space: nowrap;
		padding: 7px 10px !important;
		margin: 0 !important;
		font-size: 0.76rem !important;
		background: #f0fdf4 !important;
		color: #166534 !important;
		border-color: #bbf7d0 !important;
	}
	.add-payment:hover:not(:disabled) {
		background: #dcfce7 !important;
	}
	@media (max-width: 600px) {
		.progress-heading {
			align-items: flex-start;
		}
		.progress-heading h2 span {
			display: block;
			margin-top: 4px;
			line-height: 1.5;
		}
		.progress-percent {
			font-size: 1.8rem;
		}
	}
	.transfer-confirmation {
		margin-top: 24px;
		border-top: 1px solid #e2e8f0;
		padding-top: 12px;
	}
</style>
