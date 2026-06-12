<script lang="ts">
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
		<p class="eyebrow">Scouts Cluj Utilities</p>
		<h1 id="login-title">Autentificare</h1>
		<p class="summary">Accesul in aplicatie se face prin contul tau Orgo.</p>

		<button type="button" class="orgo-button" disabled={isStarting} onclick={startLogin}>
			<span aria-hidden="true" class="button-mark">O</span>
			{isStarting ? 'Se deschide Orgo...' : 'Connect with Orgo'}
		</button>

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
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 32px;
		box-shadow: 0 18px 50px rgb(15 23 42 / 0.08);
	}

	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin: 12px 0 0;
		font-size: 2rem;
		line-height: 1.1;
	}

	.summary {
		margin: 12px 0 28px;
		color: #52616f;
		line-height: 1.5;
	}

	.orgo-button {
		width: 100%;
		min-height: 48px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: 1px solid #b91c1c;
		border-radius: 8px;
		background: #c81e1e;
		color: #ffffff;
		font-weight: 800;
		cursor: pointer;
	}

	.orgo-button:hover:not(:disabled) {
		background: #a91b1b;
	}

	.orgo-button:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.button-mark {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: #ffffff;
		color: #c81e1e;
		font-size: 0.8rem;
		font-weight: 900;
	}

	.error {
		margin: 16px 0 0;
		border: 1px solid #fecaca;
		border-radius: 8px;
		background: #fef2f2;
		color: #991b1b;
		padding: 12px;
		font-weight: 700;
	}
</style>
