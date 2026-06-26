<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Offline | ScoutsCluj</title>
</svelte:head>

<main class="offline-page">
	<section aria-labelledby="offline-title">
		<p class="eyebrow">Offline</p>
		<h1 id="offline-title">Conexiunea nu este disponibilă</h1>
		<p>
			Paginile vizitate anterior pot rămâne disponibile din cache. Operațiile care modifică
			informații, încarcă documente sau verifică date proaspete au nevoie de internet.
		</p>
		<a href={resolve('/')}>Reîncearcă</a>
	</section>
</main>

<style>
	.offline-page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
	}

	section {
		width: min(100%, 520px);
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 28px;
		box-shadow: 0 18px 50px rgb(15 23 42 / 0.08);
	}

	.eyebrow,
	h1,
	p {
		margin: 0;
	}

	.eyebrow {
		color: #b45309;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin-top: 8px;
		font-size: 2rem;
		line-height: 1.1;
	}

	p {
		margin-top: 14px;
		color: #52616f;
		line-height: 1.55;
	}

	a {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 22px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 14px;
		color: #17202a;
		font-weight: 850;
		text-decoration: none;
	}

	a:hover {
		border-color: #991b1b;
		color: #991b1b;
	}
</style>
