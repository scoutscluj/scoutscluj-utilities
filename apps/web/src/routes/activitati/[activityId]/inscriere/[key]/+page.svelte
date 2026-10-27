<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import RegistrationPayment from '$lib/activities/RegistrationPayment.svelte';
	import RegistrationAnswers from '$lib/activities/RegistrationAnswers.svelte';
	import { registrationRequest, money, states } from '$lib/activities/registration';
	let { data } = $props();
	let busy = $state(false),
		message = $state(''),
		file = $state<File | null>(null);
	const row = $derived(data.registration);
	const generated = $derived(
		row.documents?.find(
			(d) =>
				d.kind === 'generated' &&
				d.publicationId === row.consentPublicationId &&
				d.answerRevision === row.answerRevision
		)
	);
	async function generate() {
		busy = true;
		message = '';
		try {
			await registrationRequest(
				data.activityId,
				`registrations/${row.id}/generate`,
				{},
				data.token
			);
			await invalidateAll();
		} catch (e) {
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
	async function upload() {
		if (!file || !generated) return;
		busy = true;
		message = '';
		try {
			if (file.size > 10 * 1024 * 1024) throw new Error('Fișierul trebuie să aibă cel mult 10 MB.');
			const contentBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result).split(',')[1]);
				reader.onerror = reject;
				reader.readAsDataURL(file!);
			});
			await registrationRequest(
				data.activityId,
				`registrations/${row.id}/upload`,
				{
					filename: file.name,
					contentType: 'application/pdf',
					contentBase64,
					sourceDocumentId: generated.id
				},
				data.token
			);
			await invalidateAll();
			message = 'PDF-ul a fost încărcat și așteaptă verificarea coordonatorului.';
		} catch (e) {
			message = (e as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head
	><title>Înscriere — {row.memberName} | Scouts Cluj</title><meta
		name="referrer"
		content="same-origin"
	/><meta name="robots" content="noindex,nofollow" /></svelte:head
>
<main>
	<a href={resolve(`/activitati/${data.activityId}`)}>← Înapoi la activitate</a>
	<h1>{row.memberName}</h1>
	<p>
		Înscrierea a fost înregistrată. Păstrează linkul acestei pagini privat pentru a reveni la acord
		și plată.
	</p>
	<section class="status">
		<div><small>Participare</small><strong>{states[row.state]}</strong></div>
		<div>
			<small>Plată</small><strong
				>{row.role === 'staff' ? 'Fără taxă' : states[row.paymentState ?? '']}</strong
			>
		</div>
		<div><small>Acord parental</small><strong>{states[row.consentState]}</strong></div>
	</section>
	{#if message}<p role="status">{message}</p>{/if}
	{#if row.role !== 'staff'}<section>
			<RegistrationAnswers {row} activityId={data.activityId} token={data.token} />
		</section>{/if}
	{#if row.minor && row.role !== 'staff'}
		<section>
			<h2>Acordul parental</h2>
			<ol>
				<li>Descarcă PDF-ul completat cu datele introduse.</li>
				<li>
					Semnează olograf fiecare pagină și adu acordul fizic la autocar, sau semnează digital
					PDF-ul și încarcă-l aici.
				</li>
			</ol>
			<button onclick={generate} disabled={busy}
				>{busy ? 'Se pregătește…' : 'Pregătește PDF-ul completat'}</button
			>
			{#if row.documents?.length}<ul>
					{#each row.documents as document (document.id)}<li>
							<a
								href={resolve(
									`/activitati/${data.activityId}/inscriere/${data.key}/documente/${document.id}`
								)}
								>{document.kind === 'signed' ? 'PDF semnat încărcat' : 'Descarcă acordul completat'} —
								{new Date(document.createdAt).toLocaleDateString('ro-RO')}</a
							>
						</li>{/each}
				</ul>{/if}
			{#if generated}<form
					onsubmit={(e) => {
						e.preventDefault();
						void upload();
					}}
				>
					<label
						>Încarcă PDF-ul semnat digital<input
							type="file"
							accept="application/pdf,.pdf"
							required
							onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
						/></label
					><button disabled={busy || !file}>Încarcă acordul semnat</button>
				</form>{/if}
		</section>{/if}
	{#if row.role !== 'staff' && row.totalBani !== undefined}<section>
			<h2>Situația taxei</h2>
			{#if row.refundDueBani != null}<p>
					Restituire aprobată: {money(row.refundDueBani)} · Restituire rămasă: {money(
						row.refundRemainingBani
					)}
				</p>{/if}
			<p>
				Taxă: <strong>{money(row.totalBani)}</strong> · Încasări: {money(row.cashBani)} · Susținere CL:
				{money(row.supportBani)} · Sold: <strong>{money(row.remainingBani)}</strong>
			</p>
			{#if row.excessBani}<p>
					Sumă în plus: {money(row.excessBani)}. Contactează coordonatorul pentru clarificare.
				</p>{/if}<RegistrationPayment
				activityId={data.activityId}
				identifier={String(row.orgoId)}
			/>
		</section>{/if}
	{#if row.payments?.length}<section>
			<h2>Încercări de plată</h2>
			{#each row.payments as attempt (attempt.id)}<p>
					{money(attempt.amountBani)} · {states[attempt.state] ??
						attempt.state}{attempt.reviewRequired ? ' · Necesită verificare financiară' : ''}
				</p>{/each}
		</section>{/if}
</main>

<style>
	main {
		max-width: 900px;
		margin: 24px auto;
		padding: 24px;
		display: grid;
		gap: 20px;
	}
	h1 {
		font-size: 2rem;
		letter-spacing: -0.025em;
		margin: 0;
	}
	h2 {
		font-size: 1.25rem;
		margin-top: 0;
	}
	p,
	li {
		line-height: 1.6;
	}
	p {
		margin: 0;
	}
	section {
		padding: 24px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		display: grid;
		gap: 16px;
	}
	.status {
		display: flex;
		gap: 24px;
		flex-wrap: wrap;
	}
	.status div {
		display: grid;
		gap: 6px;
	}
	small {
		color: var(--sc-ink-muted);
	}
	a {
		color: var(--sc-accent);
	}
	button {
		background: var(--sc-accent);
		color: white;
		border: 0;
		border-radius: 7px;
		min-height: 38px;
		padding: 10px 16px;
		width: fit-content;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
	}
	form,
	label {
		display: grid;
		gap: 12px;
	}
	input {
		max-width: 100%;
	}
	@media (max-width: 600px) {
		main {
			margin: 0;
			padding: 16px;
		}
		section {
			padding: 16px;
		}
	}
</style>
