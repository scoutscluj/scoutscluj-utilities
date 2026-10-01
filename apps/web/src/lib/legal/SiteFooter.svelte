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
	<div class="payments">
		<p>
			Plăți online procesate securizat de NETOPIA Payments sau Stripe · Carduri Visa și Mastercard
		</p>
		<a
			class="netopia-logo"
			href="https://netopia-payments.com/"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="NETOPIA Payments — site oficial (se deschide într-o filă nouă)"
		>
			<img
				src="https://mny.ro/np-black-1.svg"
				width="150"
				height="104"
				alt="NETOPIA Payments — Mastercard și Visa"
			/>
		</a>
	</div>
</footer>

<style>
	footer {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 24px 48px;
		border-top: 1px solid #d8dee6;
		background: #fff;
		padding: 28px clamp(16px, 3vw, 40px);
		overflow-wrap: anywhere;
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		grid-column: 1 / -1;
		margin: 0;
		border-top: 1px solid #e2e8f0;
		padding-top: 16px;
		font-weight: 700;
	}
	.payments p {
		margin: 0;
		line-height: 1.6;
	}
	.netopia-logo {
		display: block;
		flex: 0 0 150px;
		border-radius: 6px;
		background: #fff;
	}
	.netopia-logo img {
		display: block;
		width: 150px;
		height: auto;
	}
	.netopia-logo:focus-visible {
		outline: 3px solid #fca5a5;
		outline-offset: 4px;
	}
	@media (max-width: 680px) {
		.payments {
			align-items: flex-start;
			flex-direction: column;
		}
		.netopia-logo {
			flex-basis: auto;
		}
		footer {
			grid-template-columns: 1fr;
		}
		nav {
			grid-template-columns: 1fr;
		}
	}
</style>
