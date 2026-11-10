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
		<h1>{form?.received ? 'Cererea a fost înregistrată' : 'Înscriere în centrul local'}</h1>
		{#if form?.received}<div class="success" role="status">
				<p>
					{form.nextSteps?.forChild
						? 'Ai trimis cererea de înscriere pentru copil. Iată ce urmează.'
						: 'Ai făcut primul pas spre cercetășie. Iată ce urmează.'}
				</p>
				<h2>Pașii următori</h2>
				<ol class="next-steps">
					<li>
						<strong>Verificăm cererea.</strong>
						<p>
							Un administrator sau un lider va verifica datele și ramura aleasă. Dacă ai ales „Am
							nevoie de îndrumare”, te vom ajuta cu repartizarea. Nu trebuie să trimiți din nou
							formularul.
						</p>
					</li>
					<li>
						<strong>Pregătim profilul Orgo după aprobare.</strong>
						<p>
							{form.nextSteps?.forChild
								? 'După confirmarea înscrierii, vom crea sau asocia profilul copilului în Orgo (membri.scout.ro).'
								: 'După confirmarea înscrierii, vom crea sau asocia profilul tău în Orgo (membri.scout.ro).'}
							Trimiterea formularului nu oferă acces imediat la cont.
						</p>
					</li>
					{#if form.nextSteps?.hasMemberEmail}
						<li>
							<strong>Urmărește emailul pentru acces.</strong>
							<p>
								{form.nextSteps?.forChild
									? 'Pentru un cont nou, instrucțiunile Orgo de acces se trimit la emailul copilului completat în formular, dacă notificările sunt activate.'
									: 'Pentru un cont nou, instrucțiunile Orgo de acces se trimit la emailul tău, dacă notificările sunt activate.'}
								Verifică și Spam. Dacă nu primești instrucțiuni după confirmarea înscrierii, contactează
								centrul local. Dacă profilul era deja asociat unui cont, se folosește accesul existent.
							</p>
						</li>
						<li>
							<strong>Revino și autentifică-te cu Orgo.</strong>
							<p>
								După ce contul este activ și accesul este pregătit, apasă „Connect with Orgo” pe
								pagina de autentificare. Vei intra prin Orgo și vei reveni în aplicație.
							</p>
						</li>
					{:else}
						<li>
							<strong
								>{form.nextSteps?.forChild
									? 'Stabilim împreună accesul copilului.'
									: 'Stabilim împreună accesul tău.'}</strong
							>
							<p>
								{form.nextSteps?.forChild
									? 'Nu ai completat un email propriu al copilului.'
									: 'Nu ai completat un email propriu.'} Nu se trimit instrucțiuni de acces la emailul
								părintelui în locul celui al copilului și nu se creează automat un cont pentru părinte.
								După aprobarea înscrierii, contactează centrul local pentru a stabili accesul.
							</p>
						</li>
						<li>
							<strong>Autentificarea va fi prin Orgo.</strong>
							<p>
								După stabilirea accesului și activarea contului, se folosește „Connect with Orgo” pe
								pagina de autentificare.
							</p>
						</li>
					{/if}
				</ol>
				{#if form.nextSteps?.forChild}<p class="parent-note">
						Datele tale de părinte / tutore sunt păstrate separat de contul copilului. Completarea
						lor nu îți acordă automat acces la profilul copilului.
					</p>{/if}
				<div class="next-actions">
					<a href={resolve('/login')}>Înapoi la autentificare</a><a
						href="mailto:cluj.napoca@scout.ro">Contactează centrul local</a
					>
				</div>
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
		main {
			padding: 16px 12px 40px;
		}
		section {
			padding: 24px 16px;
		}
	}
</style>
