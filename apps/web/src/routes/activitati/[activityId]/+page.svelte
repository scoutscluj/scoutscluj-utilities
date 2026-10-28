<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		fixedConsentTerms,
		type FixedConsentDetails
	} from '@scouts-cluj/parental-consent-schema';
	import RegistrationPayment from '$lib/activities/RegistrationPayment.svelte';
	import { registrationRequest, money, states, type Answer } from '$lib/activities/registration';
	let { data } = $props();
	let identifier = $state(''),
		role = $state('beneficiary'),
		email = $state(''),
		major = $state(false);
	let answers = $state<Record<string, Answer>>({}),
		busy = $state(false),
		message = $state(''),
		formOpen = $state(false);
	let branch = $state('');
	let exception = $state(false),
		exceptionNote = $state('');
	const activity = $derived(data.page.activity);
	const settings = $derived(data.page.settings);
	const fields = $derived(
		data.page.fields.filter(
			(f) =>
				!major ||
				![
					'guardian_name',
					'guardian_relation',
					'guardian_phone',
					'secondary_phone',
					'acknowledgement'
				].includes(f.code)
		)
	);
	async function prefill(own = false) {
		busy = true;
		message = '';
		if (own) identifier = String(data.user?.orgoConnection?.orgoUserId ?? '');
		try {
			const value = await registrationRequest<{
				answers: Record<string, Answer>;
				email: string;
				branch: string;
			}>(activity.id, 'prefill', { identifier });
			answers = value.answers;
			email = value.email;
			branch = value.branch;
			const birth = String(answers.birth_date ?? '');
			if (birth && activity.startDate)
				major =
					`${Number(birth.slice(0, 4)) + 18}${birth.slice(4)}` <= activity.startDate.slice(0, 10);
			message =
				'Datele cunoscute au fost completate. Verifică informațiile de contact și medicale pentru această activitate. Acordurile se aleg din nou.';
		} catch (e) {
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	async function register() {
		busy = true;
		message = '';
		try {
			const result = await registrationRequest<{ managementToken: string }>(
				activity.id,
				'register',
				{ identifier, role, email, answers, exception, exceptionNote }
			);
			await goto(resolve(`/activitati/${activity.id}/inscriere/${result.managementToken}?nou=1`));
		} catch (e) {
			message = (e as Error).message;
			busy = false;
		}
	}
	function selectMany(code: string, value: string, checked: boolean) {
		const previous = Array.isArray(answers[code]) ? (answers[code] as string[]) : [];
		answers[code] = checked ? [...previous, value] : previous.filter((x) => x !== value);
	}
</script>

<svelte:head
	><title>{activity.title} | Scouts Cluj</title><meta name="referrer" content="same-origin" /><meta
		property="og:title"
		content={activity.title}
	/><meta
		property="og:description"
		content={activity.description ?? ''}
	/>{#if settings.coverImageUrl}<meta
			property="og:image"
			content={settings.coverImageUrl}
		/>{/if}</svelte:head
>
<main>
	<a href={resolve('/activitati')}>← Activități</a>
	<header>
		{#if settings.coverImageUrl}<img
				class="cover"
				src={settings.coverImageUrl}
				alt={activity.title}
				referrerpolicy="no-referrer"
			/>{/if}
		<h1>{activity.title}</h1>
		<p class="logistics">
			{activity.location} · {activity.startDate
				? new Date(activity.startDate).toLocaleDateString('ro-RO')
				: 'Data urmează să fie stabilită'}{activity.endDate
				? ` – ${new Date(activity.endDate).toLocaleDateString('ro-RO')}`
				: ''}
		</p>
		<p class="description">{activity.description}</p>
		<div class="facts">
			<span><strong>{money(settings.feeBani)}</strong> taxa de participare</span><span
				><strong>{data.page.counts.beneficiaries}</strong> beneficiari cu loc</span
			><span><strong>{data.page.counts.staff}</strong> membri în echipa adultă</span>
		</div>
		<div class="actions">
			<a class="primary-link" href="#registration">Înscrie un participant</a>
			<a class="primary-link secondary-link" href="#payment">Plătește o înscriere existentă</a>
		</div>
		<p>
			Înscrierea se face cu un cont Orgo sau doar cu ID-ul membrului. La final descarci acordul
			completat și alegi dacă plătești acum sau mai târziu.
		</p>
	</header>
	{#if settings.closesAt}<p>
			Înscrieri până la {new Date(settings.closesAt).toLocaleString('ro-RO')}. {settings.approvalRequired
				? 'Participarea necesită aprobarea coordonatorului.'
				: ''}
		</p>{/if}
	{#if settings.terms}<section>
			<h2>Condiții de participare și plată</h2>
			<p class="description">{settings.terms}</p>
		</section>{/if}
	{#if data.page.information}
		<section>
			<h2>Program, transport și echipament</h2>
			{#each Object.entries(data.page.information.branches) as [code, details] (code)}
				{#if details.enabled}<details>
						<summary
							>{(
								{
									lupisori: 'Lupișori',
									temerari: 'Temerari',
									exploratori: 'Exploratori'
								} as Record<string, string>
							)[code]} · {details.startDate} – {details.endDate}</summary
						>
						<h3>Activități</h3>
						<ul>
							{#each details.activities as item, index (index)}<li>{item}</li>{/each}
						</ul>
						<h3>Transport</h3>
						<p>{details.outboundTransport}</p>
						<p>{details.returnTransport}</p>
						<p>{details.pickupDetails}</p>
						<h3>Echipament</h3>
						<ul>
							{#each details.equipment as item, index (index)}<li>{item}</li>{/each}
						</ul>
					</details>{/if}
			{/each}
			<p>
				Contact pentru urgențe: {data.page.information.general.emergencyContactName} · {data.page
					.information.general.emergencyContactPhone}
			</p>
		</section>
	{/if}
	{#if data.mine.length}<section>
			<h2>Înscrierile gestionate din cont</h2>
			{#each data.mine as item (item.id)}<p>
					<a href={resolve(`/activitati/${activity.id}/inscriere/${item.id}`)}>{item.memberName}</a>
					· {states[item.state]} · {states[item.paymentState ?? '']}
				</p>{/each}
		</section>{/if}
	{#if data.page.information?.fixedDetails}<details class="agreement-terms">
			<summary>Siguranță, sănătate și protecția datelor · citește acordul</summary
			>{#each fixedConsentTerms as paragraph, index (index)}<p class="description">
					{paragraph.replace(/\{\{activity\.([^}]+)\}\}/g, (_, key: string) =>
						String(data.page.information?.fixedDetails?.[key as keyof FixedConsentDetails] ?? '')
					)}
				</p>{/each}
		</details>{/if}
	<section id="registration">
		<h2>Înscriere</h2>
		{#if !data.user}<div class="notice">
				Autentifică-te pentru a completa automat informațiile cunoscute. Fără autentificare,
				formularul se completează de la zero. <a
					href={resolve(
						`/auth/orgo/start?redirectTo=${encodeURIComponent(`/activitati/${activity.id}`)}`
					)}>Autentifică-te cu Orgo</a
				>
			</div>{/if}
		{#if !formOpen}
			<div class="actions">
				{#if data.user}<button
						onclick={() => {
							formOpen = true;
							void prefill(true);
						}}>Înscriere pentru mine</button
					>{/if}
				<button class="secondary" onclick={() => (formOpen = true)}
					>Înscrie folosind ID-ul unui membru</button
				>
			</div>
		{:else}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					void register();
				}}
			>
				{#if data.page.canManage}<label class="choice"
						><input type="checkbox" bind:checked={exception} /> Adaugă o excepție de eligibilitate sau
						perioadă</label
					>{#if exception}<label
							>Motivul excepției<input bind:value={exceptionNote} required /></label
						>{/if}{/if}
				<div class="grid">
					<label
						>ID Orgo sau ID card<input bind:value={identifier} required autocomplete="off" /></label
					><label
						>Particip în rol de<select bind:value={role}
							><option value="beneficiary">Beneficiar</option><option value="staff"
								>Lider, scouter sau voluntar adult</option
							></select
						></label
					>
				</div>
				{#if data.user}<div class="actions">
						<button type="button" class="secondary" onclick={() => prefill(true)} disabled={busy}
							>Înscriere pentru mine</button
						><button
							type="button"
							class="secondary"
							onclick={() => prefill()}
							disabled={busy || !identifier}>Completează datele cunoscute pentru acest ID</button
						>
					</div>{/if}
				{#if role === 'staff'}<p>
						Doar confirmi că vii. Certificatul de integritate comportamentală trebuie să fie validat
						pentru începutul activității. Nu este necesar acord sau plată.
					</p>
				{:else}
					<label
						><input type="checkbox" bind:checked={major} /> Participantul va fi major la începutul activității</label
					>
					<label
						>E-mail pentru confirmare și linkul personal<input
							type="email"
							bind:value={email}
							required
							autocomplete="email"
						/></label
					>
					<label
						>Ramură<select bind:value={branch} required
							><option value="">Alege ramura</option><option value="lupisori">Lupișori</option
							><option value="temerari">Temerari</option><option value="exploratori"
								>Exploratori</option
							><option value="seniori">Seniori</option></select
						></label
					>
					{#each fields as field (field.code)}
						{#if field.type === 'multiple_choice'}<fieldset>
								<legend>{field.label}</legend>
								<p>{field.helpText}</p>
								{#each field.options ?? [] as option (option.value)}<label class="choice"
										><input
											type="checkbox"
											checked={Array.isArray(answers[field.code]) &&
												(answers[field.code] as string[]).includes(option.value)}
											onchange={(e) =>
												selectMany(field.code, option.value, e.currentTarget.checked)}
										/>{option.label}</label
									>{/each}
							</fieldset>
						{:else if field.type === 'acknowledgement'}<label class="choice"
								><input
									type="checkbox"
									required={field.required}
									checked={answers[field.code] === true}
									onchange={(e) => (answers[field.code] = e.currentTarget.checked)}
								/>{field.label}</label
							>
						{:else}<label
								>{field.label}{field.required ? ' *' : ''}{#if field.helpText}<small
										>{field.helpText}</small
									>{/if}
								{#if field.options?.length}<select
										value={String(answers[field.code] ?? '')}
										required={field.required}
										onchange={(e) => (answers[field.code] = e.currentTarget.value)}
										><option value="">Alege o opțiune</option
										>{#each field.options as option (option.value)}<option value={option.value}
												>{option.label}</option
											>{/each}</select
									>
								{:else if field.type === 'long_text'}<textarea
										rows="3"
										value={String(answers[field.code] ?? '')}
										required={field.required}
										oninput={(e) => (answers[field.code] = e.currentTarget.value)}
									></textarea>
								{:else}<input
										type={field.type === 'date' ? 'date' : field.type === 'phone' ? 'tel' : 'text'}
										value={String(answers[field.code] ?? '')}
										required={field.required}
										oninput={(e) => (answers[field.code] = e.currentTarget.value)}
									/>{/if}
							</label>{/if}
					{/each}
					{#each settings.questions.filter((q) => !q.branches.length || q.branches.includes(branch)) as question (question.code)}
						{@const code = `custom_${question.code}`}
						{#if question.type === 'multiple'}<fieldset>
								<legend>{question.label}</legend>{#each question.options as option (option)}<label
										class="choice"
										><input
											type="checkbox"
											checked={Array.isArray(answers[code]) &&
												(answers[code] as string[]).includes(option)}
											onchange={(e) => selectMany(code, option, e.currentTarget.checked)}
										/>{option}</label
									>{/each}
							</fieldset>
						{:else}<label
								>{question.label}{question.required
									? ' *'
									: ''}{#if question.type === 'choice'}<select
										value={String(answers[code] ?? '')}
										required={question.required}
										onchange={(e) => (answers[code] = e.currentTarget.value)}
										><option value="">Alege</option
										>{#each question.options as option (option)}<option>{option}</option
											>{/each}</select
									>{:else}<input
										type={question.type === 'date'
											? 'date'
											: question.type === 'number'
												? 'number'
												: 'text'}
										value={String(answers[code] ?? '')}
										required={question.required}
										oninput={(e) =>
											(answers[code] =
												question.type === 'number'
													? Number(e.currentTarget.value)
													: e.currentTarget.value)}
									/>{/if}</label
							>{/if}
					{/each}
					<p>
						După salvare poți descărca acordul și, dacă înscrierea este acceptată, poți plăti taxa.
						Reducerile de familie sunt confirmate de coordonator pentru membrii înscriși la această
						activitate.
					</p>
				{/if}
				{#if message}<p role="alert">{message}</p>{/if}<button disabled={busy}
					>{busy
						? 'Se salvează…'
						: role === 'staff'
							? 'Anunță participarea'
							: 'Salvează înscrierea și continuă'}</button
				>
			</form>{/if}
	</section>
	<section id="payment">
		<h2>Plătește o înscriere existentă</h2>
		<p>
			Introdu ID-ul membrului după ce a fost înscris la această activitate. Plata este disponibilă
			când înscrierea are un loc și o taxă de achitat.
		</p>
		<RegistrationPayment activityId={activity.id} />
	</section>
</main>

<style>
	.cover {
		width: 100%;
		max-height: 360px;
		object-fit: cover;
		border-radius: 12px;
	}
	.primary-link {
		display: inline-flex;
		justify-content: center;
		padding: 12px 18px;
		border-radius: 7px;
		background: var(--sc-accent);
		color: white;
		text-decoration: none;
		font-weight: 600;
	}
	.secondary-link {
		background: var(--sc-surface);
		color: var(--sc-accent);
		border: 1px solid var(--sc-border);
	}
	#registration,
	#payment {
		scroll-margin-top: 24px;
	}
	main {
		max-width: 960px;
		margin: 24px auto;
		padding: 24px;
		display: grid;
		gap: 24px;
	}
	header {
		display: grid;
		gap: 16px;
	}
	h1 {
		font-size: 2rem;
		letter-spacing: -0.025em;
		line-height: 1.2;
		margin: 8px 0;
	}
	h2 {
		font-size: 1.3rem;
		margin: 0 0 16px;
	}
	h3 {
		font-size: 1rem;
	}
	p {
		line-height: 1.6;
		margin: 0;
	}
	.description {
		white-space: pre-wrap;
	}
	.logistics,
	small {
		color: var(--sc-ink-muted);
	}
	section {
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		padding: 24px;
	}
	a {
		color: var(--sc-accent);
	}
	.facts {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
	}
	.facts span {
		display: grid;
		gap: 4px;
		color: var(--sc-ink-muted);
	}
	.facts strong {
		font-size: 1.3rem;
		color: var(--sc-ink);
	}
	form {
		display: grid;
		gap: 20px;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	label {
		display: grid;
		gap: 6px;
	}
	label:has([type='checkbox']),
	.choice {
		display: flex;
		gap: 8px;
		align-items: start;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
	}
	fieldset {
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		padding: 16px;
		display: grid;
		gap: 12px;
		min-width: 0;
	}
	legend {
		font-weight: 600;
	}
	.notice {
		padding: 16px;
		background: var(--sc-canvas);
		border-radius: 7px;
		margin-bottom: 16px;
		line-height: 1.6;
	}
	button {
		width: fit-content;
		min-height: 38px;
		padding: 10px 16px;
		background: var(--sc-accent);
		color: #fff;
		border: 0;
		border-radius: 7px;
		font: inherit;
		cursor: pointer;
	}
	.secondary {
		background: var(--sc-canvas);
		color: var(--sc-ink);
		border: 1px solid var(--sc-border);
	}
	button:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	details {
		padding: 16px 0;
		border-bottom: 1px solid var(--sc-border);
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	[role='alert'] {
		color: var(--sc-accent);
	}
	@media (max-width: 600px) {
		main {
			padding: 16px;
			margin: 0;
		}
		section {
			padding: 16px;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
