<script lang="ts">
	import { resolve } from '$app/paths';
	import { money, paymentLabels } from '$lib/membership/types';

	let { data, form } = $props();
	let identifier = $state('');
	const own = $derived(data.obligations.find((item) => item.periodId === data.period?.id));
	const ownRemaining = $derived(
		own
			? data.admission
				? own.admissionPaid
					? 0
					: (own.admissionAmountBani ?? 5500)
				: Math.max(0, own.totalBani - (own.paidBani ?? 0))
			: 0
	);
	const feeName = $derived(data.admission ? 'Adeziune' : 'Cotizație');
	const lookup = $derived(form?.lookup);
	const providerName = $derived(
		(data.status?.provider ?? data.activeProvider) === 'stripe' ? 'Stripe' : 'NETOPIA'
	);
	const periodLabel = $derived(
		data.period && !data.admission
			? `${data.period.startsOn.slice(0, 4)}–${data.period.endsOn.slice(0, 4)}`
			: ''
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
		{#if data.period && !data.admission}<p class="period-caption">
				Perioada: {data.period.name}
			</p>{/if}
		<p class="section-intro">
			Verificăm că ID-ul aparține unui membru eligibil din Centrul Local Cluj înainte de plată.
		</p>
		<form
			method="POST"
			action={data.admission ? '?/lookup&tip=adeziune' : '?/lookup'}
			class="lookup-form"
		>
			<input type="hidden" name="purpose" value={data.admission ? 'admission' : 'membership'} />
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
				<div class="result-amount">
					{#if !lookup.paid}<span>Total de plată</span>{/if}
					<strong>{lookup.paid ? `${feeName} achitată` : money(lookup.amountBani)}</strong>
				</div>
			</div>
			{#if lookup.paid}
				<p class="success-message">
					{data.admission
						? 'Adeziunea a fost deja achitată. Această taxă se plătește o singură dată.'
						: 'Cotizația pentru perioada curentă a fost deja achitată. Mulțumim!'}
				</p>
			{:else}
				<form
					method="POST"
					action={data.admission ? '?/pay&tip=adeziune' : '?/pay'}
					class="payment-form"
				>
					<input
						type="hidden"
						name="purpose"
						value={data.admission ? 'admission' : 'membership'}
					/><input type="hidden" name="mode" value="guest" /><input
						type="hidden"
						name="periodId"
						value={data.period?.id}
					/><input type="hidden" name="identifier" value={lookup.identifier} />
					<input type="hidden" name="amountBani" value={lookup.amountBani} />
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
		<img
			class="flow-icon account"
			src="/branding/orgo-symbol.png"
			alt="ORGO"
			width="42"
			height="42"
		/>
		<p class="eyebrow">Contul meu Orgo (membri.scout.ro)</p>
		<h2 id="own-title">{data.admission ? 'Adeziunea ta' : 'Cotizația ta'}</h2>
		{#if own}
			<dl class="account-summary">
				<div>
					<dt>Membru</dt>
					<dd>{own.memberName}</dd>
				</div>
				{#if !data.admission}<div>
						<dt>Perioada</dt>
						<dd>{data.period?.name}</dd>
					</div>{/if}
				<div>
					<dt>{feeName} totală</dt>
					<dd>{money(data.admission ? (own.admissionAmountBani ?? 5500) : own.totalBani)}</dd>
				</div>
				<div>
					<dt>Achitat și alocat</dt>
					<dd>
						{money(
							data.admission
								? own.admissionPaid
									? (own.admissionAmountBani ?? 5500)
									: 0
								: (own.paidBani ?? 0)
						)}
					</dd>
				</div>
				<div class="balance">
					<dt>Total de plată</dt>
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
					<strong
						>{data.admission
							? 'Adeziunea a fost deja achitată.'
							: 'Cotizația pentru această perioadă a fost achitată.'}</strong
					><span>Îți mulțumim, {data.user.firstName ?? data.user.displayName}!</span>
				</div>
			{:else if own && data.admission && !own.admissionEligible}
				<p class="notice">
					Adeziunea online este disponibilă pentru conturile Orgo (membri.scout.ro) create în
					ultimele 6 luni. Dacă data lipsește sau ai nevoie de ajutor, contactează responsabilul
					financiar.
				</p>
			{:else if own}
				<form
					method="POST"
					action={data.admission ? '?/pay&tip=adeziune' : '?/pay'}
					class="payment-form"
				>
					<input
						type="hidden"
						name="purpose"
						value={data.admission ? 'admission' : 'membership'}
					/><input type="hidden" name="mode" value="own" /><input
						type="hidden"
						name="periodId"
						value={data.period?.id}
					/><input type="hidden" name="obligationId" value={own.id} />
					<input type="hidden" name="amountBani" value={ownRemaining} />
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
				Autentifică-te cu Orgo (membri.scout.ro) pentru ca aplicația să identifice automat {data.admission
					? 'adeziunea'
					: 'cotizația'} și suma ta.
			</p>
			<a
				class="primary-button login-button"
				href={resolve(
					data.admission
						? '/login?redirectTo=%2Fcotizatie%3Ftip%3Dadeziune'
						: '/login?redirectTo=%2Fcotizatie'
				)}
				><img src="/branding/orgo-symbol.png" alt="" width="30" height="30" /> Autentifică-te cu ORGO</a
			>
		{/if}
	</section>
{/snippet}

<svelte:head
	><title
		>Plată {data.admission ? 'adeziune' : 'cotizație'}{periodLabel ? ` (${periodLabel})` : ''} · Scouts
		Cluj</title
	><meta name="robots" content="noindex" /></svelte:head
>

{#if !data.user}
	<header class="public-topbar">
		<a class="brand" href={resolve('/')}
			><img
				class="brand-mark"
				src="/branding/scouts-cluj.png"
				alt="Centrul Local Scouts Cluj"
				width="40"
				height="43"
			/><span><strong>Scouts Cluj</strong><small>Resurse</small></span></a
		>
		<a class="topbar-link" href={resolve('/login?redirectTo=%2Fcotizatie')}>Autentificare</a>
	</header>
{/if}

<main class="payment-page">
	<div class="page-heading">
		<h1>
			Plată {data.admission ? 'adeziune' : 'cotizație'}{periodLabel ? ` (${periodLabel})` : ''}
		</h1>
		<p class="section-intro">
			{data.admission
				? 'Taxă unică: 55 lei, respectiv 105 lei dacă ai Florești în numele din Orgo. Plata online este disponibilă pentru conturile create în ultimele 6 luni.'
				: 'Situația cotizației și plata cu cardul, într-un singur loc.'}
		</p>
		{#if data.admission}<p class="admission-link">
				<a href={resolve('/cotizatie')}>Înapoi la plata cotizației</a>
			</p>{/if}
	</div>
	{#if (data.status?.environment ?? data.environment) !== 'live'}<p class="environment-notice">
			Mediu de test · {providerName}. Nu folosi datele unui card real.
		</p>{/if}
	{#if data.status}
		<section class="status-card">
			<p class="eyebrow">Ultima încercare de plată în acest browser</p>
			<h2>{paymentLabels[data.status.state] ?? 'În curs de verificare'}</h2>
			<p>{data.status.purpose === 'admission' ? 'Taxă de adeziune' : 'Cotizație'}</p>
			<p class="status-amount">{money(data.status.amountBani)}</p>
			<p>Procesator: <strong>{providerName}</strong></p>
			{#if data.status.state === 'succeeded'}
				<p class="success-message">{providerName} a confirmat primirea plății.</p>
			{:else if ['starting', 'pending'].includes(data.status.state)}
				<p class="notice">
					Plata nu este încă confirmată. Poți redeschide linkul de plată.
					{#if data.status.provider === 'stripe' && data.status.state === 'pending'}
						Pentru o plată nouă, închidem mai întâi linkul vechi neplătit.
					{/if}
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
			{#if ['succeeded', 'failed'].includes(data.status.state) || (data.status.provider === 'stripe' && data.status.state === 'pending' && !data.status.requiresStaffReview)}<form
					method="POST"
					action="?/another"
				>
					<button>Începe o altă plată</button>
				</form>{/if}
			{#if form?.message}<p role="alert" class="error-message">{form.message}</p>{/if}
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
	{#if !data.admission}<p class="admission-link">
			Ești membru nou? <a href={resolve('/cotizatie?tip=adeziune')}>Plătește adeziunea aici</a> · 55 lei
			/ 105 lei pentru Florești, o singură dată.
		</p>{/if}
</main>

<style>
	.admission-link {
		font-size: 0.85rem;
		color: var(--sc-muted);
	}
	.admission-link a {
		color: var(--sc-link);
	}
	.public-topbar {
		min-height: 64px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--sc-border);
		background: var(--sc-surface);
		padding: 10px max(20px, calc((100vw - 1040px) / 2));
		backdrop-filter: blur(10px);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--sc-ink);
		text-decoration: none;
	}
	.brand > span:last-child {
		display: flex;
		align-items: flex-start;
		flex-direction: column;
	}
	.brand small {
		color: var(--sc-muted);
	}
	.brand-mark {
		width: 40px;
		height: auto;
		object-fit: contain;
	}
	.topbar-link {
		color: var(--sc-link);
		font-weight: 600;
	}
	.payment-page {
		width: min(100%, 1120px);
		min-width: 0;
		color: var(--sc-ink);
		margin: 16px auto 40px;
		padding: 0 16px;
	}
	.page-heading {
		max-width: 700px;
		margin-bottom: 22px;
	}
	.eyebrow {
		margin: 0;
		color: var(--sc-muted);
		font-size: 0.76rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	h1 {
		margin: 0 0 10px;
		font-size: 32px;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}
	.section-intro {
		color: var(--sc-muted);
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
		border: 1px solid var(--sc-warning);
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
	}
	.flows {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.flow-card,
	.status-card {
		width: 100%;
		position: relative;
		border: 1px solid var(--sc-border);
		border-radius: 12px;
		background: var(--sc-surface);
		padding: clamp(16px, 3vw, 24px);
		min-width: 0;
	}
	.flow-icon {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		float: right;
		border-radius: 10px;
		background: var(--sc-accent-soft);
		color: var(--sc-link);
		font-size: 0.78rem;
		font-weight: 600;
	}
	.flow-icon.account {
		width: 42px;
		height: 42px;
		object-fit: contain;
		background: var(--sc-surface);
	}
	.flow-card h2 {
		margin: 7px 0 0;
		font-size: 22px;
		line-height: 1.3;
		color: var(--sc-ink);
	}
	.account-summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
		margin: 20px 0;
		padding: 16px;
		border-radius: 12px;
		background: var(--sc-canvas);
	}
	.account-summary dt,
	.period-caption {
		color: var(--sc-muted);
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
		border-top: 1px solid var(--sc-border);
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
		background: var(--sc-inset);
		color: var(--sc-ink);
		min-width: 0;
		width: 100%;
	}
	.check input {
		width: auto;
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--sc-focus);
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
		font-weight: 600;
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
		border: 1px solid var(--sc-control-border);
		border-radius: 8px;
		padding: 11px 13px;
		font: inherit;
	}
	input::placeholder {
		color: var(--sc-muted);
		opacity: 1;
	}
	button {
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		cursor: pointer;
	}
	a {
		color: var(--sc-link);
	}
	.secondary-button {
		background: var(--sc-surface);
		color: var(--sc-ink);
		font-weight: 600;
		cursor: pointer;
	}
	.primary-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		border-color: var(--sc-accent);
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
	.login-button {
		width: fit-content;
		margin-top: 10px;
	}
	.login-button img {
		width: 30px;
		height: 30px;
		object-fit: contain;
		padding: 3px;
		border-radius: 4px;
		background: var(--sc-surface);
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
		border: 1px solid var(--sc-success);
		border-radius: 10px;
		background: var(--sc-success-soft);
		padding: 15px;
	}
	.member-result > div {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.member-result > div:nth-child(2) {
		display: grid;
		gap: 3px;
	}
	.member-result span {
		color: var(--sc-muted);
		font-size: 0.84rem;
	}
	.member-avatar {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--sc-success-soft);
		color: var(--sc-success);
		font-weight: 600;
	}
	.result-amount {
		display: grid;
		gap: 4px;
		color: var(--sc-success);
		text-align: right;
	}
	.status-amount {
		font-size: 1.5rem;
	}
	.check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		color: var(--sc-ink);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.check input {
		min-height: auto;
		flex: 0 0 16px;
		width: 16px;
		height: 16px;
		accent-color: var(--sc-accent);
		margin-top: 4px;
	}
	.error-message {
		border: 1px solid var(--sc-danger);
		background: var(--sc-surface);
		color: var(--sc-danger);
		font-weight: 600;
	}
	.success-message,
	.success-panel {
		border: 1px solid var(--sc-success);
		background: var(--sc-success-soft);
		color: var(--sc-success);
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
			margin-top: 16px;
		}
		h1 {
			font-size: 28px;
			line-height: 34px;
		}
		.flow-card h2 {
			font-size: 20px;
		}
		.public-topbar {
			padding: 10px 16px;
			gap: 12px;
		}
		.topbar-link {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
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
	}
	@media (max-width: 360px) {
		.account-summary {
			grid-template-columns: minmax(0, 1fr);
		}
		.balance dd {
			white-space: nowrap;
		}
	}
</style>
