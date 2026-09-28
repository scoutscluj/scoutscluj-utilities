<script lang="ts">
	import { resolve } from '$app/paths';
	import { legalVersion, organization } from './organization';

	let { title, children } = $props();
</script>

<svelte:head>
	<title>{title} · Resurse Scouts Cluj</title>
	<meta name="robots" content="index,follow" />
</svelte:head>

<main class="legal-page">
	<a class="back" href={resolve('/cotizatie')}>← Înapoi la cotizație</a>
	<article>
		<p class="eyebrow">Informații legale</p>
		<h1>{title}</h1>
		<p class="updated">Ultima actualizare: {legalVersion}</p>
		{@render children()}
	</article>
	<aside>
		<strong>{organization.legalName}</strong>
		<span
			>CIF {organization.taxId} · Registrul asociațiilor și fundațiilor {organization.registryNumber}</span
		>
		<span>{organization.address}</span>
		<a href={`mailto:${organization.email}`}>{organization.email}</a>
		<a href={`tel:${organization.phoneHref}`}>{organization.phoneDisplay}</a>
	</aside>
</main>

<style>
	.legal-page {
		width: min(100% - 32px, 860px);
		margin: 32px auto 64px;
	}
	.back {
		display: inline-block;
		margin-bottom: 18px;
		color: #475569;
	}
	article,
	aside {
		border: 1px solid #d8dee6;
		border-radius: 12px;
		background: #fff;
		padding: clamp(22px, 5vw, 48px);
	}
	article :global(h2) {
		margin: 32px 0 8px;
		font-size: 1.25rem;
	}
	article :global(h3) {
		margin: 24px 0 8px;
		font-size: 1rem;
	}
	article :global(p),
	article :global(li) {
		line-height: 1.65;
	}
	article :global(li + li) {
		margin-top: 7px;
	}
	h1 {
		margin: 8px 0;
		font-size: clamp(2rem, 6vw, 3rem);
		line-height: 1.08;
	}
	.eyebrow {
		margin: 0;
		color: #166534;
		font-size: 0.78rem;
		font-weight: 900;
		text-transform: uppercase;
	}
	.updated {
		color: #64748b;
	}
	aside {
		display: grid;
		gap: 7px;
		margin-top: 16px;
		padding: 22px;
		color: #475569;
		font-size: 0.92rem;
	}
</style>
