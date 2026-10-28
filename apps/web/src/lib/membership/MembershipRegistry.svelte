<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import FeePlanDialog from './FeePlanDialog.svelte';
	import { syncLabels } from '$lib/members/types';
	let planOpen = $state(false);
	let planMember = $state<Obligation>();
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	let page = $state(0),
		pageSize = $state(25);

	import type { Dashboard, Obligation } from './types';
	import { onMount } from 'svelte';
	import { money } from './types';
	import {
		feePlans,
		admissionPaidInPeriod,
		allocatedAmount,
		needsPaymentReview,
		membershipProgress
	} from './admin-ledger';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Users from '@lucide/svelte/icons/users';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Clock from '@lucide/svelte/icons/clock';
	import FinanceStatus from './FinanceStatus.svelte';
	import PaymentDetailsTooltip from './PaymentDetailsTooltip.svelte';
	import ManualReceiptDialog from './ManualReceiptDialog.svelte';
	import ObligationReviewDialog from './ObligationReviewDialog.svelte';
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
	let reviewMember = $state<Obligation>();
	let reviewOpen = $state(false);
	const activePeriod = $derived(ledger.periods.find((period) => period.active));
	const paid = (id: string) => allocatedAmount(ledger, id);
	const needsReview = (o: Dashboard['obligations'][number]) => needsPaymentReview(ledger, o);
	const paymentState = (o: Dashboard['obligations'][number]) =>
		o.collectionEnabled === false
			? 'inactive'
			: needsReview(o)
				? 'review'
				: paid(o.id) >= o.totalBani
					? 'paid'
					: paid(o.id) > 0
						? 'partial'
						: 'unpaid';
	const labels: Record<string, string> = {
		inactive: 'În afara urmăririi',
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
				matchesSearch(`${o.memberName} ${o.orgoUserId} ${o.cardId ?? ''}`, search)
		)
	);
	const effectiveSize = $derived(pageSize || Math.max(1, filtered.length));
	const activePage = $derived(
		Math.min(page, Math.max(0, Math.ceil(filtered.length / effectiveSize) - 1))
	);
	const pageRows = $derived(
		filtered.slice(activePage * effectiveSize, (activePage + 1) * effectiveSize)
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
			aria-label="Procent din suma totală a cotizațiilor acoperit">{totals.percent}%</progress
		>
		<div class="progress-caption">
			<span><b>{money(totals.collectedBani)}</b> acoperit din {money(totals.totalBani)}</span><span
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
			<Wallet size={18} /><span>Achitat</span><strong>{money(totals.collectedBani)}</strong>
		</div>
		<div class="stat">
			<Clock size={18} /><span>Restant</span><strong>{money(totals.remainingBani)}</strong>
		</div>
	</div>
{/if}

<section aria-label={transfers ? 'Selecția membrilor pentru transfer' : 'Registrul membrilor'}>
	<TableToolbar>
		{#snippet filters()}
			<label
				>Caută nume sau ID<input
					type="search"
					bind:value={search}
					oninput={() => (page = 0)}
					placeholder="Nume, ID ORGO sau ID Card"
				/></label
			>
			<label
				>Perioadă<select
					value={periodFilter || activePeriod?.id}
					onchange={(e) => {
						periodFilter = e.currentTarget.value;
						page = 0;
						selected = [];
						page = 0;
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
						page = 0;
					}}
				>
					<option value="all">Toate</option><option value="paid">Plătit</option><option
						value="partial">Parțial</option
					><option value="unpaid">Neplătit</option><option value="review">De verificat</option>
				</select></label
			>
		{/snippet}
	</TableToolbar>
	{#if transfers}<p>
			Selectează membrii cu cotizația integral achitată pentru a înregistra transferul național.
		</p>{/if}
	{#snippet memberRows()}
		<div class="scroll">
			<table use:highlightSearch={search}>
				<thead
					><tr
						>{#if transfers}<th>Transfer</th>{/if}<th>Membru</th><th>Plan</th><th>Datorat</th><th
							>Achitat</th
						><th>Restant</th>{#if transfers}<th>Național</th>{/if}<th>Stare</th>{#if !transfers}<th
								>Acțiuni</th
							>{/if}</tr
					></thead
				>
				<tbody>
					{#each pageRows as o (o.id)}
						{@const item = ledger.nationalItems.find((n) => n.obligationId === o.id)}
						<tr>
							{#if transfers}<td
									>{#if !item && !o.nationalDirectBani && paid(o.id) >= o.totalBani}<input
											type="checkbox"
											value={o.id}
											bind:group={selected}
											aria-label={`Include ${o.memberName}`}
										/>{/if}</td
								>{/if}
							<td
								><strong>{o.memberName}</strong>{#if admissionPaidInPeriod(ledger, o)}<span
										class="admission-badge"
										title="Taxa unică de adeziune a fost achitată în această perioadă"
										>Adeziune achitată</span
									>{/if}<small>ID Orgo {o.orgoUserId} {o.cardId ? `· ${o.cardId}` : ''}</small></td
							>
							<td>
								<div class="plan-control">
									<span>{feePlans.find((p) => p[0] === o.plan)?.[1] ?? o.plan}</span>
									{#if !transfers && ledger.periods.find((p) => p.id === o.periodId)?.active}
										<button
											type="button"
											class="edit-plan"
											disabled={!ready}
											aria-label={`Schimbă tipul cotizației pentru ${o.memberName}`}
											title="Schimbă tipul cotizației"
											onclick={() => {
												planMember = o;
												planOpen = true;
											}}
										>
											<Pencil size={15} aria-hidden="true" />
										</button>
									{/if}
								</div>
								{#if o.feePlanSyncState}<small
										>{syncLabels[o.feePlanSyncState] ?? 'În așteptarea sincronizării'}</small
									>{/if}
							</td>
							<td>{money(o.totalBani)}</td>
							<td
								>{money(paid(o.id))}{#if o.nationalDirectBani}<small
										>Inclusiv {money(o.nationalDirectBani)} plătit direct naționalului</small
									>{/if}
								{#if !transfers}<PaymentDetailsTooltip {ledger} obligation={o} />{/if}
							</td>
							<td
								>{o.collectionEnabled === false
									? '—'
									: money(Math.max(0, o.totalBani - paid(o.id)))}</td
							>
							{#if transfers}<td>{money(o.nationalBani)}</td>{/if}
							<td
								><FinanceStatus
									state={paymentState(o)}
									label={o.nationalDirectBani
										? 'Național achitat direct în Orgo'
										: transfers && item && !needsReview(o)
											? (nationalLabels[item.orgoState] ?? item.orgoState)
											: transfers && paymentState(o) === 'paid'
												? 'Plătit · netransferat'
												: labels[paymentState(o)]}
								/>
								{#if !transfers && needsReview(o)}<button
										type="button"
										class="resolve-review"
										disabled={!ready}
										aria-label={`Rezolvă verificarea pentru ${o.memberName}`}
										onclick={() => {
											reviewMember = o;
											reviewOpen = true;
										}}>Rezolvă</button
									>{/if}
								{#if o.reviewState}<small>Necesită verificare: {o.reviewReason}</small>{/if}
							</td>
							{#if !transfers}<td
									><button
										type="button"
										class="add-payment"
										disabled={!ready || o.collectionEnabled === false || paid(o.id) >= o.totalBani}
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
			{#each selected as id (id)}<input type="hidden" name="obligationIds" value={id} />{/each}
			{@render memberRows()}
			<div class="transfer-confirmation">
				<p>
					{selected.length} membri selectați · Total național: <strong>{money(batchTotal)}</strong>
				</p>
				<div class="grid">
					<label
						>Data transferului efectuat<DateInput
							type="date"
							name="transferredOn"
							required
						/></label
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
	<TablePagination
		bind:page
		bind:pageSize
		total={filtered.length}
		loadedTotal={obligations.length}
		label="Paginile cotizațiilor"
	/>
</section>

{#if !transfers}<ManualReceiptDialog {ledger} obligation={receiptMember} bind:open={receiptOpen} />
	<ObligationReviewDialog obligation={reviewMember} bind:open={reviewOpen} />{/if}

<FeePlanDialog
	bind:open={planOpen}
	obligationId={planMember?.id}
	memberName={planMember?.memberName}
	currentPlan={planMember?.plan}
/>

<style>
	.plan-control {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.edit-plan {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		min-height: 32px;
		padding: 0;
		border: 1px solid var(--sc-border);
		border-radius: 6px;
		background: var(--sc-surface);
		color: var(--sc-muted);
		cursor: pointer;
	}
	.edit-plan:hover {
		color: var(--sc-ink);
		background: var(--sc-inset);
	}
	.edit-plan:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.edit-plan:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.resolve-review {
		margin-left: 8px;
		padding: 5px 10px;
		border: 1px solid #d6a94f;
		border-radius: 8px;
		color: #854d0e;
		background: #fffbeb;
		cursor: pointer;
	}
	.admission-badge {
		display: inline-block;
		margin-left: 6px;
		padding: 2px 6px;
		border-radius: 999px;
		background: #eff6ff;
		color: #1e40af;
		font-size: 0.7rem;
		font-weight: 600;
	}
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
		border-top: 1px solid var(--sc-border);
		padding-top: 12px;
	}
</style>
