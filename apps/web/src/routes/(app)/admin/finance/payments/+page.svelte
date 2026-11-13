<script lang="ts">
	import { enhance } from '$app/forms';
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { money, paymentLabels } from '$lib/membership/types';
	import FinanceStatus from '$lib/membership/FinanceStatus.svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Wallet from '@lucide/svelte/icons/wallet';
	let { data, form } = $props();
	let search = $state('');
	let busy = $state<string | null>(null);
	let stateFilter = $state('all');
	const ledger = $derived(data.ledger);
	const open = $derived(
		ledger.checkouts.filter((c) => ['starting', 'pending', 'unknown'].includes(c.state))
	);
	const beneficiary = (c: (typeof ledger.checkouts)[number]) =>
		ledger.obligations.find((o) => o.id === c.obligationId)?.memberName ?? `ID ${c.identifier}`;
	const visible = $derived(
		open.filter(
			(c) =>
				(stateFilter === 'all' || c.state === stateFilter) &&
				`${beneficiary(c)} ${c.identifier} ${c.providerId ?? ''} ${c.id}`
					.toLocaleLowerCase('ro')
					.includes(search.toLocaleLowerCase('ro'))
		)
	);
</script>

<MembershipAdminPage
	title="Plăți în curs"
	description="Verifică încercările neconfirmate și închide linkurile de plată abandonate."
	{form}
>
	<div class="stats-grid" aria-label="Rezumat plăți în curs">
		<div class="stat">
			<Clock size={18} /><span>Încercări deschise</span><strong>{open.length}</strong>
		</div>
		<div class="stat">
			<Wallet size={18} /><span>În așteptare</span><strong
				>{open.filter((c) => c.state === 'pending').length}</strong
			>
		</div>
		<div class="stat">
			<CircleAlert size={18} /><span>De verificat</span><strong
				>{open.filter((c) => c.state === 'unknown' || c.reviewRequired).length}</strong
			>
		</div>
		<div class="stat">
			<span>Total în curs</span><strong
				>{money(open.reduce((sum, c) => sum + c.amountBani, 0))}</strong
			>
		</div>
	</div>
	<section class="payment-search">
		<h2>Găsește o plată în curs</h2>
		<div class="payment-filters">
			<label
				>Caută membru, ID sau referință<input
					type="search"
					bind:value={search}
					placeholder="Nume sau ID ORGO"
				/></label
			>
			<label
				>Starea plății<select bind:value={stateFilter}
					><option value="all">Toate stările</option><option value="pending">În așteptare</option
					><option value="unknown">De verificat</option><option value="starting"
						>Inițiere în curs</option
					></select
				></label
			>
		</div>
		<details class="payment-help">
			<summary>Despre anularea unei încercări</summary>
			<p class="muted">
				Închiderea ferestrei de plată nu anulează linkul. Anularea de aici păstrează istoricul și
				deblochează o nouă încercare; nu efectuează o rambursare.
			</p>
		</details>
	</section>
	<div class="payment-cards">
		{#each visible as c (c.id)}
			<section class="payment-card">
				<div class="heading">
					<div>
						<h2>{beneficiary(c)}</h2>
						<span class="member-id">ID {c.identifier}</span>
					</div>
					<strong>{money(c.amountBani)}</strong>
				</div>
				<dl>
					<div>
						<dt>Stare</dt>
						<dd>
							<FinanceStatus
								state={c.reviewRequired ? 'review' : c.state}
								label={paymentLabels[c.state] ?? c.state}
							/>
						</dd>
					</div>
					<div>
						<dt>Procesator / mediu</dt>
						<dd>
							{c.provider === 'stripe' ? 'Stripe' : 'NETOPIA'} · {c.environment === 'live'
								? 'Producție'
								: 'Test'}
						</dd>
					</div>
				</dl>
				<details class="payment-metadata">
					<summary>Detaliile încercării</summary>
					<dl>
						<div>
							<dt>Perioadă</dt>
							<dd>{ledger.periods.find((p) => p.id === c.periodId)?.name ?? c.periodId}</dd>
						</div>
						<div>
							<dt>Inițiată la</dt>
							<dd>
								{c.createdAt
									? new Date(c.createdAt).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })
									: '—'}
							</dd>
						</div>
						<div>
							<dt>ID beneficiar</dt>
							<dd>{c.identifier}</dd>
						</div>
						<div>
							<dt>Referință procesator</dt>
							<dd>{c.providerId ?? 'Referință neconfirmată'}</dd>
						</div>
					</dl>
					<small>Încercare: {c.id}</small>
				</details>
				{#if c.reviewRequired}<p class="warning">
						Necesită verificare financiară. Compară tranzacția la procesator înainte de închidere.
					</p>{/if}
				{#if c.state === 'starting'}
					<p class="warning">Inițiere în curs. Actualizează pagina înainte de anulare.</p>
				{:else}
					<details class="cancel-payment">
						<summary>Anulează această încercare</summary>
						<form
							method="POST"
							use:enhance={() => {
								busy = c.id;
								return async ({ update }) => {
									try {
										await update();
									} finally {
										busy = null;
									}
								};
							}}
						>
							<input type="hidden" name="action" value="close" /><input
								type="hidden"
								name="id"
								value={c.id}
							/>
							{#if c.provider === 'stripe' && c.providerId}
								<p>
									Aplicația verifică Stripe și închide linkul numai dacă este neplătit. O plată deja
									trimisă sau încasată nu poate fi anulată aici.
								</p>
								<label
									>Motivul anulării<textarea
										name="evidence"
										required
										maxlength="2000"
										placeholder="Ex.: link abandonat; membrul va începe o plată nouă"
									></textarea></label
								>
							{:else}
								<p class="warning">
									Verifică în procesator că nu există încasare și că linkul vechi nu mai poate fi
									plătit. Această acțiune închide doar evidența locală.
								</p>
								<label
									>Dovada verificării la procesator<textarea
										name="evidence"
										required
										maxlength="2000"
										placeholder="Referința verificată și confirmarea închiderii linkului fără încasare"
									></textarea></label
								>
							{/if}
							<label class="confirm"
								><input type="checkbox" required /> Confirm închiderea acestei încercări.</label
							>
							<button disabled={busy !== null}
								>{busy === c.id ? 'Se verifică și se anulează…' : 'Anulează plata în curs'}</button
							>
						</form>
					</details>
				{/if}
			</section>
		{:else}
			<section class="empty-state">
				<CircleCheck size={36} />
				<h2>{open.length ? 'Nicio plată găsită' : 'Totul este la zi'}</h2>
				<p>
					{open.length
						? 'Încearcă alt nume, ID sau filtru de stare.'
						: 'Nu există plăți în curs de verificat.'}
				</p>
			</section>
		{/each}
	</div>
</MembershipAdminPage>

<style>
	.payment-filters {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 16px;
	}
	.payment-cards {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}
	.payment-cards section {
		margin: 0;
		min-width: 0;
	}
	.payment-cards .empty-state {
		grid-column: 1 / -1;
	}
	.member-id {
		font-size: 0.8rem;
		color: var(--sc-muted);
	}
	.stat :global(svg) {
		color: var(--sc-success);
		margin-bottom: 10px;
	}
	.cancel-payment {
		background: var(--sc-warning-soft) !important;
		border-color: var(--sc-border) !important;
		box-shadow: none !important;
		padding: 16px !important;
	}
	.cancel-payment button {
		background: var(--sc-accent) !important;
		border-color: var(--sc-accent) !important;
	}
	.heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: baseline;
		flex-wrap: wrap;
	}
	.heading strong {
		color: var(--sc-ink);
		font-size: 1.3rem;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	dt,
	small {
		color: var(--sc-muted);
		font-size: 0.85rem;
	}
	dd {
		margin: 4px 0 0;
		overflow-wrap: anywhere;
	}
	small {
		overflow-wrap: anywhere;
	}
	form {
		display: grid;
		gap: 16px;
		margin-top: 16px;
	}
	.warning {
		color: var(--sc-warning);
		background: var(--sc-warning-soft);
		padding: 12px;
		border-radius: 8px;
	}
	.confirm {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.confirm input {
		width: auto;
	}
	@media (max-width: 1100px) {
		.payment-cards {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 600px) {
		.payment-filters {
			grid-template-columns: 1fr;
		}
		dl {
			grid-template-columns: 1fr;
		}
	}

	.stats-grid[aria-label='Rezumat plăți în curs'] .stat {
		padding: 12px;
	}
	.stats-grid[aria-label='Rezumat plăți în curs'] .stat :global(svg) {
		display: none;
	}
	.stats-grid[aria-label='Rezumat plăți în curs'] .stat strong {
		margin-top: 4px;
		font-size: 20px;
	}
	.payment-card .payment-metadata,
	.payment-search .payment-help {
		padding: 0;
		border: 0;
		background: transparent;
		margin: 8px 0;
	}
	.payment-card .payment-metadata summary,
	.payment-search .payment-help summary {
		margin-left: 16px;
	}
	.payment-card > dl {
		margin: 12px 0;
	}
	.payment-card .heading strong {
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.payment-card .cancel-payment {
		padding: 8px 12px !important;
		margin: 8px 0 0;
	}
	@container finance (max-width: 900px) {
		.payment-search.payment-search {
			padding: 12px;
		}
		.payment-search > h2 {
			display: none;
		}
		.stats-grid[aria-label='Rezumat plăți în curs'] {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 8px;
		}
		.stats-grid[aria-label='Rezumat plăți în curs'] .stat span {
			font-size: 12px;
		}
		.stats-grid[aria-label='Rezumat plăți în curs'] .stat strong {
			font-size: 18px;
		}
		.payment-card > dl {
			grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr));
			gap: 12px;
		}
		.payment-card.payment-card {
			padding: 16px;
		}
		.payment-cards {
			gap: 10px;
		}
		.payment-card .heading {
			gap: 8px;
		}
		.payment-card .heading h2 {
			font-size: 17px;
		}
		.payment-card .heading strong {
			font-size: 18px;
		}
	}

	.payment-card > dl > div {
		min-width: 0;
	}
	.payment-card > dl :global(.finance-status) {
		white-space: normal;
		max-width: 100%;
		overflow-wrap: anywhere;
	}
</style>
