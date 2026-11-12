<script lang="ts">
	import RegistrationReceipt from './RegistrationReceipt.svelte';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	let failed = $state(false);
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { resolve } from '$app/paths';
	import { goto, invalidateAll } from '$app/navigation';
	import { ChevronDown } from '@lucide/svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import TableView from '$lib/components/ui/TableView.svelte';
	import { activitySettingsHref } from '$lib/activities/activity-settings';
	import {
		registrationRequest,
		money,
		states,
		type Registration
	} from '$lib/activities/registration';
	let {
		data,
		view = 'registrations'
	}: {
		data: {
			activity: { id: number; title: string };
			overview: import('$lib/activities/registration').Overview;
		};
		view?: 'registrations' | 'payments';
	} = $props();
	const paymentsView = $derived(view === 'payments');
	let filter = $state('current'),
		message = $state(''),
		busy = $state(false);
	let selected = $state<string[]>([]),
		familyOpen = $state(false),
		familyNote = $state('');
	let expandedRows = $state<string[]>([]);
	let financialOpen = $state(false),
		mailOpen = $state(false);
	let active = $state<Registration | null>(null),
		dialogOpen = $state(false),
		action = $state('receipt');
	let closeId = $state(''),
		confirmUnpaid = $state(false);
	let method = $state('bank'),
		amountLei = $state(0),
		note = $state(''),
		receivedOn = $state(new Date().toISOString().slice(0, 10)),
		entryId = $state('');
	const overview = $derived(data.overview),
		activityId = $derived(data.activity.id);
	const rows = $derived(
		overview.rows.filter(
			(row) =>
				(!paymentsView || row.role !== 'staff') &&
				(filter === 'all' || filter === 'withdrawn' || row.state !== 'withdrawn') &&
				(filter === 'current' ||
					filter === 'all' ||
					(filter === 'handoff' &&
						['accepted', 'reserved'].includes(row.state) &&
						((overview.capabilities.consent &&
							row.minor &&
							!['paper_received', 'signed_accepted', 'not_required'].includes(row.consentState)) ||
							(overview.capabilities.finance && (row.cashRemainingBani ?? 0) > 0))) ||
					(filter === 'unpaid' && row.remainingBani! > 0) ||
					row.state === filter ||
					(filter === 'missing_consent' &&
						['awaiting', 'update_required', 'uploaded'].includes(row.consentState)))
		)
	);
	const totals = $derived(
		overview.rows.reduce(
			(sum, row) => ({
				cash: sum.cash + (row.cashBani ?? 0),
				support: sum.support + (row.supportBani ?? 0),
				remaining: sum.remaining + (row.remainingBani ?? 0)
			}),
			{ cash: 0, support: 0, remaining: 0 }
		)
	);
	function open(row: Registration, operation: string) {
		message = '';
		failed = false;
		active = row;
		action = operation;
		amountLei =
			operation === 'plan_refund'
				? (row.refundDueBani ?? (row.cashBani ?? 0) + (row.refundedBani ?? 0)) / 100
				: (row.remainingBani ?? 0) / 100;
		note = '';
		entryId = '';
		dialogOpen = true;
	}
	async function run(path: string, body: unknown, method = 'POST') {
		busy = true;
		message = '';
		failed = false;
		try {
			const result = await registrationRequest<{ updated?: number; skipped?: number }>(
				activityId,
				path,
				body,
				undefined,
				method
			);
			await invalidateAll();
			message =
				path === 'renew-consent'
					? `Actualizarea acordului a fost solicitată pentru ${result.updated ?? 0} participanți.${result.skipped ? ` Pentru ${result.skipped} participanți din afara grupurilor curente, acordul anterior a fost păstrat.` : ''}`
					: method === 'PATCH' && (body as { action?: string }).action === 'delete'
						? 'Înscrierea a fost ștearsă complet.'
						: 'Modificările au fost salvate.';
			return true;
		} catch (e) {
			failed = true;
			message = (e as Error).message;
			return false;
		} finally {
			busy = false;
		}
	}
	async function update() {
		if (!active) return;
		if (busy) return;
		if (action === 'delete') {
			const id = active.id;
			if (await run(`registrations/${id}`, { action, revision: active.revision }, 'PATCH')) {
				selected = selected.filter((selectedId) => selectedId !== id);
				dialogOpen = false;
				active = null;
			}
			return;
		}
		if (action === 'close_checkout') {
			if (await run(`checkouts/${closeId}/close`, { note, confirmProviderUnpaid: confirmUnpaid }))
				dialogOpen = false;
			return;
		}
		if (
			await run(
				`registrations/${active.id}`,
				{
					action,
					revision: active.revision,
					method,
					amountBani: Math.round(amountLei * 100),
					note,
					receivedOn,
					entryId,
					due: receivedOn
				},
				'PATCH'
			)
		)
			dialogOpen = false;
	}
	function rowMenu(row: Registration, compact = false) {
		const items: { label: string; action: () => void; destructive?: boolean }[] = [];
		const add = (label: string, operation: string, destructive = false) =>
			items.push({ label, action: () => open(row, operation), destructive });
		if (compact && overview.capabilities.sensitive)
			items.push({
				label: 'Fișa înscrierii',
				action: () => {
					void goto(resolve(`/activitati/${activityId}/inscriere/${row.id}`));
				}
			});
		if (compact && overview.capabilities.finance && row.role !== 'staff')
			add('Înregistrează sumă', 'receipt');
		if (
			!paymentsView &&
			overview.capabilities.manage &&
			['pending', 'waitlisted'].includes(row.state)
		)
			add('Acceptă pe un loc', 'accept');
		if (overview.capabilities.finance && row.role !== 'staff') {
			add('Ajustează taxa', 'price');
			add('Stabilește suma de restituit', 'plan_refund');
			add('Corectează înregistrare', 'reversal');
			for (const payment of row.payments ?? [])
				if (['created', 'pending', 'unknown'].includes(payment.state))
					items.push({
						label: 'Verifică și închide plata în curs',
						action: () => {
							open(row, 'close_checkout');
							closeId = payment.id;
							confirmUnpaid = false;
						}
					});
		}
		if (!paymentsView && overview.capabilities.manage) {
			add('Retragere', 'withdraw', true);
			if (row.state === 'pending') add('Respinge', 'reject', true);
			add('Prelungește termenul', 'extend_deadline');
			add('Șterge complet înscrierea', 'delete', true);
		}

		return items;
	}
	function workspaceActions() {
		const items: { label: string; action: () => void; disabled?: boolean }[] = [
			{
				label: paymentsView ? 'Înscrieri și acorduri' : 'Vezi plățile participării',
				action: () => {
					void goto(
						resolve(
							`/activities/${activityId}/${paymentsView ? 'registrations' : 'finance/participation'}`
						)
					);
				}
			},
			{
				label: 'Prezentarea activității',
				action: () => {
					void goto(resolve(`/activities/${activityId}`));
				}
			}
		];
		if (overview.capabilities.manage)
			items.push({
				label: paymentsView ? 'Setări plată' : 'Setări înscrieri',
				action: () => {
					void goto(activitySettingsHref(activityId, paymentsView ? 'payments' : 'registrations'));
				}
			});
		if (overview.capabilities.finance)
			items.push({
				label: 'Sumar financiar',
				action: () => {
					financialOpen = true;
				}
			});
		if (overview.capabilities.manage && overview.mailConfigured === false)
			items.push({
				label: 'Confirmări e-mail în așteptare',
				action: () => {
					mailOpen = true;
				}
			});
		items.push({ label: 'Exportă CSV', action: csv });
		if (overview.capabilities.manage) {
			items.push({
				label: `Confirmă familia (${selected.length})`,
				action: () => {
					familyOpen = true;
				},
				disabled: !selected.length
			});
			if (!paymentsView)
				items.push(
					{
						label: 'Solicită acord actualizat',
						action: () => {
							action = 'renew';
							active = null;
							dialogOpen = true;
						}
					},
					{
						label: 'Înscrie o excepție',
						action: () => {
							void goto(resolve(`/activitati/${activityId}?exceptie=1`));
						}
					}
				);
		}
		return items;
	}

	function csv() {
		const escape = (value: unknown) =>
			`"${String(value ?? '')
				.replace(/^[=+@\-\t\r]/, "'$&")
				.replaceAll('"', '""')}"`;
		const content = [
			[
				'Nume',
				'ID Orgo',
				'Ramură',
				'Rol',
				'Participare',
				'Taxă lei',
				'Încasări lei',
				'Susținere CL lei',
				'Sold lei',
				'Acord'
			],
			...rows.map((r) => [
				r.memberName,
				r.orgoId,
				r.branch,
				r.role,
				states[r.state],
				(r.totalBani ?? 0) / 100,
				(r.cashBani ?? 0) / 100,
				(r.supportBani ?? 0) / 100,
				(r.remainingBani ?? 0) / 100,
				states[r.consentState]
			])
		]
			.map((row) => row.map(escape).join(','))
			.join('\r\n');
		const url = URL.createObjectURL(
			new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = `inscrieri-${activityId}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head
	><title>{paymentsView ? 'Plăți participare' : 'Înscrieri'} — {data.activity.title}</title
	></svelte:head
>
<section class="workspace">
	<header class="registration-heading">
		<div class="heading-title">
			<h1>{paymentsView ? 'Plăți participare' : 'Înscrieri'}</h1>
			<span class="row-count">{rows.length}</span>
		</div>
		<ActionMenu label="Acțiuni înscrieri" items={workspaceActions()} />
	</header>
	{#if overview.capabilities.finance}<button
			class="financial-brief"
			onclick={() => (financialOpen = true)}
			aria-label="Deschide sumarul financiar"
		>
			<span>Încasat <strong>{money(totals.cash)}</strong></span><span
				>Rest <strong>{money(totals.remaining)}</strong></span
			><ChevronDown size={14} aria-hidden="true" />
		</button>{/if}
	{#if message}<FormFeedback {message} kind={failed ? 'error' : 'info'} />{/if}

	<TableView compact label="Caută participantul sau ID-ul Orgo">
		{#snippet controls()}<label class="registration-filter"
				><span>Filtrează</span><select
					aria-label="Filtrează"
					bind:value={filter}
					onchange={() => (selected = [])}
				>
					<option value="current">Fără retrageri</option><option value="all"
						>Toate, inclusiv retragerile</option
					><option value="pending">Așteaptă aprobarea</option><option value="waitlisted"
						>Lista de așteptare</option
					><option value="accepted">Participare confirmată</option><option value="reserved"
						>Loc rezervat</option
					><option value="unpaid">Sold de acoperit</option>{#if !paymentsView}<option
							value="missing_consent">Acorduri de urmărit</option
						><option value="handoff">Documente sau cash de primit</option>{/if}<option
						value="withdrawn">Doar retrași</option
					>
				</select></label
			>
		{/snippet}
		{#if !rows.length}<div class="empty">
				<h2>Nicio înscriere în această selecție</h2>
				<p>
					{overview.rows.length
						? 'Schimbă filtrul pentru a vedea celelalte înscrieri, inclusiv retragerile.'
						: 'Configurează și publică pagina activității, apoi distribuie linkul către participanți.'}
				</p>
			</div>{:else}<table>
				<thead
					><tr
						>{#if overview.capabilities.manage}<th scope="col">Familie</th>{/if}<th scope="col"
							>Participant</th
						><th scope="col">Participare</th>{#if overview.capabilities.finance}<th scope="col"
								>Taxă / încasări / susținere</th
							><th scope="col">Sold</th>{/if}{#if !paymentsView}<th scope="col">Acord / primire</th
							>{/if}<th scope="col">Acțiuni</th></tr
					></thead
				><tbody>
					{#each rows as row (row.id)}<tr>
							<td
								class="mobile-participant"
								colspan={(overview.capabilities.manage ? 1 : 0) +
									3 +
									(overview.capabilities.finance ? 2 : 0) +
									(!paymentsView ? 1 : 0)}
							>
								<div class="participant-line">
									<button
										class="participant-toggle"
										aria-expanded={expandedRows.includes(row.id)}
										aria-controls={`participant-details-${row.id}`}
										onclick={() =>
											(expandedRows = expandedRows.includes(row.id)
												? expandedRows.filter((id) => id !== row.id)
												: [...expandedRows, row.id])}
									>
										<span class="participant-identity"
											><strong title={row.memberName}>{row.memberName}</strong><span
												class="participant-grade"
												>{row.grade === 0
													? 'Pregătitoare'
													: row.grade != null
														? `Clasa ${row.grade}`
														: 'Clasa —'}</span
											></span
										>
										<ChevronDown
											size={14}
											class={expandedRows.includes(row.id) ? 'expanded-chevron' : ''}
										/>
									</button>
									{#if paymentsView}<span class="payment-balance" class:paid={!row.remainingBani}
											>{row.remainingBani ? `Rest ${money(row.remainingBani)}` : 'Achitat'}</span
										>{/if}
									{#if !paymentsView}<RegistrationReceipt
											{activityId}
											{row}
											capabilities={overview.capabilities}
											compact
										/>{/if}
									{#if rowMenu(row, true).length}<div class="participant-menu">
											<ActionMenu
												label={`Acțiuni pentru ${row.memberName}`}
												items={rowMenu(row, true)}
											/>
										</div>{/if}
								</div>
								<div
									class="participant-details"
									id={`participant-details-${row.id}`}
									hidden={!expandedRows.includes(row.id)}
								>
									<dl>
										<div>
											<dt>Nume</dt>
											<dd>{row.memberName}</dd>
										</div>
										<div>
											<dt>Participare</dt>
											<dd>{states[row.state]}</dd>
										</div>
										<div>
											<dt>ID Orgo</dt>
											<dd>{row.orgoId}</dd>
										</div>
										<div>
											<dt>Ramură</dt>
											<dd>{row.branch}</dd>
										</div>
										<div>
											<dt>Rol</dt>
											<dd>{row.role === 'staff' ? 'Echipa adultă' : 'Beneficiar'}</dd>
										</div>
										{#if !paymentsView}<div>
												<dt>Acord</dt>
												<dd>{states[row.consentState] ?? row.consentState}</dd>
											</div>{/if}
										{#if overview.capabilities.finance}
											<div>
												<dt>Taxă</dt>
												<dd>{money(row.totalBani)}</dd>
											</div>
											<div>
												<dt>Încasat</dt>
												<dd>{money(row.cashBani)}</dd>
											</div>
											<div>
												<dt>Susținere CL</dt>
												<dd>{money(row.supportBani)}</dd>
											</div>
											<div>
												<dt>Sold</dt>
												<dd>{money(row.remainingBani)}</dd>
											</div>
											{#if row.familyPlan}<div>
													<dt>Cotizație</dt>
													<dd>{row.familyPlan}{row.familyKey ? ' · Familie confirmată' : ''}</dd>
												</div>{/if}
											{#if row.refundRemainingBani}<div>
													<dt>De restituit</dt>
													<dd class="attention">{money(row.refundRemainingBani)}</dd>
												</div>
											{:else if row.state === 'withdrawn' && row.refundDueBani == null && (row.cashBani ?? 0) > 0}<div
												>
													<dt>Restituire</dt>
													<dd class="attention">De stabilit</dd>
												</div>{/if}
											{#if row.excessBani}<div>
													<dt>În plus</dt>
													<dd class="attention">{money(row.excessBani)}</dd>
												</div>{/if}
											{#if row.remainingBani && (row.paymentDue || row.installment?.due)}<div>
													<dt>Scadență</dt>
													<dd>
														{row.paymentDue ||
															row.installment
																?.due}{#if (row.paymentDue || row.installment?.due || '') < new Intl.DateTimeFormat( 'en-CA', { timeZone: 'Europe/Bucharest' } ).format(new Date())}<small
																class="attention">Termen depășit — verifică încasările</small
															>{/if}
													</dd>
												</div>{/if}
										{/if}
										{#if row.mailState === 'pending' || row.mailState === 'sending'}<div>
												<dt>Confirmare e-mail</dt>
												<dd>În așteptare</dd>
											</div>{/if}
									</dl>
									{#if overview.capabilities.manage}<label class="family-selection"
											><input
												type="checkbox"
												aria-label={`Include ${row.memberName} în familie`}
												disabled={row.role === 'staff' ||
													!['accepted', 'reserved'].includes(row.state)}
												checked={selected.includes(row.id)}
												onchange={(e) =>
													(selected = e.currentTarget.checked
														? [...selected, row.id]
														: selected.filter((id) => id !== row.id))}
											/>Include în familie</label
										>{/if}
								</div>
							</td>
							{#if overview.capabilities.manage}<td data-label="Familie"
									><input
										type="checkbox"
										aria-label={`Include ${row.memberName} în familie`}
										disabled={row.role === 'staff' || !['accepted', 'reserved'].includes(row.state)}
										checked={selected.includes(row.id)}
										onchange={(e) =>
											(selected = e.currentTarget.checked
												? [...selected, row.id]
												: selected.filter((id) => id !== row.id))}
									/></td
								>{/if}
							<td data-label="Participant"
								><strong class="member-name">{row.memberName}</strong><small
									>ID {row.orgoId} · {row.branch} · {row.role === 'staff'
										? 'Echipa adultă'
										: 'Beneficiar'}</small
								>{#if row.familyPlan}<small
										>Cotizație: {row.familyPlan}{row.familyKey
											? ' · Familie confirmată'
											: ''}</small
									>{/if}{#if row.mailState === 'pending' || row.mailState === 'sending'}<small
										>E-mail de confirmare în așteptare</small
									>{/if}</td
							>
							<td data-label="Participare"><span class="badge">{states[row.state]}</span></td>
							{#if overview.capabilities.finance}<td data-label="Taxă / încasări / susținere"
									>{money(row.totalBani)}<small>{money(row.cashBani)} încasat</small><small
										>{money(row.supportBani)} susținere CL</small
									></td
								><td data-label="Sold"
									><strong>{money(row.remainingBani)}</strong>{#if row.refundRemainingBani}<small
											class="attention">De restituit: {money(row.refundRemainingBani)}</small
										>{:else if row.state === 'withdrawn' && row.refundDueBani == null && (row.cashBani ?? 0) > 0}<small
											class="attention">Restituire de stabilit</small
										>{/if}{#if row.excessBani}<small class="attention"
											>În plus: {money(row.excessBani)}</small
										>{/if}{#if row.remainingBani && (row.paymentDue || row.installment?.due)}<small
											>Scadență: {row.paymentDue || row.installment?.due}</small
										>{#if (row.paymentDue || row.installment?.due || '') < new Intl.DateTimeFormat( 'en-CA', { timeZone: 'Europe/Bucharest' } ).format(new Date())}<small
												class="attention">Termen depășit — verifică încasările</small
											>{/if}{/if}</td
								>{/if}
							{#if !paymentsView}<td data-label="Acord / primire"
									><RegistrationReceipt
										{activityId}
										{row}
										capabilities={overview.capabilities}
										compact
									/></td
								>{/if}<td data-label="Acțiuni"
								><div class="row-actions">
									{#if rowMenu(row, true).length}<ActionMenu
											label={`Acțiuni pentru ${row.memberName}`}
											items={rowMenu(row, true)}
										/>{/if}
								</div></td
							>
						</tr>{/each}</tbody
				>
			</table>{/if}</TableView
	>
</section>
<Modal
	bind:open={financialOpen}
	title="Sumar financiar"
	description="Sumele includ toate înscrierile activității, indiferent de filtrul listei."
>
	<dl class="financial-details">
		<div>
			<dt>Încasări nete de restituiri</dt>
			<dd>{money(totals.cash)}</dd>
		</div>
		<div>
			<dt>Susținere din centrul local</dt>
			<dd>{money(totals.support)}</dd>
		</div>
		<div>
			<dt>Sold de acoperit</dt>
			<dd>{money(totals.remaining)}</dd>
		</div>
	</dl>
</Modal>
<Modal
	bind:open={mailOpen}
	title="Confirmări e-mail în așteptare"
	description="Trimiterea e-mailurilor nu este configurată."
	><p>
		Pagina personală este disponibilă imediat după înscriere. Confirmările vor putea fi trimise după
		configurarea serviciului de e-mail.
	</p></Modal
>

<Modal
	bind:open={dialogOpen}
	title={action === 'renew'
		? 'Solicită resemnarea acordurilor'
		: (active?.memberName ?? 'Actualizare înscriere')}
	description="Verifică modificarea înainte de confirmare."
>
	<form
		class="dialog-form"
		onsubmit={(e) => {
			e.preventDefault();
			if (action === 'renew')
				void run('renew-consent', {}).then((ok) => {
					if (ok) dialogOpen = false;
				});
			else void update();
		}}
	>
		{#if action === 'renew'}<p>
				Acordurile înscrierilor afectate vor folosi publicația curentă și vor fi marcate „Necesită
				acord actualizat”. Participanții din afara unităților și ramurilor pregătite păstrează
				acordul anterior. Documentele deja emise rămân în istoric.
			</p>
		{:else if action === 'close_checkout'}<p>
				Verifică încercarea la procesator. Pentru Stripe, aplicația solicită închiderea sesiunii și
				verifică faptul că este neplătită. Pentru o încercare cu rezultat necunoscut, confirmă
				dovezile înainte de a permite o nouă plată.
			</p>
			<label class="choice"
				><input type="checkbox" bind:checked={confirmUnpaid} /> Am verificat la procesator: plata nu s-a
				efectuat și linkul nu mai poate încasa.</label
			><label
				>Referința verificării și explicația<textarea bind:value={note} required></textarea></label
			>
		{:else if action === 'receipt'}<label
				>Tip de înregistrare<select bind:value={method}
					><option value="bank">Transfer bancar</option><option value="cash">Cash</option><option
						value="support">Susținere din centrul local</option
					><option value="refund">Restituire efectuată</option></select
				></label
			><label
				>Suma în lei<input
					type="number"
					min="0.01"
					step="0.01"
					required
					bind:value={amountLei}
				/></label
			><label
				>Data încasării / operațiunii<DateInput
					type="date"
					bind:value={receivedOn}
					required
				/></label
			><label>Referință și explicație<textarea bind:value={note} required></textarea></label>
			<p>Înregistrează o operațiune deja efectuată. Restituirea banilor se face separat.</p>
		{:else if action === 'plan_refund'}<label
				>Suma totală aprobată pentru restituire, lei<input
					type="number"
					min="0"
					step="0.01"
					required
					bind:value={amountLei}
				/></label
			><label
				>Motivul și condițiile restituirii<textarea bind:value={note} required></textarea></label
			>
			<p>
				Acest pas planifică restituirea. După efectuarea ei, înregistrează separat suma ca
				„Restituire efectuată”.
			</p>
		{:else if action === 'price'}<label
				>Taxa nouă în lei<input
					type="number"
					min="0"
					step="0.01"
					required
					bind:value={amountLei}
				/></label
			><label>Motivul ajustării<textarea bind:value={note} required></textarea></label>
			<p>
				Încasările existente rămân păstrate. Eventualele sume în plus vor fi vizibile pentru
				clarificare.
			</p>
		{:else if action === 'reversal'}<label
				>Înregistrare de corectat<select bind:value={entryId} required
					><option value="">Alege înregistrarea</option
					>{#each active?.entries?.filter((e) => !e.reversedEntryId && !active?.entries?.some((other) => other.reversedEntryId === e.id)) ?? [] as entry (entry.id)}<option
							value={entry.id}
							>{entry.receivedOn} · {entry.method} · {money(entry.amountBani)} · {entry.note}</option
						>{/each}</select
				></label
			><label>Motivul corecției<textarea bind:value={note} required></textarea></label>
		{:else if action === 'extend_deadline'}<label
				>Noul termen<DateInput type="date" bind:value={receivedOn} required /></label
			>
		{:else if action === 'delete'}<p>
				Ștergi definitiv înscrierea pentru <strong>{active?.memberName}</strong> la această activitate,
				împreună cu răspunsurile, acordurile și e-mailurile asociate. Profilul membrului rămâne în evidență.
				Acțiunea nu poate fi anulată.
			</p>
			<p>
				Înscrierile cu înregistrări financiare sau încercări de plată nu pot fi șterse. Tarifele
				celorlalți membri ai familiei rămân neschimbate.
			</p>
		{:else if action === 'withdraw'}<p>
				Participantul va fi retras și locul va fi eliberat. Încasările rămân în evidență. Verifică
				separat restituirea și, dacă este cazul, recalculează explicit familia.
			</p>
		{:else if action === 'accept'}<p>
				Se verifică locurile disponibile. Plata devine disponibilă după acceptare.
			</p>
		{:else}<p>Confirmă respingerea înscrierii.</p>{/if}
		{#if message}<FormFeedback {message} kind={failed ? 'error' : 'success'} />{/if}<button
			disabled={busy}
			>{busy
				? 'Se salvează…'
				: action === 'delete'
					? 'Șterge definitiv înscrierea'
					: 'Confirmă modificarea'}</button
		>
	</form>
</Modal>
<Modal
	bind:open={familyOpen}
	title="Confirmă familia și tarifele"
	description="Confirmă legătura familială și participarea la aceeași activitate."
>
	<form
		class="dialog-form"
		onsubmit={(e) => {
			e.preventDefault();
			void run('family', { registrationIds: selected, note: familyNote }).then((ok) => {
				if (ok) {
					familyOpen = false;
					selected = [];
				}
			});
		}}
	>
		<ol>
			{#each selected as id, index (id)}<li>
					{overview.rows.find((row) => row.id === id)?.memberName} — {money(
						overview.settings?.familyFees[
							Math.min(index, (overview.settings?.familyFees.length ?? 1) - 1)
						]
					)}
				</li>{/each}
		</ol>
		<p>
			Ordinea selecției stabilește primul, al doilea și următorii membri. Pentru un singur
			participant se aplică taxa obișnuită. Încasările deja primite rămân în evidență.
		</p>
		<label
			>Confirmarea relației și motivul ajustării<textarea bind:value={familyNote} required
			></textarea></label
		>{#if message}<FormFeedback {message} kind={failed ? 'error' : 'success'} />{/if}<button
			disabled={busy}>Confirmă familia și aplică tarifele</button
		>
	</form>
</Modal>

<style>
	.registration-heading {
		min-height: 44px;
	}
	.heading-title {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.row-count {
		font-size: 13px;
		color: var(--sc-muted);
		background: var(--sc-inset);
		min-width: 24px;
		padding: 3px 7px;
		text-align: center;
		border-radius: 6px;
	}
	button.financial-brief {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-start;
		gap: 4px 16px;
		padding: 0;
		min-height: 28px;
		background: transparent;
		color: var(--sc-muted);
		text-align: left;
		font-size: 12px;
	}
	.financial-brief span {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 5px;
	}
	.financial-brief strong {
		color: var(--sc-ink);
		font-size: 13px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.financial-brief:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
		border-radius: 4px;
	}
	.financial-details {
		display: grid;
		gap: 16px;
		margin: 0;
	}
	.financial-details > div {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: space-between;
	}
	.financial-details dt {
		color: var(--sc-muted);
	}
	.financial-details dd {
		margin: 0;
		color: var(--sc-ink);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.registration-filter span {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.registration-filter select {
		min-height: 44px;
	}

	td:has(.member-name) {
		min-width: 180px;
	}
	.workspace {
		container-type: inline-size;
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: clamp(24px, 3vw, 30px);
		letter-spacing: -0.025em;
		margin: 0;
	}
	small {
		display: block;
		color: var(--sc-ink-muted);
		font-size: 0.8rem;
		line-height: 1.6;
	}
	.row-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}
	button {
		min-height: 44px;
		padding: 8px 12px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		border: 0;
		border-radius: 7px;
		cursor: pointer;
		font: inherit;
		text-decoration: none;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	label,
	.dialog-form {
		display: grid;
		gap: 12px;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		padding: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		max-width: 100%;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: var(--sc-surface);
		font-size: 0.9rem;
	}
	.mobile-participant {
		display: none;
	}
	th,
	td {
		text-align: left;
		padding: 12px;
		border-bottom: 1px solid var(--sc-border);
		vertical-align: top;
	}
	th {
		font-weight: 600;
		color: var(--sc-ink-muted);
		white-space: nowrap;
	}
	td:first-child {
		min-width: 48px;
	}
	.row-actions {
		min-width: 44px;
	}
	.badge {
		display: inline-block;
		background: var(--sc-canvas);
		border-radius: 6px;
		padding: 4px 8px;
	}
	.empty {
		padding: 12px 16px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	p {
		line-height: 1.6;
	}
	.attention {
		color: var(--sc-danger);
	}
	@container (max-width: 900px) {
		table,
		tbody {
			display: block;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		tr {
			display: block;
			border-bottom: 1px solid var(--sc-border);
		}
		tr:global([hidden]) {
			display: none;
		}
		td {
			display: none;
			min-width: 0 !important;
			padding: 0;
			overflow-wrap: anywhere;
		}
		td.mobile-participant {
			display: block;
			border: 0;
			padding: 0;
		}
		.participant-line {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 8px 0;
		}
		.participant-toggle {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 4px;
			flex: 1;
			min-width: 0;
			min-height: 44px;
			border: 0;
			padding: 0 4px;
			border-radius: 7px;
			background: transparent;
			color: var(--sc-ink);
			text-align: left;
		}
		.participant-toggle:hover {
			background: var(--sc-canvas);
		}
		.participant-toggle:focus-visible {
			outline: 2px solid var(--sc-accent);
			outline-offset: 2px;
		}
		.participant-identity {
			display: grid;
			gap: 2px;
			min-width: 0;
		}
		.participant-identity strong {
			font-size: 14px;
			font-weight: 600;
			line-height: 20px;
			max-height: 40px;
			overflow-wrap: anywhere;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
		.participant-grade {
			font-size: 12px;
			line-height: 16px;
			color: var(--sc-ink-muted);
		}
		.participant-toggle :global(svg) {
			flex-shrink: 0;
			color: var(--sc-ink-muted);
		}
		.participant-toggle :global(.expanded-chevron) {
			transform: rotate(180deg);
		}
		.participant-menu :global(.sc-icon-button) {
			min-width: 44px;
			min-height: 44px;
		}
		.participant-details {
			padding: 4px 8px 16px;
		}
		.participant-details dl {
			margin: 0;
			display: grid;
			gap: 10px;
		}
		.participant-details dl > div {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 12px;
		}
		.participant-details dt {
			color: var(--sc-ink-muted);
		}
		.participant-details dd {
			margin: 0;
			overflow-wrap: anywhere;
			font-variant-numeric: tabular-nums;
		}
		.family-selection {
			display: flex;
			align-items: center;
			min-height: 44px;
			margin-top: 8px;
			gap: 8px;
		}
		td:last-child {
			border-bottom: 0;
		}
		.row-actions {
			min-width: 0;
		}
	}
	@media (max-width: 600px) {
	}

	input:not([type='hidden']):not([type='checkbox']):not([type='radio']),
	select,
	textarea {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}

	.payment-balance {
		flex-shrink: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--sc-ink);
	}
	.payment-balance.paid {
		color: var(--sc-success);
	}
</style>
