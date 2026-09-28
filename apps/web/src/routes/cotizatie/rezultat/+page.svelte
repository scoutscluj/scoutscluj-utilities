<script lang="ts">
	import { resolve } from '$app/paths';
	import { money, paymentLabels } from '$lib/membership/types';
	let { data } = $props();
</script>

<svelte:head
	><title>Starea plății · Cotizație</title><meta name="robots" content="noindex" /></svelte:head
>
<main>
	<h1>
		{data.status
			? (paymentLabels[data.status.state] ?? 'În curs de verificare')
			: 'Plata nu poate fi identificată în acest browser'}
	</h1>
	{#if data.status}
		{#if data.status.state === 'pending' && data.status.paymentUrl}<p>
				<a href={data.status.paymentUrl}>Reia aceeași plată pe NETOPIA</a>
			</p>{/if}
		<p>{money(data.status.amountBani)}</p>
		{#if data.status.state === 'succeeded'}<p>NETOPIA a confirmat primirea plății.</p>{:else}<p>
				Revenirea de la NETOPIA nu confirmă singură plata. Nu repeta plata cât timp este în curs sau
				necesită verificare.
			</p>{/if}
		{#if data.status.requiresStaffReview}<p>
				Responsabilul financiar trebuie să verifice plata înainte de creditarea cotizației.
			</p>{/if}
	{/if}
	<p><a href={resolve('/cotizatie/rezultat')}>Actualizează starea</a></p>
	<a href={resolve('/cotizatie')}>Înapoi la cotizație</a>
</main>

<style>
	main {
		max-width: 680px;
		margin: 48px auto;
		padding: 24px;
	}
	p {
		line-height: 1.6;
	}
</style>
