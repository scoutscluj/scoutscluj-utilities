<script lang="ts">
	import DateInput from '$lib/components/ui/DateInput.svelte';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import TableView from '$lib/components/ui/TableView.svelte';
	import ActivitySettingsLink from '$lib/activities/ActivitySettingsLink.svelte';
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
	let filter = $state('all'),
		message = $state(''),
		busy = $state(false);
	let selected = $state<string[]>([]),
		familyOpen = $state(false),
		familyNote = $state('');
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
		publicPath = $derived(resolve(`/activitati/${data.activity.id}`)),
		activityId = $derived(data.activity.id);
	async function copyPublicLink() {
		try {
			await navigator.clipboard.writeText(`${location.origin}${publicPath}`);
			message = 'Linkul public al activității a fost copiat.';
		} catch {
			message = `Link public: ${location.origin}${publicPath}`;
		}
	}
	const rows = $derived(
		overview.rows.filter(
			(row) =>
				(!paymentsView || row.role !== 'staff') &&
				(filter === 'all' ||
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
		try {
			await registrationRequest(activityId, path, body, undefined, method);
			await invalidateAll();
			message = 'Modificările au fost salvate.';
			return true;
		} catch (e) {
			message = (e as Error).message;
			return false;
		} finally {
			busy = false;
		}
	}
	async function update() {
		if (!active) return;
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
	function rowMenu(row: Registration) {
		const items: { label: string; action: () => void; destructive?: boolean }[] = [];
		const add = (label: string, operation: string, destructive = false) =>
			items.push({ label, action: () => open(row, operation), destructive });
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
		}
		if (!paymentsView && overview.capabilities.consent && row.consentState !== 'not_required') {
			add('Acord fizic primit', 'paper_received');
			if (row.consentState === 'uploaded') add('Acceptă PDF-ul semnat', 'signed_accepted');
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
	{#if overview.capabilities.manage && overview.mailConfigured === false}<p class="notice">
			Confirmările prin e-mail rămân în așteptare până la configurarea trimiterii. Pagina personală
			este disponibilă imediat după înscriere.
		</p>{/if}
	<header>
		<div>
			<a href={resolve(`/activities/${activityId}`)}>← {data.activity.title}</a>
			<h1>{paymentsView ? 'Plăți participare' : 'Înscrieri'}</h1>
		</div>
		<a class="button secondary" href={resolve(`/activitati/${activityId}`)}
			>Deschide pagina publică ↗</a
		>
	</header>
	{#if overview.capabilities.manage}<section class="notice">
			<strong>Pagina pe care o distribui participanților</strong>
			<p>
				<code>/activitati/{activityId}</code> · Completează acordul, verifică taxa și bifează „Publică
				pagina activității și înscrierile” în Setări înscrieri.
			</p>
			<button class="secondary" onclick={copyPublicLink}>Copiază linkul public</button>
		</section>{/if}
	{#if overview.capabilities.finance}<div class="totals">
			<div><small>Încasări nete de restituiri</small><strong>{money(totals.cash)}</strong></div>
			<div><small>Susținere din centrul local</small><strong>{money(totals.support)}</strong></div>
			<div><small>Sold de acoperit</small><strong>{money(totals.remaining)}</strong></div>
		</div>{/if}
	{#if overview.capabilities.manage}<ActivitySettingsLink
			{activityId}
			section={paymentsView ? 'plati' : 'inscrieri'}
			label={paymentsView ? 'Setări plată' : 'Setări înscrieri'}
		/>{/if}
	<a
		href={resolve(
			`/activities/${activityId}/${paymentsView ? 'registrations' : 'finance/participation'}`
		)}>{paymentsView ? 'Vezi înscrierile și acordurile' : 'Vezi plățile participării'} →</a
	>
	{#if message}<p role="status" class="notice">{message}</p>{/if}

	<div class="toolbar">
		<label
			>Filtrează<select bind:value={filter} onchange={() => (selected = [])}
				><option value="all">Toate înscrierile</option><option value="pending"
					>Așteaptă aprobarea</option
				><option value="waitlisted">Lista de așteptare</option><option value="accepted"
					>Participare confirmată</option
				><option value="reserved">Loc rezervat</option><option value="unpaid"
					>Sold de acoperit</option
				>{#if !paymentsView}<option value="missing_consent">Acorduri de urmărit</option>{/if}<option
					value="withdrawn">Retrageri</option
				></select
			></label
		><button class="secondary" onclick={csv}>Exportă CSV</button>
		{#if overview.capabilities.manage}<button
				class="secondary"
				onclick={() => (familyOpen = true)}
				disabled={!selected.length}>Confirmă familia ({selected.length})</button
			>{#if !paymentsView}<button
					class="secondary"
					onclick={() => {
						action = 'renew';
						active = null;
						dialogOpen = true;
					}}>Solicită acord actualizat</button
				><a href={resolve(`/activitati/${activityId}?exceptie=1`)}>Înscrie o excepție</a>{/if}{/if}
	</div>
	{#if !rows.length}<div class="empty">
			<h2>Nicio înscriere în această selecție</h2>
			<p>Configurează și publică pagina activității, apoi distribuie linkul către participanți.</p>
		</div>{:else}
		<TableView label="Caută participantul sau ID-ul Orgo"
			><table>
				<thead
					><tr
						>{#if overview.capabilities.manage}<th scope="col">Familie</th>{/if}<th scope="col"
							>Participant</th
						><th scope="col">Participare</th>{#if overview.capabilities.finance}<th scope="col"
								>Taxă / încasări / susținere</th
							><th scope="col">Sold</th>{/if}{#if !paymentsView}<th scope="col">Acord</th>{/if}<th
							scope="col">Acțiuni</th
						></tr
					></thead
				><tbody>
					{#each rows as row (row.id)}<tr>
							{#if overview.capabilities.manage}<td
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
							<td
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
							<td><span class="badge">{states[row.state]}</span></td>
							{#if overview.capabilities.finance}<td
									>{money(row.totalBani)}<small>{money(row.cashBani)} încasat</small><small
										>{money(row.supportBani)} susținere CL</small
									></td
								><td
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
							{#if !paymentsView}<td>{states[row.consentState]}</td>{/if}<td
								><div class="row-actions">
									{#if overview.capabilities.sensitive}<a
											href={resolve(`/activitati/${activityId}/inscriere/${row.id}`)}
											>Fișa înscrierii</a
										>{/if}
									{#if overview.capabilities.finance && row.role !== 'staff'}<button
											class="secondary"
											onclick={() => open(row, 'receipt')}>Înregistrează sumă</button
										>{/if}
									{#if rowMenu(row).length}<ActionMenu
											label={`Acțiuni pentru ${row.memberName}`}
											items={rowMenu(row)}
										/>{/if}
								</div></td
							>
						</tr>{/each}</tbody
				>
			</table></TableView
		>{/if}
</section>
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
				acord actualizat”. Documentele anterioare rămân în istoric.
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
		{:else if action === 'withdraw'}<p>
				Participantul va fi retras și locul va fi eliberat. Încasările rămân în evidență. Verifică
				separat restituirea și, dacă este cazul, recalculează explicit familia.
			</p>
		{:else if action === 'accept'}<p>
				Se verifică locurile disponibile. Plata devine disponibilă după acceptare.
			</p>
		{:else if action === 'signed_accepted'}<p>
				Confirmă numai după ce ai deschis și verificat PDF-ul încărcat din fișa înscrierii.
			</p>
		{:else if action === 'paper_received'}<p>
				Confirmă că ai primit fizic acordul semnat pentru versiunea curentă a activității.
			</p>
		{:else}<p>Confirmă respingerea înscrierii.</p>{/if}
		{#if message}<p role="status">{message}</p>{/if}<button disabled={busy}
			>{busy ? 'Se salvează…' : 'Confirmă modificarea'}</button
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
		>{#if message}<p role="status">{message}</p>{/if}<button disabled={busy}
			>Confirmă familia și aplică tarifele</button
		>
	</form>
</Modal>

<style>
	td:has(.member-name) {
		min-width: 180px;
	}
	.workspace {
		display: grid;
		gap: 20px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: 2rem;
		letter-spacing: -0.025em;
		margin: 8px 0;
	}
	a {
		color: var(--sc-accent);
	}
	.totals {
		display: flex;
		gap: 32px;
		flex-wrap: wrap;
		background: var(--sc-surface);
		padding: 20px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	.totals div {
		display: grid;
		gap: 6px;
	}
	.totals strong {
		font-size: 1.5rem;
		font-variant-numeric: tabular-nums;
	}
	small {
		display: block;
		color: var(--sc-ink-muted);
		font-size: 0.8rem;
		line-height: 1.6;
	}
	.toolbar,
	.row-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}
	button,
	.button {
		min-height: 36px;
		padding: 8px 12px;
		background: var(--sc-accent);
		color: white;
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
	.secondary {
		background: var(--sc-surface);
		color: var(--sc-ink);
		border: 1px solid var(--sc-border);
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
		min-width: 200px;
	}
	.row-actions button {
		font-size: 0.8rem;
		min-height: 32px;
	}
	.badge {
		display: inline-block;
		background: var(--sc-canvas);
		border-radius: 6px;
		padding: 4px 8px;
	}
	.notice,
	.empty {
		padding: 20px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	p {
		line-height: 1.6;
	}
	.attention {
		color: var(--sc-accent);
	}
	@media (max-width: 600px) {
		.totals {
			gap: 20px;
		}
		.totals strong {
			font-size: 1.2rem;
		}
	}
</style>
