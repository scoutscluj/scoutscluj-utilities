<script lang="ts">
	import { resolve } from '$app/paths';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import AdmissionForm from '$lib/members/AdmissionForm.svelte';
	let { data, form } = $props();
	let filter = $state('pending');
	const rows = $derived(
		data.applications.applications.filter((r) => filter === 'all' || r.state === filter)
	);
	const labels: Record<string, string> = {
		pending: 'În așteptare',
		approved: 'Aprobată',
		rejected: 'Respinsă',
		'needs-information': 'Necesită completări'
	};
	const dateLabel = (value: string) =>
		new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('ro-RO');
	const gradeLabel = (grade: number | null) =>
		grade == null
			? 'Nespecificată'
			: Number(grade) === 0
				? 'Pregătitoare'
				: `Clasa a ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][Number(grade)] ?? grade}-a`;
</script>

<svelte:head><title>Cereri de înscriere | Scouts Cluj</title></svelte:head>
<main>
	<header>
		<a class="back-link" href={resolve('/units')}>← Membri și unități</a>
		<p class="eyebrow">Centrul local · Membri noi</p>
		<h1>Cereri de înscriere</h1>
		<p>Confirmă cererile unității tale. Crearea contului Orgo este urmărită separat.</p>
	</header>
	{#if form?.message}<p class="notice" role="status">{form.message}</p>{/if}
	<div class="toolbar">
		<label
			>Stare <select bind:value={filter}
				><option value="pending">În așteptare</option><option value="approved">Aprobate</option
				><option value="needs-information">Necesită completări</option><option value="rejected"
					>Respinse</option
				><option value="all">Toate</option></select
			></label
		><span>{rows.length} {rows.length === 1 ? 'cerere' : 'cereri'}</span>
	</div>
	{#if !rows.length}<p class="empty">Nu există cereri vizibile pentru filtrul ales.</p>{/if}
	{#each rows as row (row.id)}
		{@const unit = data.applications.units.find((u) => u.id === row.unitId)}
		{@const structure =
			(row.data.structureId ?? unit?.structureId) === 'floresti' ? 'Florești' : 'Cluj'}
		<details class="application">
			<summary class="application-summary">
				<span class="applicant"
					><strong>{row.data.firstName} {row.data.lastName}</strong><small
						>{structure} · {unit?.name ?? 'Solicită îndrumare'} · {dateLabel(row.createdAt)}</small
					></span
				>
				<span class="summary-end"
					><span class="status" data-state={row.state}>{labels[row.state] ?? row.state}</span
					><ChevronDown size={18} aria-hidden="true" /></span
				>
			</summary>
			<div class="body">
				<div class="review-layout">
					<div class="applicant-details">
						<section class="info-section" aria-label="Date membru">
							<h2>Date membru</h2>
							<dl class="facts">
								<div>
									<dt>Structură</dt>
									<dd>{structure}</dd>
								</div>
								<div>
									<dt>Ramura de vârstă</dt>
									<dd>{unit?.name ?? 'Solicită îndrumare'}</dd>
								</div>
								<div>
									<dt>Data nașterii</dt>
									<dd>{dateLabel(row.data.birthDate)}</dd>
								</div>
								<div>
									<dt>Clasă</dt>
									<dd>
										{row.data.schooling === 'grade' ? gradeLabel(row.data.grade) : 'Nu este elev'}
									</dd>
								</div>
							</dl>
						</section>
						<section class="info-section" aria-label="Contact membru">
							<h2>Contact membru</h2>
							<div class="contact-lines">
								{#if row.data.email}<a href={`mailto:${row.data.email}`}>{row.data.email}</a
									>{:else}<span class="muted">Fără email propriu</span>{/if}{#if row.data.phone}<a
										href={`tel:${row.data.phone}`}>{row.data.phone}</a
									>{/if}
							</div>
						</section>
						{#if row.data.guardianName}<section
								class="info-section"
								aria-label="Părinte sau tutore"
							>
								<h2>Părinte / tutore</h2>
								<p class="guardian-name">
									{row.data.guardianName}<span class="relationship"
										>{row.data.guardianRelation ?? ''}</span
									>
								</p>
								<div class="contact-lines">
									{#if row.data.guardianEmail}<a href={`mailto:${row.data.guardianEmail}`}
											>{row.data.guardianEmail}</a
										>{/if}{#if row.data.guardianPhone}<a href={`tel:${row.data.guardianPhone}`}
											>{row.data.guardianPhone}</a
										>{/if}
								</div>
							</section>{/if}
						{#if row.reason}<div class="reason-note">
								<h2>Motivul deciziei</h2>
								<p>{row.reason}</p>
							</div>{/if}
					</div>
					<aside class="decision-panel" aria-label="Decizia pentru cerere">
						<h2>{row.state === 'approved' ? 'Înscriere confirmată' : 'Verifică și decide'}</h2>
						{#if row.state !== 'approved'}
							<p class="panel-intro">
								Verifică datele membrului și repartizarea înainte de confirmare.
							</p>
							<form method="POST" action="?/review">
								<input type="hidden" name="id" value={row.id} /><input
									type="hidden"
									name="revision"
									value={row.revision}
								/>
								{#if data.applications.admin}<details class="advanced">
										<summary>Asociază un cont Orgo existent</summary>
										<div class="disclosure-body">
											<label
												>ID Orgo existent, dacă ai verificat deja identitatea<input
													name="existingOrgoId"
													inputmode="numeric"
													pattern="[0-9]+"
												/></label
											>
											<p class="hint">
												Completează doar dacă ai verificat că profilul aparține aceleiași persoane.
											</p>
										</div>
									</details>{/if}
								<button class="approve-button" name="action" value="approve"
									>Confirmă înscrierea</button
								>
								<p class="hint">Crearea sau asocierea contului Orgo începe după aprobare.</p>
								{#if data.applications.admin}<details class="alternative-decisions">
										<summary>Solicită completări sau respinge</summary>
										<div class="disclosure-body">
											<label
												>Motiv pentru respingere sau completări<textarea
													name="reason"
													maxlength="2000"
													rows="3"
												></textarea></label
											>
											<p class="hint">Motivul este necesar pentru aceste două acțiuni.</p>
											<div class="actions">
												<button class="secondary" name="action" value="needs-information"
													>Solicită completări</button
												><button class="reject-button" name="action" value="reject"
													>Respinge cererea</button
												>
											</div>
										</div>
									</details>{/if}
							</form>
						{/if}
						{#if row.sync}<div class="sync-notice" data-confirmed={row.sync.state === 'synced'}>
								<strong
									>Orgo: {row.sync.state === 'synced'
										? 'Confirmat'
										: 'În curs / necesită verificare'}</strong
								>
								<p>{row.sync.message}</p>
							</div>{/if}
						{#if row.state === 'approved' && row.sync && !['running', 'synced'].includes(row.sync.state)}<form
								method="POST"
								action="?/review"
							>
								<input type="hidden" name="id" value={row.id} /><input
									type="hidden"
									name="revision"
									value={row.revision}
								/>{#if data.applications.admin}<label
										>ID Orgo verificat, pentru asociere<input
											name="existingOrgoId"
											inputmode="numeric"
											pattern="[0-9]+"
										/></label
									>{/if}<button name="action" value="retry"
									>Confirmă din nou și reia verificarea</button
								>
							</form>{/if}
					</aside>
				</div>
				{#if data.applications.admin && row.state !== 'approved'}<details class="correction">
						<summary>Corectează datele cererii</summary>
						<div class="correction-body">
							<AdmissionForm
								units={data.applications.units}
								requestKey={data.requestKey}
								action="?/edit"
								values={{ ...row.data, id: row.id, revision: row.revision, unitId: row.unitId }}
								submitLabel="Salvează corecturile"
							/>
						</div>
					</details>{/if}
			</div>
		</details>
	{/each}
	{#if data.applications.admin}<details class="create">
			<summary>Adaugă o cerere în numele unui membru</summary>
			<div class="body">
				<AdmissionForm
					units={data.applications.units}
					requestKey={data.requestKey}
					action="?/create"
				/>
			</div>
		</details>{/if}
</main>

<style>
	main {
		max-width: 1240px;
		padding: 24px;
		margin: 0 auto;
	}
	.back-link {
		display: inline-block;
		font-size: 13px;
		color: var(--sc-muted);
		margin-bottom: 16px;
		text-decoration: none;
	}
	h1 {
		margin: 4px 0 12px;
		font-size: 1.9rem;
		letter-spacing: -0.02em;
	}
	header p {
		color: var(--sc-muted);
		line-height: 1.5;
	}
	.eyebrow {
		font-size: 0.75rem;
		text-transform: uppercase;
	}
	.toolbar {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
		margin: 24px 0 16px;
		font-size: 13px;
		color: var(--sc-muted);
	}
	label {
		display: grid;
		gap: 8px;
		font-size: 13px;
		color: var(--sc-ink);
		line-height: 1.5;
	}
	input,
	select,
	textarea {
		min-height: 44px;
		padding: 10px 12px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		box-sizing: border-box;
		max-width: 100%;
	}
	input,
	textarea {
		width: 100%;
	}
	textarea {
		resize: vertical;
	}
	.application,
	.create {
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		margin: 12px 0;
	}
	summary {
		cursor: pointer;
		padding: 16px;
		font-size: 14px;
	}
	.application-summary {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		padding: 20px;
		list-style: none;
	}
	.application-summary::-webkit-details-marker {
		display: none;
	}
	.applicant {
		min-width: 0;
	}
	.applicant strong {
		display: block;
		font-size: 16px;
		font-weight: 600;
	}
	.applicant small {
		display: block;
		margin-top: 6px;
		color: var(--sc-muted);
		font-size: 13px;
		line-height: 1.5;
	}
	.summary-end {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
		color: var(--sc-muted);
	}
	.summary-end :global(svg) {
		transition: transform 150ms ease-out;
	}
	.application[open] > summary .summary-end :global(svg) {
		transform: rotate(180deg);
	}
	.status {
		font-size: 12px;
		font-weight: 500;
		padding: 5px 10px;
		border-radius: 6px;
		background: var(--sc-inset);
	}
	.status[data-state='approved'] {
		color: var(--sc-success);
		background: var(--sc-success-soft);
	}
	.status[data-state='rejected'] {
		color: var(--sc-accent);
		background: var(--sc-accent-soft);
	}
	.body {
		padding: 0 20px 20px;
	}
	.review-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr);
		gap: 32px;
		padding-top: 24px;
		border-top: 1px solid var(--sc-border);
	}
	.applicant-details {
		min-width: 0;
	}
	h2 {
		margin: 0 0 16px;
		font-size: 14px;
		font-weight: 600;
		color: var(--sc-ink);
	}
	.info-section + .info-section,
	.reason-note {
		border-top: 1px solid var(--sc-border);
		padding-top: 20px;
		margin-top: 20px;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px 24px;
		margin: 0;
	}
	.facts div {
		min-width: 0;
	}
	dt {
		color: var(--sc-muted);
		font-size: 12px;
		margin-bottom: 6px;
	}
	dd {
		margin: 0;
		font-size: 14px;
		overflow-wrap: anywhere;
		line-height: 1.5;
	}
	.contact-lines {
		display: grid;
		gap: 8px;
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.contact-lines a {
		text-decoration: none;
	}
	.contact-lines a:hover,
	.back-link:hover {
		text-decoration: underline;
		color: var(--sc-accent);
	}
	.guardian-name {
		font-size: 14px;
		margin: 0 0 10px;
		line-height: 1.5;
	}
	.relationship {
		display: block;
		color: var(--sc-muted);
		font-size: 12px;
		margin-top: 4px;
	}
	.muted {
		color: var(--sc-muted);
	}
	.decision-panel {
		padding: 20px;
		border-radius: 8px;
		background: var(--sc-inset);
		align-self: start;
		min-width: 0;
	}
	.decision-panel h2 {
		font-size: 16px;
		margin-bottom: 8px;
	}
	.panel-intro,
	.hint {
		color: var(--sc-muted);
		line-height: 1.5;
		margin: 0;
	}
	.panel-intro {
		font-size: 13px;
		margin-bottom: 20px;
	}
	.hint {
		font-size: 12px;
	}
	form {
		display: grid;
		gap: 12px;
	}
	.advanced,
	.alternative-decisions {
		border-top: 1px solid var(--sc-border-strong);
	}
	.advanced summary,
	.alternative-decisions summary {
		padding: 12px 0;
		font-size: 13px;
	}
	.advanced {
		border-top: 0;
	}
	.disclosure-body {
		display: grid;
		gap: 12px;
		padding: 4px 0 12px;
	}
	button {
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		background: var(--sc-accent);
		color: var(--sc-surface);
		padding: 10px 14px;
		min-height: 44px;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-accent-hover);
	}
	.secondary {
		background: var(--sc-surface);
		color: var(--sc-ink);
		border-color: var(--sc-border-strong);
	}
	.secondary:hover {
		background: var(--sc-inset);
	}
	.reject-button {
		background: var(--sc-surface);
		color: var(--sc-accent);
		border-color: var(--sc-border-strong);
	}
	.reject-button:hover {
		background: var(--sc-accent-soft);
	}
	.approve-button {
		width: 100%;
	}
	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
	.notice,
	.empty {
		padding: 16px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		line-height: 1.5;
	}
	.sync-notice {
		margin-top: 20px;
		font-size: 13px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.sync-notice p {
		margin: 8px 0 0;
		color: var(--sc-muted);
	}
	.sync-notice[data-confirmed='true'] strong {
		color: var(--sc-success);
	}
	.reason-note p {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		white-space: pre-wrap;
	}
	.correction {
		border-top: 1px solid var(--sc-border);
		margin-top: 24px;
	}
	.correction > summary {
		padding: 16px 0 0;
		font-size: 13px;
		color: var(--sc-muted);
	}
	.correction-body {
		padding-top: 24px;
	}
	.create {
		margin-top: 24px;
	}
	:is(button, input, select, textarea, summary, a):focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	@media (max-width: 800px) {
		.review-layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 24px;
		}
	}
	@media (max-width: 600px) {
		main {
			padding: 16px;
		}
		.application-summary {
			padding: 16px;
			align-items: start;
		}
		.summary-end {
			gap: 6px;
		}
		.status {
			max-width: 120px;
			text-align: center;
		}
		.body {
			padding: 0 16px 16px;
		}
		.decision-panel {
			padding: 16px;
		}
		.actions {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.summary-end :global(svg) {
			transition: none;
		}
	}
</style>
