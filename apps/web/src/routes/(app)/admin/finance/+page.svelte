<script lang="ts">
	import { resolve } from '$app/paths';
	import Users from '@lucide/svelte/icons/users';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import BookOpen from '@lucide/svelte/icons/book-open';
</script>

<svelte:head><title>Administrare financiară · Scouts Cluj</title></svelte:head>

<header>
	<p class="eyebrow">Admin · Financiar</p>
	<h1>Administrare financiară</h1>
	<p>Gestionează cotizațiile membrilor și configurarea plăților online.</p>
</header>
<div class="modules">
	<a class="module-card" href={resolve('/admin/finance/guide')}>
		<span class="icon"><BookOpen size={24} /></span>
		<h2>Ghid financiar</h2>
		<p>
			Cum funcționează cotizațiile, încasările, procesatorii de plăți și transferurile naționale,
			explicat pas cu pas.
		</p>
		<span class="action">Citește ghidul <ArrowRight size={18} /></span>
	</a>
	<a class="module-card" href={resolve('/admin/finance/membership')}>
		<span class="icon"><Users size={24} /></span>
		<h2>Membri și cotizații</h2>
		<p>Situația cotizațiilor, sumele achitate și restanțele fiecărui membru.</p>
		<span class="action">Deschide registrul <ArrowRight size={18} /></span>
	</a>
	<a class="module-card" href={resolve('/admin/finance/receipts')}>
		<span class="icon"><CreditCard size={24} /></span>
		<h2>Încasări și alocări</h2>
		<p>Plățile primite, încasările bancare și alocarea sumelor la cotizațiile membrilor.</p>
		<span class="action">Gestionează încasările <ArrowRight size={18} /></span>
	</a>
	<a class="module-card" href={resolve('/admin/finance/transfers')}>
		<span class="icon"><ArrowRight size={24} /></span>
		<h2>Transferuri naționale</h2>
		<p>Selecția cotizațiilor achitate, înregistrarea transferurilor și confirmările ORGO.</p>
		<span class="action">Gestionează transferurile <ArrowRight size={18} /></span>
	</a>
	<a class="module-card" href={resolve('/admin/finance/membership-settings')}>
		<span class="icon"><Users size={24} /></span>
		<h2>Configurare cotizații</h2>
		<p>Perioade, tarife, sincronizare ORGO și adăugarea cotizațiilor verificate.</p>
		<span class="action">Configurează cotizațiile <ArrowRight size={18} /></span>
	</a>
	<a class="module-card" href={resolve('/admin/finance/payment-processor')}>
		<span class="icon"><CreditCard size={24} /></span>
		<h2>Procesatori de plăți</h2>
		<p>
			Alege procesatorul activ și gestionează configurațiile NETOPIA și Stripe pentru test și
			producție.
		</p>
		<span class="action">Configurează plățile <ArrowRight size={18} /></span>
	</a>
</div>

<style>
	header {
		margin-bottom: 28px;
	}
	.eyebrow {
		margin: 0;
		text-transform: uppercase;
		font-size: 0.76rem;
		font-weight: 700;
		color: #64748b;
	}
	h1 {
		margin: 8px 0 12px;
		font-size: clamp(1.8rem, 3vw, 2.3rem);
	}
	p {
		color: #52616f;
		line-height: 1.6;
	}
	.modules {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 24px;
	}
	.module-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		background: white;
		border: 1px solid #d8dee6;
		border-radius: 14px;
		padding: 28px;
		text-decoration: none;
		box-shadow: 0 4px 16px rgb(15 23 42 / 0.03);
	}
	.module-card:hover {
		border-color: #fca5a5;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: #fef2f2;
		color: #b91c1c;
	}
	h2 {
		margin: 20px 0 0;
		font-size: 1.3rem;
	}
	.module-card p {
		flex: 1;
	}
	.action {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
		color: #991b1b;
		font-weight: 650;
	}
	a:focus-visible {
		outline: 3px solid #fca5a5;
		outline-offset: 3px;
	}
	@media (max-width: 760px) {
		.modules {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.module-card {
			padding: 22px;
		}
	}
</style>
