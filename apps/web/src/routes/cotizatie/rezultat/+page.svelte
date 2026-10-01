<script lang="ts">
	import { resolve } from '$app/paths';
	import { money, paymentLabels } from '$lib/membership/types';
	let { data } = $props();
</script>

<svelte:head
	><title>Starea plății · Cotizație</title><meta name="robots" content="noindex" /></svelte:head
>
<main>
	<p class="eyebrow">Cotizații · Confirmarea plății</p>
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
				Responsabilul financiar trebuie să verifice plata înainte de creditarea cotizației.
			</p>{/if}
	{/if}
	<div class="actions">
		<a href={resolve('/cotizatie/rezultat')}>Actualizează starea</a>
		<a href={resolve('/cotizatie')}>Înapoi la cotizație</a>
	</div>
</main>

<style>
	main {
		border: 1px solid #d8dee6;
		border-radius: 16px;
		background: white;
		box-shadow: 0 4px 16px rgb(15 23 42 / 0.03);
		max-width: 680px;
		margin: 48px auto;
		padding: 24px;
	}
	.eyebrow {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 700;
		color: #64748b;
	}
	h1 {
		font-size: clamp(1.5rem, 4vw, 2rem);
	}
	.payment-details {
		display: grid;
		gap: 8px;
		padding: 20px;
		border-radius: 12px;
		background: #f8fafc;
		color: #475569;
	}
	.payment-details strong {
		font-size: 2rem;
		color: #17202a;
	}
	.notice {
		padding: 16px;
		background: #fff7ed;
		border: 1px solid #fed7aa;
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
		border: 1px solid #d8dee6;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
	}
	.actions a:first-child {
		background: #c81e1e;
		border-color: #c81e1e;
		color: white;
	}
	a:focus-visible {
		outline: 3px solid #fca5a5;
		outline-offset: 3px;
	}
	p {
		line-height: 1.6;
	}
</style>
