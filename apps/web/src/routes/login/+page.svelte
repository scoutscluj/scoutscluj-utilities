<script lang="ts">
	import { resolve } from '$app/paths';
	import { CalendarDays, UserPlus, Wallet } from '@lucide/svelte';
	let isStarting = $state(false);
	let error = $state<string | null>(null);

	const startLogin = () => {
		isStarting = true;
		error = null;
		const params = new URLSearchParams(window.location.search);
		const redirectTo = params.get('redirectTo');
		const startUrl = new URL('/auth/orgo/start', window.location.origin);

		if (redirectTo) {
			startUrl.searchParams.set('redirectTo', redirectTo);
		}

		window.location.href = startUrl.toString();
	};
</script>

<svelte:head>
	<title>Login | Scouts Cluj Utilities</title>
</svelte:head>

<main class="login-page">
	<section class="login-panel" aria-labelledby="login-title">
		<img
			class="center-logo"
			src="/branding/scouts-cluj-wide.png"
			alt="Scouts Cluj — Cercetașii României"
			width="320"
			height="167"
		/>
		<p class="eyebrow">Scouts Cluj Utilities</p>
		<h1 id="login-title">Autentificare</h1>
		<p class="summary">Accesul în aplicație se face prin contul tău Orgo (membri.scout.ro).</p>

		<button type="button" class="orgo-button" disabled={isStarting} onclick={startLogin}>
			<img class="button-mark" src="/branding/orgo-symbol.png" alt="ORGO" width="34" height="34" />
			{isStarting ? 'Se deschide Orgo...' : 'Connect with Orgo'}
		</button>
		<nav class="public-actions" aria-label="Înscriere și servicii pentru membri">
			<a class="public-action register-action" href={resolve('/register')}>
				<UserPlus size={22} aria-hidden="true" />
				Înscrie-te în centrul local
			</a>
			<a class="public-action" href={resolve('/activitati')}>
				<CalendarDays size={22} aria-hidden="true" />
				Activități și înscrieri
			</a>
			<a class="public-action" href={resolve('/cotizatie')}>
				<Wallet size={22} aria-hidden="true" />
				Plata cotizației
			</a>
		</nav>

		{#if error}
			<p class="error" role="alert">{error}</p>
		{/if}
	</section>
</main>

<style>
	.login-page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
	}

	.login-panel {
		width: min(100%, 420px);
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 32px;
		box-shadow: 0 18px 50px rgb(15 23 42 / 0.08);
	}

	.eyebrow {
		margin: 0;
		color: var(--sc-muted);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0;
		text-transform: uppercase;
	}
	.center-logo {
		display: block;
		width: 100%;
		height: auto;
		margin-bottom: 20px;
	}

	h1 {
		margin: 12px 0 0;
		font-size: 2rem;
		line-height: 1.1;
	}

	.summary {
		margin: 12px 0 28px;
		color: var(--sc-muted);
		line-height: 1.5;
	}

	.orgo-button {
		width: 100%;
		min-height: 56px;
		padding: 10px 16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: 1px solid var(--sc-accent);
		border-radius: 8px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		font-weight: 600;
		cursor: pointer;
	}

	.orgo-button:hover:not(:disabled) {
		background: var(--sc-accent-hover);
	}

	.public-actions {
		display: grid;
		gap: 12px;
		margin-top: 16px;
	}

	.public-action {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		min-height: 56px;
		padding: 12px 16px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 8px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
		text-align: center;
		text-decoration: none;
	}

	.public-action :global(svg) {
		flex-shrink: 0;
	}

	.public-action:hover {
		background: var(--sc-inset);
		border-color: var(--sc-muted);
	}

	.register-action {
		border-color: var(--sc-accent);
		color: var(--sc-link);
		background: var(--sc-accent-soft);
	}

	.register-action:hover {
		border-color: var(--sc-accent-hover);
		color: var(--sc-link);
		background: var(--sc-accent-soft);
	}

	.orgo-button:focus-visible,
	.public-action:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 3px;
	}

	.orgo-button:active:not(:disabled),
	.public-action:active {
		filter: brightness(0.95);
	}

	@media (max-width: 480px) {
		.login-page {
			padding: 16px;
		}
		.login-panel {
			padding: 24px;
		}
	}

	.orgo-button:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.button-mark {
		width: 34px;
		height: 34px;
		object-fit: contain;
		padding: 4px;
		border-radius: 4px;
		background: var(--sc-surface);
	}

	.error {
		margin: 16px 0 0;
		border: 1px solid #fecaca;
		border-radius: 8px;
		background: var(--sc-accent-soft);
		color: var(--sc-link);
		padding: 12px;
		font-weight: 700;
	}
</style>
