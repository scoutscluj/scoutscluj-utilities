<script lang="ts">
	let { data } = $props();

	const platformSlices = [
		{
			label: 'Frontend',
			value: 'SvelteKit',
			detail: 'Interfata, rute protejate si experienta PWA.'
		},
		{
			label: 'Backend',
			value: 'NestJS',
			detail: 'API, autorizare, integrari si logica de domeniu.'
		},
		{
			label: 'Persistenta',
			value: 'Postgres + MikroORM',
			detail: 'Model relational, migrari si audit.'
		}
	];
</script>

<svelte:head>
	<title>Scouts Cluj Utilities</title>
	<meta
		name="description"
		content="Noua platforma Scouts Cluj Utilities cu SvelteKit, NestJS si Postgres."
	/>
</svelte:head>

<main class="shell">
	<section class="intro">
		<p class="eyebrow">Scouts Cluj Utilities</p>
		<h1>Platforma operationala pentru Centrul Local Cluj</h1>
		<p class="summary">
			Acesta este scheletul noului monorepo. Functionalitatile vor fi migrate prin propuneri
			OpenSpec, folosind aplicatia veche ca referinta de comportament si date.
		</p>
	</section>

	<section class="status-panel" aria-label="Status servicii">
		<div>
			<p class="status-label">API</p>
			<p class="status-value">{data.apiBaseUrl}</p>
		</div>

		{#if data.apiStatus.reachable}
			<span class="status-pill ok">online</span>
		{:else}
			<span class="status-pill warn">indisponibil</span>
		{/if}
	</section>

	{#if !data.apiStatus.reachable}
		<p class="status-note">API-ul nu raspunde inca: {data.apiStatus.error}</p>
	{:else}
		<p class="status-note">Ultima verificare API: {data.apiStatus.timestamp}</p>
	{/if}

	<section class="grid" aria-label="Arhitectura">
		{#each platformSlices as slice (slice.label)}
			<article>
				<p>{slice.label}</p>
				<h2>{slice.value}</h2>
				<span>{slice.detail}</span>
			</article>
		{/each}
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f6f7f9;
		color: #17202a;
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}

	.shell {
		box-sizing: border-box;
		width: min(100%, 1080px);
		margin: 0 auto;
		padding: 56px 24px;
	}

	.intro {
		max-width: 760px;
	}

	.eyebrow,
	.status-label,
	article p {
		margin: 0;
		color: #52616f;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin: 12px 0 0;
		font-size: clamp(2rem, 5vw, 4rem);
		line-height: 1;
		letter-spacing: 0;
	}

	.summary {
		max-width: 680px;
		margin: 22px 0 0;
		color: #394956;
		font-size: 1.08rem;
		line-height: 1.6;
	}

	.status-panel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		margin-top: 40px;
		padding: 18px 0;
		border-top: 1px solid #d7dde3;
		border-bottom: 1px solid #d7dde3;
	}

	.status-value {
		margin: 6px 0 0;
		color: #17202a;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
		font-size: 0.95rem;
		overflow-wrap: anywhere;
	}

	.status-pill {
		display: inline-flex;
		min-width: 92px;
		justify-content: center;
		border-radius: 999px;
		padding: 8px 12px;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.ok {
		background: #d8f3dc;
		color: #1b5e20;
	}

	.warn {
		background: #fff3cd;
		color: #744c00;
	}

	.status-note {
		margin: 12px 0 0;
		color: #52616f;
		font-size: 0.92rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		margin-top: 36px;
	}

	article {
		min-height: 156px;
		border: 1px solid #d7dde3;
		border-radius: 8px;
		background: #ffffff;
		padding: 22px;
	}

	article h2 {
		margin: 12px 0 10px;
		font-size: 1.35rem;
		letter-spacing: 0;
	}

	article span {
		color: #52616f;
		line-height: 1.5;
	}

	@media (max-width: 760px) {
		.shell {
			padding: 36px 18px;
		}

		.status-panel {
			align-items: flex-start;
			flex-direction: column;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
