<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import FeePlanDialog from './FeePlanDialog.svelte';
	import { syncLabels } from '$lib/members/types';
	let planOpen = $state(false);
	let planMember = $state<Obligation>();
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
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
	import Eye from '@lucide/svelte/icons/eye';
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
	let filtersOpen = $state(false);
	let expandedMembers = $state<string[]>([]);
	const listId = $props.id();
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
	const activeFilterCount = $derived(
		Number(paymentFilter !== 'all') +
			Number(Boolean(periodFilter && periodFilter !== activePeriod?.id))
	);
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
				>Restant: <b>{money(totals.remainingBani)}</b></span
			><span>{totals.members - totals.paidMembers} cotizații de finalizat</span>
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
	<div class="registry-toolbar">
		<label
			>Caută nume sau ID<input
				type="search"
				bind:value={search}
				oninput={() => (page = 0)}
				placeholder="Nume, ID ORGO sau ID Card"
			/></label
		>
		<button
			type="button"
			class="filter-toggle"
			aria-expanded={filtersOpen}
			aria-controls={`${listId}-filters`}
			onclick={() => (filtersOpen = !filtersOpen)}
			>Filtre{activeFilterCount ? ` (${activeFilterCount})` : ''}</button
		>
		<div class="filter-fields" class:mobile-hidden={!filtersOpen} id={`${listId}-filters`}>
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
		</div>
	</div>
	{#if transfers}<p>
			Selectează membrii cu cotizația integral achitată pentru a înregistra transferul național.
		</p>{/if}
	{#snippet memberRows()}
		<div class="scroll desktop-ledger" class:transfer-ledger={transfers}>
			<table class="member-ledger" use:highlightSearch={search}>
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
							{#if transfers}<td data-label="Transfer"
									>{#if !item && !o.nationalDirectBani && paid(o.id) >= o.totalBani}<input
											type="checkbox"
											value={o.id}
											bind:group={selected}
											aria-label={`Include ${o.memberName}`}
										/>{/if}</td
								>{/if}
							<td class="member-name"
								><strong>{o.memberName}</strong>{#if admissionPaidInPeriod(ledger, o)}<span
										class="admission-badge"
										title="Taxa unică de adeziune a fost achitată în această perioadă"
										>Adeziune achitată</span
									>{/if}<small>ID Orgo {o.orgoUserId} {o.cardId ? `· ${o.cardId}` : ''}</small></td
							>
							<td data-label="Plan">
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
							<td data-label="Datorat">{money(o.totalBani)}</td>
							<td data-label="Achitat"
								>{money(paid(o.id))}{#if o.nationalDirectBani}<small
										>Inclusiv {money(o.nationalDirectBani)} plătit direct naționalului</small
									>{/if}
								{#if !transfers}<PaymentDetailsTooltip {ledger} obligation={o} />{/if}
							</td>
							<td data-label="Restant"
								>{o.collectionEnabled === false
									? '—'
									: money(Math.max(0, o.totalBani - paid(o.id)))}</td
							>
							{#if transfers}<td data-label="Național">{money(o.nationalBani)}</td>{/if}
							<td class="member-state"
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
							{#if !transfers}<td class="member-actions"
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

		<div class="mobile-members">
			{#each pageRows as o (o.id)}
				{@const nationalItem = ledger.nationalItems.find((item) => item.obligationId === o.id)}
				<article class="mobile-member">
					<div class="mobile-member-line">
						<button
							type="button"
							class="member-toggle"
							aria-expanded={expandedMembers.includes(o.id)}
							aria-controls={`${listId}-${o.id}`}
							onclick={() =>
								(expandedMembers = expandedMembers.includes(o.id)
									? expandedMembers.filter((id) => id !== o.id)
									: [...expandedMembers, o.id])}
						>
							<strong>{o.memberName}</strong>
							<span class="mobile-member-summary"
								><FinanceStatus
									state={paymentState(o)}
									label={o.nationalDirectBani
										? 'Național achitat direct'
										: transfers && nationalItem && !needsReview(o)
											? (nationalLabels[nationalItem.orgoState] ?? nationalItem.orgoState)
											: labels[paymentState(o)]}
								/><span
									>{transfers
										? money(o.nationalBani)
										: o.collectionEnabled === false
											? '—'
											: money(Math.max(0, o.totalBani - paid(o.id)))}
									<span class="muted">{transfers ? 'național' : 'restant'}</span></span
								></span
							>
							<span class="disclosure-arrow" aria-hidden="true"
								>{expandedMembers.includes(o.id) ? '⌃' : '⌄'}</span
							>
						</button>
						{#if transfers}
							{#if !nationalItem && !o.nationalDirectBani && paid(o.id) >= o.totalBani}<label
									class="quick-selection"
									><input
										type="checkbox"
										value={o.id}
										bind:group={selected}
										aria-label={`Include ${o.memberName}`}
									/></label
								>{/if}
						{:else if needsReview(o)}
							<button
								type="button"
								class="quick-receipt"
								disabled={!ready}
								aria-label={`Rezolvă verificarea pentru ${o.memberName}`}
								title="Verifică cotizația"
								onclick={() => {
									reviewMember = o;
									reviewOpen = true;
								}}><Eye size={19} aria-hidden="true" /></button
							>
						{:else}
							<button
								type="button"
								class="quick-receipt"
								disabled={!ready || o.collectionEnabled === false || paid(o.id) >= o.totalBani}
								aria-label={`Adaugă plată pentru ${o.memberName}`}
								title="Adaugă plată"
								onclick={() => {
									receiptMember = o;
									receiptOpen = true;
								}}><Plus size={19} aria-hidden="true" /></button
							>
						{/if}
					</div>
					{#if expandedMembers.includes(o.id)}
						<div class="mobile-member-details" id={`${listId}-${o.id}`}>
							<p class="muted">ID Orgo {o.orgoUserId}{o.cardId ? ` · ${o.cardId}` : ''}</p>
							{#if admissionPaidInPeriod(ledger, o)}<p>
									<span class="admission-badge">Adeziune achitată</span>
								</p>{/if}
							<dl>
								<div>
									<dt>Plan</dt>
									<dd class="plan-control">
										{feePlans.find((p) => p[0] === o.plan)?.[1] ??
											o.plan}{#if !transfers && ledger.periods.find((p) => p.id === o.periodId)?.active}<button
												type="button"
												class="edit-plan"
												disabled={!ready}
												aria-label={`Schimbă tipul cotizației pentru ${o.memberName}`}
												onclick={() => {
													planMember = o;
													planOpen = true;
												}}><Pencil size={15} aria-hidden="true" /></button
											>{/if}
									</dd>
								</div>
								<div>
									<dt>Datorat</dt>
									<dd>{money(o.totalBani)}</dd>
								</div>
								<div>
									<dt>Achitat</dt>
									<dd>
										{money(paid(o.id))}{#if !transfers}<PaymentDetailsTooltip
												{ledger}
												obligation={o}
											/>{/if}
									</dd>
								</div>
							</dl>
							{#if o.nationalDirectBani}<p class="muted">
									Inclusiv {money(o.nationalDirectBani)} plătit direct naționalului.
								</p>{/if}
							{#if o.feePlanSyncState}<p class="muted">
									{syncLabels[o.feePlanSyncState] ?? 'În așteptarea sincronizării'}
								</p>{/if}
							{#if needsReview(o)}<p>{o.reviewReason}</p>{/if}
						</div>
					{/if}
				</article>
			{:else}<p class="muted">Niciun membru nu corespunde filtrelor.</p>{/each}
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
		width: 44px;
		height: 44px;
		min-height: 44px;
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
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	.edit-plan:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.resolve-review {
		margin-left: 8px;
		padding: 5px 10px;
		border: 1px solid var(--sc-warning);
		border-radius: 8px;
		color: var(--sc-warning);
		background: var(--sc-warning-soft);
		cursor: pointer;
	}
	.admission-badge {
		display: inline-block;
		margin-left: 6px;
		padding: 2px 6px;
		border-radius: 999px;
		background: var(--sc-info-soft);
		color: var(--sc-info);
		font-size: 0.7rem;
		font-weight: 600;
	}
	.collection-progress {
		background: var(--sc-surface) !important;
		border-color: var(--sc-border) !important;
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
		color: var(--sc-ink);
	}
	.progress-heading h2 {
		margin: 8px 0 0;
		font-size: 1.4rem;
		color: var(--sc-ink);
	}
	.progress-heading h2 span {
		font-size: 0.98rem;
		font-weight: 400;
		color: var(--sc-muted);
	}
	.progress-percent {
		font-size: 2rem;
		color: var(--sc-success);
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
		margin: 16px 0 10px;
		background: var(--sc-border);
	}
	progress::-webkit-progress-bar {
		background: var(--sc-border);
		border-radius: 999px;
	}
	progress::-webkit-progress-value {
		background: var(--sc-success);
		border-radius: 999px;
		transition: width 0.3s;
	}
	progress::-moz-progress-bar {
		background: var(--sc-success);
		border-radius: 999px;
	}
	.progress-caption {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
		color: var(--sc-muted);
		font-size: 0.82rem;
	}
	.stat :global(svg) {
		color: var(--sc-success);
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
		background: var(--sc-success-soft) !important;
		color: var(--sc-success) !important;
		border-color: var(--sc-border) !important;
	}
	.add-payment:hover:not(:disabled) {
		background: var(--sc-success-soft) !important;
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

	.resolve-review {
		min-height: 44px;
	}
	.progress-heading {
		flex-wrap: wrap;
	}
	.progress-heading h2 {
		overflow-wrap: anywhere;
	}
	@media (prefers-reduced-motion: reduce) {
		progress::-webkit-progress-value {
			transition: none;
		}
	}

	@container finance (max-width: 900px) {
		.member-ledger,
		.member-ledger tbody {
			display: block;
		}
		.member-ledger thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		.member-ledger tbody tr {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			padding: 12px 0;
			border-bottom: 1px solid var(--sc-border);
		}
		.member-ledger tbody td {
			display: block;
			min-width: 0;
			border-bottom: 0;
			padding: 8px;
			overflow-wrap: anywhere;
		}
		.member-ledger td[data-label]::before {
			content: attr(data-label);
			display: block;
			color: var(--sc-muted);
			font-size: 12px;
			margin-bottom: 4px;
		}
		.member-ledger td.member-name,
		.member-ledger td.member-state,
		.member-ledger td.member-actions,
		.member-ledger td[colspan] {
			grid-column: 1 / -1;
		}
		.member-ledger .member-state {
			display: flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
		}
		.member-ledger .member-state small {
			flex-basis: 100%;
		}
		.member-ledger .resolve-review {
			margin: 0;
		}
		.member-ledger :global(.finance-status) {
			white-space: normal;
		}
		.member-ledger .member-actions button {
			width: 100%;
			justify-content: center;
		}
	}

	.mobile-members {
		display: none;
	}
	.registry-toolbar {
		display: grid;
		grid-template-columns: minmax(180px, 2fr) repeat(2, minmax(160px, 1fr));
		gap: 12px;
	}
	.filter-fields {
		display: contents;
	}
	.filter-toggle {
		display: none;
	}
	@container finance (max-width: 900px) {
		.desktop-ledger:has(.member-ledger) {
			display: none;
		}
		.mobile-members {
			display: block;
		}
		.collection-progress.collection-progress {
			padding: 12px;
			margin: 12px 0;
		}
		.collection-progress .eyebrow {
			font-size: 11px;
			letter-spacing: 0;
		}
		.collection-progress .progress-heading {
			gap: 8px;
			flex-wrap: nowrap;
		}
		.collection-progress .progress-heading h2 {
			font-size: 16px;
			margin: 4px 0 0;
		}
		.collection-progress .progress-heading h2 span {
			display: inline;
			font-size: 13px;
		}
		.collection-progress .progress-percent {
			font-size: 24px;
		}
		.collection-progress progress {
			height: 6px;
			margin: 10px 0 6px;
		}
		.collection-progress .progress-caption {
			gap: 4px 10px;
			font-size: 12px;
		}
		.stats-grid[aria-label='Totaluri cotizații'] {
			display: none;
		}
		.registry-toolbar {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 8px;
			align-items: end;
		}
		.registry-toolbar .filter-toggle {
			display: block;
			margin: 0;
			min-width: 60px;
		}
		.filter-fields {
			display: grid;
			grid-template-columns: 1fr;
			gap: 12px;
			grid-column: 1 / -1;
		}
		.filter-fields.mobile-hidden {
			display: none;
		}
		.mobile-members .mobile-member {
			padding: 12px 0;
			border-bottom: 1px solid var(--sc-border);
		}
		.mobile-member-line {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 44px;
			gap: 8px;
			align-items: center;
		}
		.mobile-members .member-toggle {
			position: relative;
			display: grid;
			gap: 8px;
			width: 100%;
			text-align: left;
			background: transparent;
			border: 0;
			margin: 0;
			padding: 4px 18px 4px 0;
			color: var(--sc-ink);
		}
		.member-toggle strong {
			font-weight: 600;
			overflow-wrap: anywhere;
		}
		.mobile-member-summary {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 6px 10px;
			font-size: 12px;
		}
		.mobile-member-summary > span {
			white-space: nowrap;
		}
		.mobile-members .quick-receipt {
			width: 44px;
			height: 44px;
			min-height: 44px;
			margin: 0;
			padding: 0;
			display: grid;
			place-items: center;
			background: var(--sc-surface);
			color: var(--sc-link);
			border-color: var(--sc-control-border);
		}
		.disclosure-arrow {
			position: absolute;
			right: 0;
			top: 6px;
			color: var(--sc-muted);
		}
		.mobile-member-details {
			padding: 8px 0 0;
		}
		.mobile-member-details dl {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px 12px;
			margin: 8px 0;
		}
		.mobile-member-details dt {
			font-size: 12px;
			color: var(--sc-muted);
		}
		.mobile-member-details dd {
			margin: 4px 0 0;
			min-height: 44px;
			display: flex;
			align-items: center;
		}
		.mobile-member-details p {
			margin: 8px 0;
		}
		.mobile-member-details .resolve-review {
			margin: 0;
		}
	}

	.stats-grid[aria-label='Totaluri cotizații'] {
		display: none;
	}
	.collection-progress.collection-progress {
		padding: 16px;
	}
	.collection-progress .progress-heading h2 {
		font-size: 18px;
	}
	.collection-progress .progress-percent {
		font-size: 28px;
	}
	.collection-progress progress {
		margin: 12px 0 8px;
		height: 8px;
	}
	.quick-selection {
		min-height: 44px;
		display: grid;
		place-items: center;
	}
	.quick-selection input {
		width: 20px;
		height: 20px;
	}

	@container finance (max-width: 900px) {
		.mobile-member-summary :global(.finance-status) {
			white-space: normal;
			max-width: 100%;
		}
	}
</style>
