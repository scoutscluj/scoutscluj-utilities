<script lang="ts">
	import { enhance } from '$app/forms';
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { money, paymentLabels } from '$lib/membership/types';
	let { data, form } = $props();
	let search = $state('');
	let busy = $state<string | null>(null);
	const ledger = $derived(data.ledger);
	const open = $derived(
		ledger.checkouts.filter((c) => ['starting', 'pending', 'unknown'].includes(c.state))
	);
	const beneficiary = (c: (typeof ledger.checkouts)[number]) =>
		ledger.obligations.find((o) => o.id === c.obligationId)?.memberName ?? `ID ${c.identifier}`;
	const visible = $derived(
		open.filter((c) =>
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
	<section>
		<h2>Încercări deschise · {open.length}</h2>
		<label
			>Caută membru, ID sau referință<input
				type="search"
				bind:value={search}
				placeholder="Nume sau ID ORGO"
			/></label
		>
		<p>
			Închiderea ferestrei de plată nu anulează linkul. Anularea de aici păstrează istoricul și
			deblochează o nouă încercare; nu efectuează o rambursare.
		</p>
	</section>
	{#each visible as c (c.id)}
		<section>
			<div class="heading">
				<h2>{beneficiary(c)}</h2>
				<strong>{money(c.amountBani)}</strong>
			</div>
			<dl>
				<div>
					<dt>Stare</dt>
					<dd>{paymentLabels[c.state] ?? c.state}</dd>
				</div>
				<div>
					<dt>Procesator / mediu</dt>
					<dd>
						{c.provider === 'stripe' ? 'Stripe' : 'NETOPIA'} · {c.environment === 'live'
							? 'Producție'
							: 'Test'}
					</dd>
				</div>
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
			{#if c.reviewRequired}<p class="warning">
					Necesită verificare financiară. Compară tranzacția la procesator înainte de închidere.
				</p>{/if}
			{#if c.state === 'starting'}
				<p class="warning">Inițiere în curs. Actualizează pagina înainte de anulare.</p>
			{:else}
				<details>
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
		<section>
			<p>{open.length ? 'Nicio plată nu corespunde căutării.' : 'Nu există plăți în curs.'}</p>
		</section>
	{/each}
</MembershipAdminPage>

<style>
	.heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: baseline;
		flex-wrap: wrap;
	}
	.heading strong {
		color: #c81e1e;
	}
	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	dt,
	small {
		color: #64748b;
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
		color: #92400e;
		background: #fffbeb;
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
	@media (max-width: 600px) {
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
