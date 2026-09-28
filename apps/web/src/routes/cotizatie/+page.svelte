<script lang="ts">
	import { resolve } from '$app/paths';
	import { money, paymentLabels } from '$lib/membership/types';
	let { data, form } = $props();
	let identifier = $state('');
	let selectedPlan = $state('normal');
	let mode = $state('guest');
	let obligationId = $state('');
	const own = $derived(data.obligations.filter((o) => o.periodId === data.period?.id));
	const selected = $derived(own.find((o) => o.id === obligationId));
	const amount = $derived(
		mode === 'own'
			? selected
				? selected.totalBani - (selected.paidBani ?? 0)
				: 0
			: (data.period?.prices[selectedPlan]?.totalBani ?? 0)
	);
</script>

<svelte:head
	><title>Cotizație · Scouts Cluj</title><meta name="robots" content="noindex" /></svelte:head
>
<main>
	<a href={resolve('/')}>← Resurse Scouts Cluj</a>
	<h1>Cotizație</h1>
	<p>O singură plată către Centrul Local Cluj. Centrul transferă ulterior partea națională.</p>
	<p class="notice">Mediu de test NETOPIA. Nu folosi datele unui card real.</p>
	{#if data.user?.roles.some((r) => ['admin', 'finance_manager', 'super_admin'].includes(r))}<a
			href={resolve('/membership')}>Administrare cotizații →</a
		>{/if}
	{#if form?.message}<p role="alert" class="notice">{form.message}</p>{/if}
	{#if data.status}
		<section>
			<h2>{paymentLabels[data.status.state] ?? 'În curs de verificare'}</h2>
			<p>{money(data.status.amountBani)}</p>
			{#if data.status.requiresStaffReview}<p>
					Responsabilul financiar va verifica ID-ul și planul înainte de a credita cotizația
					membrului.
				</p>{/if}
			<a href={resolve('/cotizatie/rezultat')}>Verifică starea plății</a>
			{#if ['succeeded', 'failed'].includes(data.status.state)}<form
					method="POST"
					action="?/another"
				>
					<button>Începe o altă plată</button>
				</form>{/if}
		</section>
	{:else if !data.period}
		<p>Perioada de cotizație nu a fost încă publicată. Contactează responsabilul financiar.</p>
	{:else}
		<h2>{data.period.name}</h2>
		<p>{data.period.startsOn} – {data.period.endsOn}</p>
		{#if !data.cardEnabled}<p class="notice">
				Plata cu cardul este momentan indisponibilă. Configurarea pentru testare este în curs.
			</p>{/if}
		{#if !data.user}<p>
				<a href={resolve('/login?redirectTo=%2Fcotizatie')}>Autentifică-te cu ORGO</a> pentru a vedea
				cotizația ta verificată, sau continuă cu ID-ul beneficiarului.
			</p>{/if}
		<form method="POST" action="?/pay">
			<input type="hidden" name="periodId" value={data.period.id} />
			{#if data.user}<label
					>Plătesc pentru<select name="mode" bind:value={mode}
						><option value="guest">Un membru, prin ID</option><option value="own"
							>Contul meu ORGO</option
						></select
					></label
				>{:else}<input type="hidden" name="mode" value="guest" />{/if}
			{#if mode === 'own'}
				<label
					>Cotizația mea<select name="obligationId" bind:value={obligationId} required
						><option value="">Selectează cotizația</option>{#each own as o (o.id)}<option
								value={o.id}>{o.memberName} — {money(o.totalBani - (o.paidBani ?? 0))}</option
							>{/each}</select
					></label
				>
				{#if own.length === 0}<p>
						Planul tău nu a fost încă verificat. Contactează responsabilul financiar sau plătește
						prin ID cu verificare ulterioară.
					</p>{/if}
			{:else}
				<label
					>ID ORGO sau ID Card<input
						name="identifier"
						bind:value={identifier}
						oninput={(e) => {
							e.currentTarget.value = e.currentTarget.value.toUpperCase();
							identifier = e.currentTarget.value;
						}}
						placeholder="36805 sau AT36805"
						autocomplete="off"
						autocapitalize="characters"
						maxlength="32"
						required
					/></label
				>
				<p>ID-ul introdus nu este verificat automat în ORGO. Verifică-l cu atenție.</p>
				<label
					>Plan de cotizație<select name="plan" bind:value={selectedPlan}
						>{#each Object.entries(data.period.prices) as [key, value] (key)}<option value={key}
								>{value.label} — {money(value.totalBani)}</option
							>{/each}</select
					></label
				>
				<label class="check"
					><input name="acceptUnverified" type="checkbox" required />Confirm ID-ul și planul ales.
					Înțeleg că plata va fi verificată de responsabilul financiar înainte de creditarea
					membrului.</label
				>
			{/if}
			<fieldset>
				<legend>Datele persoanei care plătește</legend>
				<label
					>Prenume<input
						name="firstName"
						autocomplete="given-name"
						value={data.user?.firstName ?? ''}
						required
					/></label
				>
				<label
					>Nume<input
						name="lastName"
						autocomplete="family-name"
						value={data.user?.lastName ?? ''}
						required
					/></label
				>
				<label
					>Email<input
						name="email"
						type="email"
						autocomplete="email"
						value={data.user?.email ?? ''}
						required
					/></label
				>
				<label>Telefon<input name="phone" type="tel" autocomplete="tel" required /></label>
				<label>Localitate<input name="city" autocomplete="address-level2" required /></label>
				<label>Județ<input name="state" autocomplete="address-level1" required /></label>
				<label>Cod poștal<input name="postalCode" autocomplete="postal-code" required /></label>
			</fieldset>
			<p class="total">Total: {money(Math.max(0, amount))}</p>
			<p>Nu se adaugă automat comision. Datele cardului se introduc pe pagina NETOPIA.</p>
			<button disabled={!data.cardEnabled || amount <= 0}>Continuă la plata de test</button>
		</form>
	{/if}
</main>

<style>
	main {
		max-width: 680px;
		margin: 40px auto;
		padding: 24px;
	}
	h1 {
		font-size: 2rem;
	}
	p {
		line-height: 1.6;
	}
	form,
	fieldset {
		display: grid;
		gap: 16px;
		margin-top: 20px;
	}
	fieldset {
		border: 1px solid #cbd5e1;
		border-radius: 12px;
		padding: 20px;
	}
	label {
		display: grid;
		gap: 6px;
	}
	input,
	select,
	button {
		font: inherit;
		padding: 12px;
		border: 1px solid #94a3b8;
		border-radius: 8px;
	}
	button {
		background: #166534;
		color: white;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.notice {
		background: #fff7ed;
		padding: 16px;
		border-radius: 10px;
	}
	.check {
		display: flex;
		align-items: start;
		gap: 12px;
	}
	.total {
		font-size: 1.4rem;
		font-weight: 700;
	}
	section {
		padding: 20px;
		background: #f1f5f9;
		border-radius: 12px;
	}
</style>
