<script lang="ts">
	import { resolve } from '$app/paths';
	import { organization } from './organization';
</script>

<footer>
	<div class="identity">
		<strong>{organization.legalName}</strong>
		<span
			>CIF {organization.taxId} · Registrul asociațiilor și fundațiilor {organization.registryNumber}</span
		>
		<span>{organization.address}</span>
		<span
			><a href={`mailto:${organization.email}`}>{organization.email}</a> ·
			<a href={`tel:${organization.phoneHref}`}>{organization.phoneDisplay}</a></span
		>
	</div>
	<nav aria-label="Informații legale">
		<a href={resolve('/legal/termeni-si-conditii')}>Termeni și condiții</a>
		<a href={resolve('/legal/confidentialitate')}>Confidențialitate și GDPR</a>
		<a href={resolve('/legal/livrare')}>Confirmarea plății</a>
		<a href={resolve('/legal/anulare-si-retragere')}>Anulare și retragere</a>
		<a href={resolve('/legal/contact')}>Contact</a>
		<a href="https://anpc.ro/sal/" rel="external">Soluționarea alternativă a litigiilor – ANPC</a>
	</nav>
	<p class="payments">
		Plăți online procesate securizat de NETOPIA Payments sau Stripe · Carduri Visa și Mastercard
	</p>
</footer>

<style>
	footer {
		display: grid;
		grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
		gap: 24px 48px;
		border-top: 1px solid #d8dee6;
		background: #fff;
		padding: 28px max(24px, calc((100vw - 1180px) / 2));
		color: #475569;
		font-size: 0.86rem;
	}
	.identity,
	nav {
		display: grid;
		align-content: start;
		gap: 7px;
	}
	strong {
		color: #17202a;
	}
	nav {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	nav a {
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}
	.payments {
		grid-column: 1 / -1;
		margin: 0;
		border-top: 1px solid #e2e8f0;
		padding-top: 16px;
		font-weight: 700;
	}
	@media (max-width: 680px) {
		footer {
			grid-template-columns: 1fr;
		}
		nav {
			grid-template-columns: 1fr;
		}
	}
</style>
