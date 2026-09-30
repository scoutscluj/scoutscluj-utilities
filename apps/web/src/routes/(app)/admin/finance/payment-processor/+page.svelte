<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, form } = $props();
	const configuration = $derived(data.paymentConfiguration);
	const environmentLabel = (environment: string) =>
		environment === 'live' ? 'Producție' : environment === 'test' ? 'Test' : 'Sandbox';
	const activeTarget = $derived(
		configuration.providers.find(
			(provider) =>
				provider.id === configuration.activeProvider &&
				provider.environment === configuration.activeEnvironment
		)
	);
</script>

<svelte:head>
	<title>Procesator plăți | Scouts Cluj Utilities</title>
</svelte:head>

<div class="page-heading">
	<p class="eyebrow">Admin · Financiar</p>
	<h1>Procesator plăți</h1>
	<p>Alege procesatorul folosit pentru plățile noi și gestionează datele de conectare.</p>
	<a href={resolve('/admin')}>← Înapoi la administrare</a>
</div>

{#if form?.message}
	<p role="status" class="notice">{form.message}</p>
{/if}

<section>
	<div class="section-heading">
		<div>
			<p class="eyebrow">Plăți noi</p>
			<h2>Procesator activ</h2>
		</div>
		<span class="active-provider"
			>{activeTarget?.label ?? configuration.activeProvider} ·
			{environmentLabel(configuration.activeEnvironment)}</span
		>
	</div>

	<form method="POST" class="provider-form">
		<input type="hidden" name="action" value="provider" />
		{#each configuration.providers as provider (provider.targetId)}
			<label class:unavailable={!provider.ready} class="provider-option">
				<input
					type="radio"
					name="target"
					value={provider.targetId}
					checked={provider.id === configuration.activeProvider &&
						provider.environment === configuration.activeEnvironment}
					disabled={!provider.ready}
				/>
				<span>
					<strong>{provider.label}</strong>
					<small
						>{environmentLabel(provider.environment)} ·
						{provider.ready ? `configurat · cheie …${provider.secretHint}` : 'neconfigurat'}</small
					>
				</span>
			</label>
		{/each}
		<p class="help-text">
			Schimbarea se aplică plăților inițiate după salvare. O plată deja pornită rămâne la
			procesatorul și în mediul înregistrate pentru ea.
		</p>
		<button>Folosește procesatorul selectat</button>
	</form>
</section>

<section>
	<p class="eyebrow">Date de conectare</p>
	<h2>Configurații securizate</h2>
	{#if !configuration.vaultReady}
		<p class="notice">
			Cheia KMS a aplicației nu este disponibilă. Configurațiile nu pot fi salvate până la activarea
			seifului.
		</p>
	{/if}
	<p class="help-text">
		Valorile secrete sunt criptate de API înainte de salvare și nu pot fi afișate ulterior. Pentru
		rotație, completează din nou toate câmpurile procesatorului.
	</p>

	<div class="provider-configurations">
		<form method="POST" class="provider-form provider-card" autocomplete="off">
			<input type="hidden" name="action" value="provider-configuration" />
			<input type="hidden" name="provider" value="netopia" />
			<h3>NETOPIA Payments</h3>
			{#each configuration.providers.filter((item) => item.id === 'netopia') as current (current.targetId)}
				<small
					><strong>{environmentLabel(current.environment)}:</strong>
					{current.ready ? `configurat · cheie …${current.secretHint}` : 'neconfigurat'}</small
				>
			{/each}
			<fieldset disabled={!configuration.vaultReady}>
				<label
					>Mediu<select name="environment" required
						><option value="sandbox">Sandbox</option><option value="live">Producție</option></select
					></label
				>
				<label
					>API key<input
						type="password"
						name="apiKey"
						required
						autocomplete="new-password"
					/></label
				>
				<label
					>Semnătura POS<input
						type="password"
						name="posSignature"
						required
						autocomplete="new-password"
					/></label
				>
				<label
					>Certificatul public<textarea name="publicKey" required rows="8" spellcheck="false"
					></textarea></label
				>
				<button>Salvează o revizie NETOPIA</button>
			</fieldset>
		</form>

		<form method="POST" class="provider-form provider-card" autocomplete="off">
			<input type="hidden" name="action" value="provider-configuration" />
			<input type="hidden" name="provider" value="stripe" />
			<h3>Stripe</h3>
			{#each configuration.providers.filter((item) => item.id === 'stripe') as current (current.targetId)}
				<small
					><strong>{environmentLabel(current.environment)}:</strong>
					{current.ready ? `configurat · cheie …${current.secretHint}` : 'neconfigurat'}</small
				>
			{/each}
			<fieldset disabled={!configuration.vaultReady}>
				<label
					>Mediu<select name="environment" required
						><option value="test">Test</option><option value="live">Producție</option></select
					></label
				>
				<label
					>Secret key<input
						type="password"
						name="secretKey"
						required
						autocomplete="new-password"
					/></label
				>
				<label
					>Webhook signing secret<input
						type="password"
						name="webhookSecret"
						required
						autocomplete="new-password"
					/></label
				>
				<button>Salvează o revizie Stripe</button>
			</fieldset>
		</form>
	</div>
</section>

<style>
	.page-heading,
	section,
	.notice {
		max-width: 980px;
	}

	.page-heading {
		margin-bottom: 24px;
	}

	.page-heading h1,
	section h2,
	section h3 {
		margin: 6px 0;
	}

	.page-heading > p:not(.eyebrow),
	.help-text {
		color: #52616f;
	}

	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	section {
		margin: 24px 0;
		border: 1px solid #d8dee6;
		border-radius: 12px;
		padding: 20px;
		background: white;
	}

	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.active-provider {
		border-radius: 999px;
		background: #dcfce7;
		padding: 6px 10px;
		color: #166534;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.provider-form {
		display: grid;
		gap: 12px;
		margin-top: 18px;
	}

	.provider-option {
		display: flex;
		align-items: center;
		gap: 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 14px;
	}

	.provider-option.unavailable {
		opacity: 0.65;
	}

	.provider-option span,
	.provider-card fieldset,
	.provider-card label {
		display: grid;
		gap: 6px;
	}

	.provider-configurations {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 24px;
	}

	.provider-card {
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 16px;
	}

	.provider-card fieldset {
		border: 0;
		padding: 0;
		margin: 8px 0 0;
	}

	input,
	textarea,
	select,
	button {
		max-width: 100%;
		border: 1px solid #94a3b8;
		border-radius: 6px;
		padding: 10px;
		font: inherit;
	}

	button {
		justify-self: start;
		margin-top: 4px;
		background: #166534;
		color: white;
		cursor: pointer;
	}

	button:disabled,
	fieldset:disabled {
		opacity: 0.55;
	}

	.notice {
		border: 1px solid #f59e0b;
		border-radius: 8px;
		background: #fffbeb;
		padding: 12px;
	}

	@media (max-width: 620px) {
		.section-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
