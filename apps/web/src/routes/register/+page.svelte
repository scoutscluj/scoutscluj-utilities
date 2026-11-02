<script lang="ts">
	import { resolve } from '$app/paths';
	import AdmissionForm from '$lib/members/AdmissionForm.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Înscriere în centrul local | Scouts Cluj</title></svelte:head>
<main>
	<a class="back" href={resolve('/login')}>← Înapoi la autentificare</a>
	<section>
		<img
			src="/branding/scouts-cluj-wide.png"
			alt="Scouts Cluj — Cercetașii României"
			width="240"
			height="125"
		/>
		<p class="eyebrow">Primul pas în cercetășie</p>
		<h1>Înscriere în centrul local</h1>
		{#if form?.received}<div class="success" role="status">
				<h2>Cererea a fost înregistrată</h2>
				<p>
					Un admin sau un lider al unității alese va verifica datele. Contul Orgo va fi creat sau
					asociat după confirmarea înscrierii.
				</p>
				<a href={resolve('/login')}>Înapoi la autentificare</a>
			</div>
		{:else}<p class="intro">
				Completează datele tale sau ale copilului. Dacă ai deja un cont Orgo, <a
					href={resolve('/login')}>autentifică-te</a
				>.
			</p>
			{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
			<AdmissionForm units={data.units} requestKey={data.requestKey} values={form?.values ?? {}} />
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 32px 24px 64px;
	}
	section {
		background: var(--sc-surface);
		padding: 32px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		margin-top: 24px;
	}
	img {
		display: block;
		max-width: 240px;
		width: 100%;
		height: auto;
		margin-bottom: 24px;
	}
	h1 {
		font-size: 1.9rem;
		line-height: 1.15;
		letter-spacing: -0.025em;
		margin: 8px 0 16px;
	}
	.eyebrow {
		text-transform: uppercase;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--sc-muted);
		margin: 0;
	}
	.intro {
		color: var(--sc-muted);
		line-height: 1.6;
		margin-bottom: 32px;
	}
	a {
		color: var(--sc-accent);
	}
	.back {
		font-size: 0.9rem;
	}
	.error {
		padding: 12px;
		background: var(--sc-accent-soft);
		color: var(--sc-accent-hover);
		border-radius: 7px;
	}
	.success p {
		line-height: 1.6;
	}
	@media (max-width: 600px) {
		main {
			padding: 16px 12px 40px;
		}
		section {
			padding: 24px 16px;
		}
	}
</style>
