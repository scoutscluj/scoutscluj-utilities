<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import { invalidateAll } from '$app/navigation';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		participationFieldVisible,
		fixedConsentTerms,
		type FixedConsentDetails
	} from '@scouts-cluj/parental-consent-schema';
	import RegistrationPayment from '$lib/activities/RegistrationPayment.svelte';
	import {
		registrationRequest,
		money,
		states,
		type Answer,
		type RegistrationDraft
	} from '$lib/activities/registration';
	let { data } = $props();
	let identifier = $state(''),
		role = $state('beneficiary'),
		email = $state(''),
		major = $state(false);
	let answers = $state<Record<string, Answer>>({}),
		busy = $state(false),
		message = $state(''),
		formOpen = $state(false);
	let failed = $state(false);
	let agreementOpen = $state(false);
	const branchNames: Record<string, string> = {
		lupisori: 'Lupișori',
		temerari: 'Temerari',
		exploratori: 'Exploratori',
		seniori: 'Seniori',
		lideri: 'Lideri',
		voluntari: 'Voluntari adulți',
		scouteri: 'Scouteri'
	};
	const allowedBranches = $derived(data.page.eligibleBranches ?? Object.keys(branchNames));
	const acceptsAdultBeneficiaries = $derived(
		allowedBranches.some((code) => ['seniori', 'lideri', 'voluntari', 'scouteri'].includes(code))
	);
	let branch = $state('');
	$effect(() => {
		if (allowedBranches.length === 1) branch = allowedBranches[0];
		else if (!allowedBranches.includes(branch)) branch = '';
	});
	let exception = $state(false),
		exceptionNote = $state('');
	let draftId = $state<string | undefined>(),
		draftRevision = $state(0),
		draftSaving = $state(false),
		draftNotice = $state('');
	let discardTarget = $state<RegistrationDraft | null>(null),
		discardOpen = $state(false);
	function startRegistration(own = false) {
		draftNotice = '';
		draftId = undefined;
		draftRevision = 0;
		identifier = '';
		email = '';
		answers = {};
		major = false;
		role = 'beneficiary';
		branch = allowedBranches.length === 1 ? allowedBranches[0] : '';
		exception = false;
		exceptionNote = '';
		message = '';
		failed = false;
		formOpen = true;
		if (own) void prefill(true);
	}
	function resumeDraft(draft: RegistrationDraft) {
		draftNotice = '';
		draftId = draft.id;
		draftRevision = draft.revision;
		identifier = draft.data.identifier;
		email = draft.data.email;
		answers = { ...draft.data.answers, acknowledgement: false };
		role = draft.data.role;
		major = draft.data.major;
		branch = allowedBranches.includes(draft.data.branch)
			? draft.data.branch
			: allowedBranches.length === 1
				? allowedBranches[0]
				: '';
		exception = data.page.canManage && draft.data.exception;
		exceptionNote = draft.data.exceptionNote;
		formOpen = true;
		failed = false;
		message =
			'Ai reluat înscrierea în curs. Verifică datele și reconfirmă acordul înainte de trimitere.';
	}
	async function saveDraft() {
		if (busy || !data.user) return;
		busy = true;
		draftSaving = true;
		failed = false;
		message = '';
		draftId ??= crypto.randomUUID();
		try {
			const saved = await registrationRequest<RegistrationDraft>(activity.id, 'drafts', {
				id: draftId,
				revision: draftRevision,
				data: { identifier, role, email, branch, major, exception, exceptionNote, answers }
			});
			draftId = saved.id;
			draftRevision = saved.revision;
			await invalidateAll();
			formOpen = false;
			draftNotice =
				'Progresul este salvat în cont. Poți reveni aici pentru a continua. Înscrierea nu a fost încă trimisă și nu rezervă un loc.';
		} catch (error) {
			failed = true;
			message = (error as Error).message;
		} finally {
			busy = false;
			draftSaving = false;
		}
	}
	async function discardDraft() {
		if (!discardTarget || busy) return;
		busy = true;
		try {
			await registrationRequest(activity.id, `drafts/${discardTarget.id}/discard`, {});
			await invalidateAll();
			discardOpen = false;
			discardTarget = null;
			draftNotice = 'Înscrierea în curs a fost ștearsă.';
		} catch (error) {
			failed = true;
			message = (error as Error).message;
		} finally {
			busy = false;
		}
	}
	const activity = $derived(data.page.activity);
	const settings = $derived(data.page.settings);
	const programOptions = $derived(
		Object.entries(data.page.information?.branches ?? {}).filter(
			([code, details]) => details.enabled && allowedBranches.includes(code)
		)
	);
	let programCode = $state('');
	$effect(() => {
		if (branch && programOptions.some(([code]) => code === branch)) programCode = branch;
		else if (!programOptions.some(([code]) => code === programCode))
			programCode = programOptions[0]?.[0] ?? '';
	});
	const programDetails = $derived(programOptions.find(([code]) => code === programCode)?.[1]);
	function displayDate(value: string, time = false) {
		const date = new Date(value);
		return Number.isFinite(date.getTime())
			? new Intl.DateTimeFormat('ro-RO', {
					timeZone: 'Europe/Bucharest',
					dateStyle: 'long',
					...(time ? { timeStyle: 'short' as const } : {})
				}).format(date)
			: 'De stabilit';
	}
	const fields = $derived(
		data.page.fields.filter(
			(f) =>
				participationFieldVisible(f.code, answers) &&
				(!major ||
					![
						'guardian_name',
						'guardian_relation',
						'guardian_phone',
						'secondary_phone',
						'acknowledgement'
					].includes(f.code))
		)
	);
	function suggestAdultRole() {
		if (major && !acceptsAdultBeneficiaries) role = 'staff';
	}
	function updateAge(birthDate: string) {
		const parsed = new Date(birthDate);
		const start = new Date(activity.startDate ?? '');
		const startDay = Number.isFinite(start.getTime())
			? new Intl.DateTimeFormat('en-CA', {
					timeZone: 'Europe/Bucharest',
					year: 'numeric',
					month: '2-digit',
					day: '2-digit'
				}).format(start)
			: '';
		major =
			/^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
			Number.isFinite(parsed.getTime()) &&
			parsed.toISOString().slice(0, 10) === birthDate &&
			!!startDay &&
			`${Number(birthDate.slice(0, 4)) + 18}${birthDate.slice(4)}` <= startDay;
		suggestAdultRole();
	}
	async function prefill(own = false) {
		busy = true;
		message = '';
		failed = false;
		if (own) identifier = String(data.user?.orgoConnection?.orgoUserId ?? '');
		try {
			const value = await registrationRequest<{
				answers: Record<string, Answer>;
				email: string;
				branch: string;
			}>(activity.id, 'prefill', { identifier });
			answers = value.answers;
			email = value.email;
			branch = allowedBranches.includes(value.branch)
				? value.branch
				: allowedBranches.length === 1
					? allowedBranches[0]
					: '';
			role = 'beneficiary';
			updateAge(String(answers.birth_date ?? ''));
			message =
				'Datele cunoscute au fost completate. Verifică informațiile de contact și medicale pentru această activitate. Acordurile se aleg din nou.';
		} catch (e) {
			failed = true;
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	async function register() {
		busy = true;
		message = '';
		failed = false;
		try {
			const result = await registrationRequest<{ managementToken: string }>(
				activity.id,
				'register',
				{ identifier, role, email, answers, exception, exceptionNote, draftId }
			);
			await goto(resolve(`/activitati/${activity.id}/inscriere/${result.managementToken}?nou=1`));
		} catch (e) {
			failed = true;
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

		{#if settings.closesAt}<aside class="deadline" aria-label="Termen de înscriere">
				<div>
					<span>Înscrieri până la</span><strong
						><time datetime={settings.closesAt}>{displayDate(settings.closesAt, true)}</time
						></strong
					>
				</div>
				{#if settings.approvalRequired}<p>Participarea necesită aprobarea coordonatorului.</p>{/if}
			</aside>{/if}
		<div class="actions">
			<a class="primary-link" href="#registration">Înscrie un participant</a>
			<a class="primary-link secondary-link" href="#payment">Plătește o înscriere existentă</a>
		</div>
		<p>
			Înscrierea se face cu un cont Orgo (membri.scout.ro) sau doar cu ID-ul membrului. La final
			descarci acordul completat și alegi dacă plătești acum sau mai târziu.
		</p>
	</header>

	{#if settings.terms}<section>
			<h2>Condiții de participare și plată</h2>
			<p class="description">{settings.terms}</p>
		</section>{/if}
	{#if data.page.information && programDetails}
		<section class="practical" aria-label="Informații practice">
			<div class="program-heading">
				<h2>Program, transport și echipament</h2>
				{#if programOptions.length > 1}<label
						>Program pentru ramura<select bind:value={programCode}
							>{#each programOptions as [code] (code)}<option value={code}
									>{branchNames[code] ?? code}</option
								>{/each}</select
						></label
					>{/if}
			</div>
			{#if programDetails.startDate || programDetails.endDate}<p class="program-period">
					{branchNames[programCode] ?? programCode} · {displayDate(
						programDetails.startDate
					)}{programDetails.endDate && programDetails.endDate !== programDetails.startDate
						? ` – ${displayDate(programDetails.endDate)}`
						: ''}
				</p>{/if}
			<div class="practical-grid">
				{#if programDetails.activities.length}<div>
						<h3>Activități</h3>
						<ul>
							{#each programDetails.activities
								.flatMap((item) => item.split('\n'))
								.map((item) => item.trim())
								.filter(Boolean) as item, index (index)}<li>{item}</li>{/each}
						</ul>
					</div>{/if}
				{#if programDetails.outboundTransport || programDetails.returnTransport || programDetails.pickupDetails}<div
					>
						<h3>Transport și preluare</h3>
						{#if programDetails.outboundTransport}<p>
								<strong>Plecare</strong><br />{programDetails.outboundTransport}
							</p>{/if}
						{#if programDetails.returnTransport}<p>
								<strong>Întoarcere</strong><br />{programDetails.returnTransport}
							</p>{/if}
						{#if programDetails.pickupDetails}<p>{programDetails.pickupDetails}</p>{/if}
					</div>{/if}
				{#if programDetails.equipment.length}<div>
						<h3>Ce trebuie adus</h3>
						<ul>
							{#each programDetails.equipment as item, index (index)}<li>{item}</li>{/each}
						</ul>
						{#if data.page.information.fixedDetails?.equipmentNotes}<p>
								{data.page.information.fixedDetails.equipmentNotes}
							</p>{/if}
					</div>{/if}
			</div>
			{#if data.page.information.general.emergencyContactName || data.page.information.general.emergencyContactPhone}<div
					class="organizer-contact"
				>
					<strong>Contact organizator</strong>
					<p>
						{data.page.information.general.emergencyContactName}{data.page.information.general
							.emergencyContactName && data.page.information.general.emergencyContactPhone
							? ' · '
							: ''}{data.page.information.general.emergencyContactPhone}
					</p>
				</div>{/if}
			{#if data.page.information.fixedDetails?.communication && data.page.information.fixedDetails.communication.trim() !== '-'}<p
					class="communication"
				>
					{data.page.information.fixedDetails.communication}
				</p>{/if}
		</section>
	{/if}
	{#if data.mine.length}<section>
			<h2>Înscrierile gestionate din cont</h2>
			{#each data.mine as item (item.id)}<p>
					<a href={resolve(`/activitati/${activity.id}/inscriere/${item.id}`)}>{item.memberName}</a>
					· {states[item.state]} · {states[item.paymentState ?? '']}
				</p>{/each}
		</section>{/if}
	{#if data.page.information?.fixedDetails}<section
			class="agreement-summary"
			aria-label="Siguranță și acord"
		>
			<h2>Siguranță și acord de participare</h2>
			<p>
				Completează informațiile medicale relevante și un contact de urgență, pentru ca
				organizatorii să poată pregăti participarea copilului.
			</p>
			<p>
				După înscriere descarci acordul complet, cu regulile de siguranță și informațiile despre
				datele personale. Îl verifici și îl aduci semnat pe hârtie sau îl semnezi digital și îl
				încarci.
			</p>
			<button type="button" class="secondary" onclick={() => (agreementOpen = true)}
				>Consultă regulile și protecția datelor</button
			>
		</section>{/if}
	<section id="registration">
		<h2>Înscriere</h2>
		{#if data.draftsError}<FormFeedback message={data.draftsError} kind="error" />{/if}
		{#if draftNotice}<FormFeedback message={draftNotice} kind="success" />{/if}
		{#if data.user && !formOpen && data.drafts.length}<div class="saved-drafts">
				<h3>Înscrieri în curs</h3>
				<p>
					Salvate în cont, încă netrimise. Un loc este solicitat numai după trimiterea formularului.
				</p>
				{#each data.drafts as draft (draft.id)}<div class="saved-draft">
						<div>
							<strong
								>{String(
									draft.data.answers.participant_name ||
										draft.data.identifier ||
										'Înscriere netrimisă'
								)}</strong
							><small
								>Salvată la {new Intl.DateTimeFormat('ro-RO', {
									dateStyle: 'short',
									timeStyle: 'short',
									timeZone: 'Europe/Bucharest'
								}).format(new Date(draft.updatedAt))}</small
							>
						</div>
						<div class="actions">
							<button type="button" class="secondary" onclick={() => resumeDraft(draft)}
								>Continuă înscrierea</button
							><button
								type="button"
								class="secondary"
								onclick={() => {
									discardTarget = draft;
									discardOpen = true;
								}}>Șterge</button
							>
						</div>
					</div>{/each}
			</div>{/if}
		{#if !formOpen}
			<div class="flow-grid">
				<div class="flow-card">
					<div class="flow-icon" aria-hidden="true">◎</div>
					<h3>{data.user ? 'Din contul tău' : 'Ai cont Orgo (membri.scout.ro)?'}</h3>
					<p>
						{data.user
							? 'Datele cunoscute despre persoana autentificată se completează automat. Poți salva progresul și relua înscrierea mai târziu.'
							: 'Datele cunoscute despre persoana autentificată se completează automat. Poți salva progresul, reveni mai târziu și gestiona înscrierile din cont.'}
					</p>
					{#if data.user}<button onclick={() => startRegistration(true)}
							>Înscriere pentru mine</button
						>{:else}<a
							class="primary-link"
							href={resolve(
								`/auth/orgo/start?redirectTo=${encodeURIComponent(`/activitati/${activity.id}`)}`
							)}>Autentifică-te cu Orgo</a
						>{/if}
				</div>
				<div class="flow-card">
					<div class="flow-icon" aria-hidden="true">#</div>
					<h3>{data.user ? 'Înscrie alt membru' : 'Continuă fără autentificare'}</h3>
					<p>
						{data.user
							? 'Folosește ID-ul membrului și completează automat datele la care ai acces.'
							: 'Ai nevoie doar de ID-ul din Orgo (membri.scout.ro) sau de pe cardul membrului. Completezi formularul de la zero.'}
					</p>
					<button class="secondary" onclick={() => startRegistration()}
						>Înscrie folosind ID-ul unui membru</button
					>
				</div>
			</div>
		{:else}
			{#if !data.user}<p class="guest-info">
					Fără autentificare, completezi formularul de la zero. <a
						href={resolve(
							`/auth/orgo/start?redirectTo=${encodeURIComponent(`/activitati/${activity.id}`)}`
						)}>Autentifică-te pentru completare automată</a
					>.
				</p>{/if}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					void register();
				}}
				aria-busy={busy}
			>
				<fieldset class="registration-fields" disabled={busy}>
					{#if data.page.canManage}<label class="choice"
							><input type="checkbox" bind:checked={exception} /> Adaugă o excepție de eligibilitate sau
							perioadă</label
						>{#if exception}<label
								>Motivul excepției<input bind:value={exceptionNote} required /></label
							>{/if}{/if}
					<div class="grid">
						<label
							>ID Orgo sau ID card<input
								bind:value={identifier}
								required
								autocomplete="off"
							/></label
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
							Doar confirmi că vii. Certificatul de integritate comportamentală trebuie să fie
							validat pentru începutul activității. Nu este necesar acord sau plată.
						</p>
					{:else}
						<label
							><input type="checkbox" bind:checked={major} onchange={suggestAdultRole} /> Participantul
							va fi major la începutul activității</label
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
							>Ramură<select bind:value={branch} required disabled={allowedBranches.length === 1}>
								{#if allowedBranches.length !== 1}<option value="">Alege ramura</option>{/if}
								{#each allowedBranches as code (code)}<option value={code}
										>{branchNames[code] ?? code}</option
									>{/each}</select
							>
						</label>
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
									{:else if field.type === 'date'}<DateInput
											value={String(answers[field.code] ?? '')}
											required={field.required}
											disabled={false}
											onValueChange={(value) => {
												answers[field.code] = value;
												if (field.code === 'birth_date') updateAge(value);
											}}
										/>{:else}<input
											type={field.type === 'phone' ? 'tel' : 'text'}
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
										>{:else if question.type === 'date'}<DateInput
											value={String(answers[code] ?? '')}
											required={question.required}
											onValueChange={(value) => (answers[code] = value)}
										/>{:else}<input
											type={question.type === 'number' ? 'number' : 'text'}
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
							După salvare poți descărca acordul și, dacă înscrierea este acceptată, poți plăti
							taxa. Reducerile de familie sunt confirmate de coordonator pentru membrii înscriși la
							această activitate.
						</p>
					{/if}
					{#if message}<FormFeedback {message} kind={failed ? 'error' : 'info'} />{/if}
					<div class="actions">
						<button disabled={busy}
							>{busy
								? 'Se salvează…'
								: role === 'staff'
									? 'Anunță participarea'
									: 'Salvează înscrierea și continuă'}</button
						>{#if data.user}<button
								type="button"
								class="secondary"
								disabled={busy}
								onclick={saveDraft}
								>{draftSaving
									? 'Se salvează progresul…'
									: 'Salvează și continuă mai târziu'}</button
							>{/if}
					</div>
				</fieldset>
			</form>{/if}
	</section>
	<section id="payment">
		<RegistrationPayment activityId={activity.id} />
	</section>
</main>

<Modal
	bind:open={agreementOpen}
	title="Siguranță, sănătate și date personale"
	description="Informațiile activității pe care le poți consulta înainte de confirmarea participării."
>
	<div class="agreement-full">
		{#each fixedConsentTerms as paragraph, index (index)}
			{@const content = paragraph.replace(/\{\{activity\.([^}]+)\}\}/g, (_, key: string) =>
				String(data.page.information?.fixedDetails?.[key as keyof FixedConsentDetails] ?? '')
			)}
			{#if /^\d+(?:\.\d+)*\.\s/.test(content)}<h3>{content}</h3>{:else if content.trim()}<p>
					{content}
				</p>{/if}
		{/each}
	</div>
</Modal>

<Modal
	bind:open={discardOpen}
	title="Ștergi înscrierea în curs?"
	description="Datele salvate pentru acest formular vor fi șterse. Înscrierile deja trimise nu sunt afectate."
	><div class="actions">
		<button type="button" class="secondary" disabled={busy} onclick={() => (discardOpen = false)}
			>Anulează</button
		><button type="button" disabled={busy} onclick={discardDraft}
			>{busy ? 'Se șterge…' : 'Șterge înscrierea în curs'}</button
		>
	</div>
	{#if failed && message}<FormFeedback {message} kind="error" />{/if}</Modal
>

<style>
	.agreement-summary button {
		margin-top: 16px;
	}
	.agreement-full {
		display: grid;
		gap: 12px;
		font-size: 14px;
	}
	.agreement-full h3 {
		margin: 8px 0 0;
		font-size: 16px;
	}
	.agreement-full p {
		white-space: pre-wrap;
	}
	.registration-fields {
		display: contents;
	}
	.saved-drafts {
		margin: 0 0 24px;
		display: grid;
		gap: 12px;
	}
	.saved-drafts h3 {
		margin: 0;
	}
	.saved-draft {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		padding: 12px 16px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
	}
	.saved-draft small {
		display: block;
		margin-top: 4px;
		font-size: 13px;
	}
	.deadline {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		border-left: 4px solid var(--sc-accent);
		border-radius: 8px;
		background: var(--sc-accent-soft);
		padding: 16px 20px;
	}
	.deadline span {
		display: block;
		font-size: 14px;
		margin-bottom: 4px;
	}
	.deadline strong {
		font-size: 20px;
		line-height: 1.4;
	}
	.deadline p {
		max-width: 320px;
		font-size: 14px;
	}
	.program-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.program-heading h2 {
		margin: 0;
	}
	.program-heading label {
		font-size: 13px;
	}
	.program-period {
		color: var(--sc-ink-muted);
		margin-top: 12px;
		font-size: 14px;
	}
	.practical-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
		gap: 24px;
		margin-top: 20px;
	}
	.practical-grid h3 {
		margin: 0 0 12px;
	}
	.practical-grid p + p {
		margin-top: 12px;
	}
	.practical-grid ul {
		margin: 0;
		padding-left: 20px;
		line-height: 1.7;
	}
	.organizer-contact {
		border-top: 1px solid var(--sc-border);
		padding-top: 16px;
		margin-top: 20px;
	}
	.communication {
		margin-top: 12px;
	}
	.agreement-summary p + p {
		margin-top: 12px;
	}

	.flow-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.flow-card {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 12px;
		padding: 24px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	.flow-card h3,
	.flow-card p {
		margin: 0;
	}
	.flow-card p {
		flex: 1;
		color: var(--sc-muted);
	}
	.flow-icon {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		background: var(--sc-accent-soft);
		color: var(--sc-accent);
		border-radius: 8px;
		font-size: 22px;
	}
	@media (max-width: 650px) {
		.flow-grid {
			grid-template-columns: 1fr;
		}
	}

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
