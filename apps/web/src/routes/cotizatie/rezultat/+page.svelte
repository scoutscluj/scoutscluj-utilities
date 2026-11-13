<script lang="ts">
	import { resolve } from '$app/paths';
	import { money, paymentLabels } from '$lib/membership/types';
	let { data } = $props();
</script>

<svelte:head
	><title>Starea plății · Cotizație</title><meta name="robots" content="noindex" /></svelte:head
>
<main>
	<p class="eyebrow">
		{data.status?.purpose === 'admission' ? 'Adeziune' : 'Cotizații'} · Confirmarea plății
	</p>
	<h1>
		{data.status
			? (paymentLabels[data.status.state] ?? 'În curs de verificare')
			: 'Plata nu poate fi identificată în acest browser'}
	</h1>
	{#if data.status}
		{@const provider = data.status.provider === 'stripe' ? 'Stripe' : 'NETOPIA'}
		{#if data.status.state === 'pending' && data.status.paymentUrl}<p>
				<a href={data.status.paymentUrl}>Reia aceeași plată pe {provider}</a>
			</p>{/if}
		<div class="payment-details">
			<span>Suma plății</span><strong>{money(data.status.amountBani)}</strong><span
				>Procesator: {provider}</span
			>
		</div>
		{#if data.status.state === 'succeeded'}<p>
				{provider} a confirmat primirea plății.
			</p>{:else if data.status.provider === 'stripe' && data.status.state === 'pending'}<p>
				Poți redeschide linkul sau poți începe o altă plată din pagina de cotizație. Aplicația
				închide mai întâi linkul vechi neplătit.
			</p>{:else}<p>
				Revenirea de la {provider} nu confirmă singură plata. Nu repeta plata cât timp este în curs sau
				necesită verificare.
			</p>{/if}
		{#if data.status.requiresStaffReview}<p class="notice">
				Responsabilul financiar trebuie să verifice plata înainte de confirmarea încasării.
			</p>{/if}
	{/if}
	<div class="actions">
		<a href={resolve('/cotizatie/rezultat')}>Actualizează starea</a>
		<a href={resolve('/cotizatie')}>Înapoi la cotizație</a>
	</div>
</main>

<style>
	main {
		border: 1px solid var(--sc-border);
		border-radius: 16px;
		background: var(--sc-surface);

		max-width: 680px;
		width: min(680px, calc(100% - 32px));
		margin: 24px auto;
		color: var(--sc-ink);
		padding: 24px;
	}
	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 700;
		color: var(--sc-muted);
	}
	h1 {
		font-size: clamp(1.5rem, 4vw, 2rem);
	}
	.payment-details {
		display: grid;
		gap: 8px;
		padding: 20px;
		border-radius: 12px;
		background: var(--sc-canvas);
		color: var(--sc-muted);
	}
	.payment-details strong {
		font-size: 2rem;
		color: var(--sc-ink);
	}
	.notice {
		padding: 16px;
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
		border: 1px solid var(--sc-warning);
		border-radius: 10px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 24px;
	}
	.actions a {
		padding: 12px 16px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}
	.actions a:first-child {
		background: var(--sc-accent);
		border-color: var(--sc-accent);
		color: var(--sc-on-accent);
	}
	a {
		color: var(--sc-link);
	}
	.actions a {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	h1 {
		overflow-wrap: anywhere;
		line-height: 1.25;
	}
	@media (max-width: 600px) {
		main {
			padding: 20px;
		}
		.actions a {
			width: 100%;
		}
	}
	a:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 3px;
	}
	p {
		line-height: 1.6;
	}
</style>
