<script lang="ts">
	import { resolve } from '$app/paths';
	import CopyRegistrationGuide from '$lib/members/CopyRegistrationGuide.svelte';
	import AdmissionForm from '$lib/members/AdmissionForm.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Înscriere în centrul local | Scouts Cluj</title></svelte:head>
<main>
	<div class="page-tools">
		<a class="back" href={resolve('/login')}>← Înapoi la autentificare</a><CopyRegistrationGuide />
	</div>
	<section>
		<img
			src="/branding/scouts-cluj-wide.png"
			alt="Scouts Cluj — Cercetașii României"
			width="240"
			height="125"
		/>
		<p class="eyebrow">Primul pas în cercetășie</p>
		<h1>{form?.received ? 'Cererea a fost înregistrată' : 'Înscriere în centrul local'}</h1>
		<a class="tutorial-link" href={resolve('/tutorial-inscriere')}
			>Vezi tutorialul video pentru părinți →</a
		>
		{#if form?.received}
			<div class="success" role="status">
				<p>
					{form.nextSteps?.subject === 'child'
						? 'Ai trimis cererea de înscriere pentru copil. Iată ce urmează.'
						: form.nextSteps?.subject === 'other'
							? 'Ai trimis cererea pentru persoana înscrisă. Iată ce urmează.'
							: 'Ai făcut primul pas spre cercetășie. Iată ce urmează.'}
				</p>
				<h2>Pașii următori</h2>
				<ol class="next-steps">
					<li>
						<strong>Verificăm cererea.</strong>
						<p>
							Un administrator sau un lider autorizat va verifica datele și ramura aleasă. Dacă ai
							ales „Am nevoie de îndrumare”, te vom ajuta cu repartizarea. Nu trebuie să trimiți din
							nou formularul.
						</p>
					</li>
					<li>
						<strong>Pregătim contul național după aprobare.</strong>
						<p>
							{form.nextSteps?.subject === 'self'
								? 'Vom pregăti contul tău'
								: form.nextSteps?.subject === 'child'
									? 'Vom pregăti contul copilului'
									: 'Vom pregăti contul persoanei înscrise'} în
							<strong>Orgo (membri.scout.ro)</strong>, platforma națională care centralizează
							cercetașii din România. Același cont este folosit pentru autentificarea în Resurse
							Scouts Cluj. Trimiterea cererii nu oferă acces imediat.
						</p>
					</li>
					<li>
						<strong>Urmărește emailul despre crearea contului.</strong>
						<p>
							Emailul va ajunge la adresa aleasă în formular pentru contul membrului, inclusiv dacă
							ai folosit o adresă a părintelui. Verifică și Spam. Dacă nu îl primești după
							confirmarea înscrierii, contactează liderul sau centrul local.
						</p>
					</li>
					<li>
						<strong>Intră direct în Resurse.</strong>
						<p>
							Deschide <a href={resolve('/login')}>pagina de autentificare</a>, apasă „Connect with
							Orgo” și folosește codul primit pe email. Poți alege și Google dacă folosești aceeași
							adresă.
							<strong
								>Nu este nevoie să configurezi profilul în membri.scout.ro sau să setezi o parolă
								înainte.</strong
							>
						</p>
					</li>
				</ol>
				{#if form.nextSteps?.subject !== 'self'}<p class="parent-note">
						Contul aparține persoanei înscrise. Contactele părintelui sau ale celui care a completat
						formularul sunt păstrate separat și nu creează automat un al doilea cont.
					</p>{/if}
				<div class="next-actions">
					<a href={resolve('/login')}>Mergi la autentificare</a><a
						href="mailto:cluj.napoca@scout.ro">Contactează centrul local</a
					>
				</div>
			</div>
		{:else}<p class="intro">
				Alege mai întâi pentru cine faci înscrierea, apoi completează datele persoanei înscrise.
				Dacă ai deja un cont Orgo, <a href={resolve('/login')}>autentifică-te</a>.
			</p>
			{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}
			<AdmissionForm units={data.units} requestKey={data.requestKey} values={form?.values ?? {}} />
		{/if}
	</section>
</main>

<style>
	.tutorial-link {
		display: inline-block;
		margin: 0 0 24px;
		font-size: 14px;
		font-weight: 600;
		line-height: 1.5;
	}
	.page-tools {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}
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
	.next-steps {
		padding-left: 24px;
		display: grid;
		gap: 20px;
	}
	.next-steps li {
		padding-left: 8px;
	}
	.next-steps li::marker {
		color: var(--sc-accent);
		font-weight: 600;
	}
	.next-steps p {
		margin: 8px 0 0;
		color: var(--sc-muted);
	}
	.parent-note {
		background: var(--sc-inset);
		padding: 16px;
		border-radius: 8px;
	}
	.next-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 24px;
	}
	.next-actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
		padding: 12px 16px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		text-decoration: none;
		font-weight: 600;
	}
	.next-actions a:first-child {
		background: var(--sc-accent);
		color: var(--sc-surface);
		border-color: var(--sc-accent);
	}
	.next-actions a:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.next-actions a:hover {
		background: var(--sc-inset);
		color: var(--sc-accent);
	}
	@media (max-width: 600px) {
		.page-tools {
			flex-wrap: wrap;
		}
		main {
			padding: 16px 12px 40px;
		}
		section {
			padding: 24px 16px;
		}
	}
</style>
