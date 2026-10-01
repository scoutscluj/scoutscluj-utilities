<script lang="ts">
	import { resolve } from '$app/paths';
	import { money, paymentLabels } from '$lib/membership/types';

	let { data, form } = $props();
	let identifier = $state('');
	const own = $derived(data.obligations.find((item) => item.periodId === data.period?.id));
	const ownRemaining = $derived(own ? Math.max(0, own.totalBani - (own.paidBani ?? 0)) : 0);
	const lookup = $derived(form?.lookup);
	const providerName = $derived(
		(data.status?.provider ?? data.activeProvider) === 'stripe' ? 'Stripe' : 'NETOPIA'
	);
	const periodLabel = $derived(
		data.period ? `${data.period.startsOn.slice(0, 4)}–${data.period.endsOn.slice(0, 4)}` : ''
	);
</script>

{#snippet legalAcceptance()}
	<label class="check">
		<input name="acceptTerms" type="checkbox" required />
		<span
			>Am citit și accept <a href={resolve('/legal/termeni-si-conditii')} target="_blank"
				>termenii și condițiile</a
			>, <a href={resolve('/legal/anulare-si-retragere')} target="_blank">politica de anulare</a> și
			<a href={resolve('/legal/confidentialitate')} target="_blank">politica de confidențialitate</a
			>.</span
		>
	</label>
{/snippet}

{#snippet guestFlow()}
	<section class="flow-card" aria-labelledby="guest-title">
		<div class="flow-icon" aria-hidden="true">ID</div>
		<p class="eyebrow">Plată pentru alt cercetaș</p>
		<h2 id="guest-title">Introdu ID-ul beneficiarului</h2>
		{#if data.period}<p class="period-caption">Perioada: {data.period.name}</p>{/if}
		<p class="section-intro">
			Verificăm că ID-ul aparține unui membru eligibil din Centrul Local Cluj înainte de plată.
		</p>
		<form method="POST" action="?/lookup" class="lookup-form">
			<label for="member-identifier">ID ORGO sau ID Card</label>
			<div class="lookup-row">
				<input
					id="member-identifier"
					name="identifier"
					bind:value={identifier}
					oninput={(event) => {
						event.currentTarget.value = event.currentTarget.value.toUpperCase();
						identifier = event.currentTarget.value;
					}}
					placeholder="36805 sau AT36805"
					autocomplete="off"
					autocapitalize="characters"
					maxlength="32"
					required
				/>
				<button class="secondary-button">Verifică ID-ul</button>
			</div>
		</form>
		{#if form?.intent === 'lookup' && form?.message && !lookup}<p
				role="alert"
				class="error-message"
			>
				{form.message}
			</p>{/if}
		{#if lookup}
			<div class="member-result">
				<div class="member-avatar" aria-hidden="true">✓</div>
				<div>
					<strong>{lookup.displayName}</strong><span>{lookup.affiliation} · ID verificat</span>
				</div>
				<strong class="result-amount"
					>{lookup.paid ? 'Cotizație achitată' : money(lookup.amountBani)}</strong
				>
			</div>
			{#if lookup.paid}
				<p class="success-message">
					Cotizația pentru perioada curentă a fost deja achitată. Mulțumim!
				</p>
			{:else}
				<form method="POST" action="?/pay" class="payment-form">
					<input type="hidden" name="mode" value="guest" /><input
						type="hidden"
						name="periodId"
						value={data.period?.id}
					/><input type="hidden" name="identifier" value={lookup.identifier} />
					<div class="payment-summary">
						<div><span>Total de plată</span><strong>{money(lookup.amountBani)}</strong></div>
						<p>Datele cardului se introduc pe pagina securizată {providerName}.</p>
					</div>
					{@render legalAcceptance()}
					{#if form?.intent === 'pay' && form?.message}<p role="alert" class="error-message">
							{form.message}
						</p>{/if}
					<button class="primary-button" disabled={!data.cardEnabled}
						>Continuă la plata cu cardul</button
					>
				</form>
			{/if}
		{/if}
	</section>
{/snippet}

{#snippet ownFlow()}
	<section class="flow-card" aria-labelledby="own-title">
		<div class="flow-icon account" aria-hidden="true">O</div>
		<p class="eyebrow">Contul meu ORGO</p>
		<h2 id="own-title">Cotizația ta</h2>
		{#if own}
			<dl class="account-summary">
				<div>
					<dt>Membru</dt>
					<dd>{own.memberName}</dd>
				</div>
				<div>
					<dt>Perioada</dt>
					<dd>{data.period?.name}</dd>
				</div>
				<div>
					<dt>Cotizație totală</dt>
					<dd>{money(own.totalBani)}</dd>
				</div>
				<div>
					<dt>Achitat și alocat</dt>
					<dd>{money(own.paidBani ?? 0)}</dd>
				</div>
				<div class="balance">
					<dt>Rămas de plată</dt>
					<dd>{money(ownRemaining)}</dd>
				</div>
			</dl>
		{/if}
		{#if data.user}
			{#if own?.reviewState}
				<p class="notice">
					Cotizația ta necesită verificare. Contactează responsabilul financiar înainte de o nouă
					plată.
				</p>
			{:else if own && ownRemaining === 0}
				<div class="success-panel">
					<strong>Cotizația pentru această perioadă a fost achitată.</strong><span
						>Îți mulțumim, {data.user.firstName ?? data.user.displayName}!</span
					>
				</div>
			{:else if own}
				<form method="POST" action="?/pay" class="payment-form">
					<input type="hidden" name="mode" value="own" /><input
						type="hidden"
						name="periodId"
						value={data.period?.id}
					/><input type="hidden" name="obligationId" value={own.id} />
					<p class="section-intro">
						Datele cardului se introduc pe pagina securizată {providerName}. După plată, revino aici
						pentru confirmare.
					</p>
					{@render legalAcceptance()}
					{#if form?.intent === 'pay' && form?.message}<p role="alert" class="error-message">
							{form.message}
						</p>{/if}
					<button class="primary-button" disabled={!data.cardEnabled}
						>Continuă la plata cu cardul</button
					>
				</form>
			{:else}<p class="notice">
					Nu există încă o cotizație verificată pentru contul tău în perioada curentă. Contactează
					responsabilul financiar.
				</p>{/if}
		{:else}
			<p class="section-intro">
				Autentifică-te cu ORGO pentru ca aplicația să identifice automat cotizația și suma ta.
			</p>
			<a class="primary-button login-button" href={resolve('/login?redirectTo=%2Fcotizatie')}
				><span aria-hidden="true">O</span> Autentifică-te cu ORGO</a
			>
		{/if}
	</section>
{/snippet}

<svelte:head
	><title>Plată cotizație{periodLabel ? ` (${periodLabel})` : ''} · Scouts Cluj</title><meta
		name="robots"
		content="noindex"
	/></svelte:head
>

{#if !data.user}
	<header class="public-topbar">
		<a class="brand" href={resolve('/')}
			><span class="brand-mark" aria-hidden="true">SC</span><span
				><strong>Scouts Cluj</strong><small>Resurse</small></span
			></a
		>
		<a class="topbar-link" href={resolve('/login?redirectTo=%2Fcotizatie')}>Autentificare</a>
	</header>
{/if}

<main class="payment-page">
	<div class="page-heading">
		<p class="eyebrow">Centrul Local Cluj</p>
		<h1>Plată cotizație{periodLabel ? ` (${periodLabel})` : ''}</h1>
		<p class="section-intro">Situația cotizației și plata cu cardul, într-un singur loc.</p>
	</div>
	{#if (data.status?.environment ?? data.environment) !== 'live'}<p class="environment-notice">
			Mediu de test · {providerName}. Nu folosi datele unui card real.
		</p>{/if}
	{#if data.status}
		<section class="status-card">
			<p class="eyebrow">Ultima încercare de plată în acest browser</p>
			<h2>{paymentLabels[data.status.state] ?? 'În curs de verificare'}</h2>
			<p class="status-amount">{money(data.status.amountBani)}</p>
			<p>Procesator: <strong>{providerName}</strong></p>
			{#if data.status.state === 'succeeded'}
				<p class="success-message">{providerName} a confirmat primirea plății.</p>
			{:else if ['starting', 'pending'].includes(data.status.state)}
				<p class="notice">
					Plata nu este încă confirmată. Verifică starea înainte de a plăti din nou.
				</p>
			{/if}
			{#if data.status.requiresStaffReview}
				<p class="notice">
					Plata necesită verificarea responsabilului financiar înainte de alocarea la cotizația
					beneficiarului.
				</p>
			{/if}
			{#if data.status.state === 'unknown'}<p>
					Nu avem confirmarea rezultatului acestei încercări pe {providerName}. Acest mesaj nu
					înseamnă că ai plătit. Responsabilul financiar poate verifica și debloca încercarea din
					panoul de cotizații.
				</p>{/if}
			{#if data.status.state === 'failed'}<p>
					Încercarea a fost închisă fără o plată confirmată. Poți începe o nouă plată.
				</p>{/if}
			<a href={resolve('/cotizatie/rezultat')}>Verifică starea plății</a>
			{#if data.status.state === 'pending' && data.status.paymentUrl}<p>
					<a class="primary-button" href={data.status.paymentUrl}
						>Continuă plata pe {providerName}</a
					>
				</p>{/if}
			{#if ['succeeded', 'failed'].includes(data.status.state)}<form
					method="POST"
					action="?/another"
				>
					<button>Începe o altă plată</button>
				</form>{/if}
		</section>
	{:else if !data.period}<p class="notice">
			Perioada de cotizație nu a fost încă publicată. Contactează responsabilul financiar.
		</p>
	{:else}
		{#if !data.cardEnabled}<p class="notice">
				Plata cu cardul este momentan indisponibilă. Contactează responsabilul financiar.
			</p>{/if}
		<div class="flows">
			{#if data.user}{@render ownFlow()}
				{@render guestFlow()}{:else}{@render guestFlow()}
				{@render ownFlow()}{/if}
		</div>
	{/if}
</main>

<style>
	.public-topbar {
		min-height: 64px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #d8dee6;
		background: rgb(255 255 255/0.94);
		padding: 10px max(20px, calc((100vw - 1040px) / 2));
		backdrop-filter: blur(10px);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		color: #17202a;
		text-decoration: none;
	}
	.brand > span:last-child {
		display: flex;
		align-items: flex-start;
		flex-direction: column;
	}
	.brand small {
		color: #64748b;
	}
	.brand-mark {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #c81e1e;
		color: #fff;
		font-weight: 900;
	}
	.topbar-link {
		color: #991b1b;
		font-weight: 800;
	}
	.payment-page {
		width: min(100%, 1120px);
		margin: 16px auto 40px;
		padding: 0 16px;
	}
	.page-heading {
		max-width: 700px;
		margin-bottom: 22px;
	}
	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 900;
		text-transform: uppercase;
	}
	h1 {
		margin: 8px 0 10px;
		font-size: clamp(2rem, 5vw, 3rem);
		line-height: 1.05;
	}
	.section-intro {
		color: #52616f;
		line-height: 1.6;
	}
	.environment-notice,
	.notice,
	.error-message,
	.success-message {
		border-radius: 8px;
		padding: 12px 14px;
	}
	.environment-notice,
	.notice {
		border: 1px solid #fed7aa;
		background: #fff7ed;
		color: #9a3412;
	}
	.flows {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 24px;
		align-items: start;
	}
	.flow-card,
	.status-card {
		width: 100%;
		position: relative;
		border: 1px solid #d8dee6;
		border-radius: 12px;
		background: #fff;
		padding: clamp(20px, 3vw, 28px);
		box-shadow: 0 4px 16px rgb(15 23 42/0.03);
	}
	.flow-icon {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		float: right;
		border-radius: 10px;
		background: #fef2f2;
		color: #b91c1c;
		font-size: 0.78rem;
		font-weight: 900;
	}
	.flow-icon.account {
		border-radius: 999px;
		background: #c81e1e;
		color: #fff;
		font-size: 1rem;
	}
	.flow-card h2 {
		margin: 7px 0 0;
		font-size: 1.55rem;
	}
	.account-summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
		margin: 24px 0;
		padding: 20px;
		border-radius: 12px;
		background: #f8fafc;
	}
	.account-summary dt,
	.period-caption {
		color: #64748b;
		font-size: 0.86rem;
	}
	.account-summary dd {
		margin: 5px 0 0;
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.account-summary .balance {
		grid-column: 1 / -1;
		padding-top: 14px;
		border-top: 1px solid #e2e8f0;
	}
	.balance dd {
		font-size: 1.6rem;
	}
	@media (max-width: 1100px) {
		.flows {
			grid-template-columns: 1fr;
		}
	}
	input {
		min-width: 0;
		width: 100%;
	}
	.check input {
		width: auto;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible {
		outline: 3px solid #fca5a5;
		outline-offset: 3px;
	}
	.lookup-form,
	.payment-form {
		display: grid;
		gap: 16px;
		margin-top: 24px;
	}
	.lookup-form > label {
		font-size: 0.9rem;
		font-weight: 750;
	}
	.lookup-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 10px;
	}
	input,
	button,
	.primary-button {
		min-height: 46px;
		border: 1px solid #94a3b8;
		border-radius: 8px;
		padding: 11px 13px;
		font: inherit;
	}
	.secondary-button {
		background: #fff;
		color: #17202a;
		font-weight: 800;
		cursor: pointer;
	}
	.primary-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		border-color: #b91c1c;
		background: #c81e1e;
		color: #fff;
		font-weight: 850;
		text-decoration: none;
		cursor: pointer;
	}
	.login-button {
		width: fit-content;
		margin-top: 10px;
	}
	.login-button span {
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #fff;
		color: #c81e1e;
		font-size: 0.78rem;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.member-result {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 13px;
		margin-top: 20px;
		border: 1px solid #bbf7d0;
		border-radius: 10px;
		background: #f0fdf4;
		padding: 15px;
	}
	.member-result > div:nth-child(2) {
		display: grid;
		gap: 3px;
	}
	.member-result span {
		color: #52616f;
		font-size: 0.84rem;
	}
	.member-avatar {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: #16a34a;
		color: #fff;
		font-weight: 900;
	}
	.result-amount {
		color: #166534;
		text-align: right;
	}
	.payment-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border-radius: 10px;
		background: #f8fafc;
		padding: 16px;
	}
	.payment-summary > div {
		display: grid;
		gap: 4px;
		white-space: nowrap;
	}
	.payment-summary strong,
	.status-amount {
		font-size: 1.5rem;
	}
	.payment-summary p {
		max-width: 360px;
		margin: 0;
		color: #64748b;
		font-size: 0.86rem;
		text-align: right;
	}
	.check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		color: #475569;
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.check input {
		min-height: auto;
		flex: 0 0 16px;
		width: 16px;
		height: 16px;
		accent-color: #c81e1e;
		margin-top: 4px;
	}
	.error-message {
		border: 1px solid #fecaca;
		background: #fef2f2;
		color: #991b1b;
		font-weight: 700;
	}
	.success-message,
	.success-panel {
		border: 1px solid #bbf7d0;
		background: #f0fdf4;
		color: #166534;
	}
	.success-panel {
		display: grid;
		gap: 5px;
		margin-top: 20px;
		border-radius: 10px;
		padding: 20px;
	}
	@media (max-width: 640px) {
		.payment-page {
			margin-top: 28px;
		}
		.lookup-row {
			grid-template-columns: 1fr;
		}
		.member-result {
			grid-template-columns: auto 1fr;
		}
		.result-amount {
			grid-column: 2;
			text-align: left;
		}
		.payment-summary {
			align-items: flex-start;
			flex-direction: column;
		}
		.payment-summary p {
			text-align: left;
		}
	}
</style>
