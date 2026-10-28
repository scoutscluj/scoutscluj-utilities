<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>Acorduri parentale | Scouts Cluj</title></svelte:head>
<section class="page">
	<h1>Acorduri parentale</h1>
	<div class="notice">
		<strong>Editor de șabloane · suspendat temporar</strong>
		<p>
			Folosim un singur format de acord, bazat pe documentul Cântul Vâlvelor 2026. Crearea și
			modificarea drafturilor generale sunt puse în așteptare.
		</p>
	</div>
	<h2>Pregătește acordul direct în activitate</h2>
	<p>
		Deschide activitatea → Înscrieri → Setări înscrieri → Acord parental. Acolo completezi textele
		despre program, transport, echipament și prim ajutor. Numele, perioada și locația se preiau din
		activitate, iar datele participantului se completează la înscriere.
	</p>
	<a href={resolve('/activities')}>Deschide activitățile →</a>
	<p>
		Acordurile și fișierele generate anterior sunt păstrate. Participanții descarcă acordul
		completat la finalul înscrierii, îl semnează olograf sau digital și îl predau ori îl încarcă în
		pagina personală.
	</p>
</section>

<style>
	.page {
		max-width: 850px;
		display: grid;
		gap: 18px;
		padding: 24px;
	}
	h1,
	h2,
	p {
		margin: 0;
	}
	p {
		line-height: 1.65;
	}
	.notice {
		padding: 20px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-left: 4px solid var(--sc-accent);
		border-radius: 10px;
	}
	.notice p {
		margin-top: 10px;
	}
	a {
		color: var(--sc-accent);
		font-weight: 600;
	}
</style>
