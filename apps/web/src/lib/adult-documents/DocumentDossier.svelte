<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import DocumentBadge from './DocumentBadge.svelte';
	import DocumentGuidance from './DocumentGuidance.svelte';
	import {
		currentDocument,
		documentKinds,
		documentLabels,
		documentDate,
		yearLabel,
		type Dossier,
		type DocumentKind,
		type DocumentVersion
	} from './types';
	let {
		open = $bindable(false),
		memberId,
		name,
		initialYear,
		onchanged
	}: {
		open?: boolean;
		memberId: string;
		name: string;
		initialYear: number;
		onchanged?: () => void | Promise<void>;
	} = $props();
	let year = $state(0);
	let dossier = $state<Dossier | null>(null);
	let loading = $state(false);
	let busy = $state(false);
	let message = $state('');
	let success = $state('');
	let loadFailed = $state(false);
	let rejecting = $state('');
	let reason = $state('');
	let generation = 0;
	const dossierKey = $derived(`${memberId}:${initialYear}`);
	const years = $derived(
		dossier
			? Array.from({ length: dossier.currentYear - 1999 }, (_, i) => dossier!.currentYear - i)
			: [year || initialYear]
	);
	const path = (suffix: string) => resolve(`/adult-documents/${suffix}`);

	async function load(id: string, selectedYear: number) {
		const requestId = ++generation;
		loading = true;
		message = '';
		loadFailed = false;
		dossier = null;
		rejecting = '';
		try {
			const response = await fetch(`${path(`members/${id}`)}?year=${selectedYear}`, {
				cache: 'no-store'
			});
			if (!response.ok) throw new Error(await responseMessage(response));
			const value = (await response.json()) as Dossier;
			if (requestId === generation) {
				dossier = value;
				return true;
			}
		} catch {
			if (requestId === generation) {
				success = '';
				loadFailed = true;
				message = 'Situația documentului nu a putut fi încărcată. Încearcă din nou.';
			}
		} finally {
			if (requestId === generation) loading = false;
		}
		return false;
	}
	$effect(() => {
		if (open && dossierKey) {
			untrack(() => {
				year = initialYear;
				success = '';
				void load(memberId, initialYear);
			});
		}
		return () => {
			generation++;
		};
	});
	async function responseMessage(response: Response) {
		const body = await response.json().catch(() => ({}));
		return typeof body.message === 'string'
			? body.message
			: 'Operațiunea nu a reușit. Încearcă din nou.';
	}
	async function submit(
		suffix: string,
		body: unknown,
		notice: string,
		targetMemberId = memberId,
		targetYear = year
	) {
		const response = await fetch(path(suffix), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!response.ok) throw new Error(await responseMessage(response));
		if (open && memberId === targetMemberId && year === targetYear) {
			const loaded = await load(targetMemberId, targetYear);
			if (loaded) success = notice;
			else if (open && memberId === targetMemberId && year === targetYear)
				message =
					'Salvarea a reușit, dar situația documentului nu a putut fi actualizată. Nu este nevoie să încarci din nou fișierul. Apasă „Încearcă din nou” pentru a vedea starea actualizată.';
		}
		await onchanged?.();
	}
	async function upload(event: Event, kind: DocumentKind) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const targetMemberId = memberId;
		const targetYear = year;
		message = '';
		success = '';
		if (
			!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) ||
			file.size === 0 ||
			file.size > 10 * 1024 * 1024
		) {
			message = 'Alege un fișier PDF, JPG sau PNG de maximum 10 MB.';
			input.value = '';
			return;
		}
		busy = true;
		try {
			const contentBase64 = await new Promise<string>((accept, reject) => {
				const reader = new FileReader();
				reader.onload = () => accept(String(reader.result).split(',')[1]);
				reader.onerror = () => reject(new Error('Fișierul nu a putut fi citit.'));
				reader.readAsDataURL(file);
			});
			await submit(
				`members/${targetMemberId}`,
				{ year: targetYear, kind, filename: file.name, contentType: file.type, contentBase64 },
				'Document încărcat. Așteaptă verificarea unui administrator.',
				targetMemberId,
				targetYear
			);
		} catch (error) {
			message = error instanceof Error ? error.message : 'Documentul nu a putut fi încărcat.';
		} finally {
			busy = false;
			input.value = '';
		}
	}
	async function review(document: DocumentVersion, status: 'validated' | 'rejected') {
		message = '';
		success = '';
		if (status === 'rejected' && !reason.trim()) {
			message = 'Completează motivul respingerii.';
			return;
		}
		busy = true;
		try {
			await submit(
				`versions/${document.id}/review`,
				{ status, reason },
				status === 'validated'
					? 'Document validat.'
					: 'Document respins. Motivul este vizibil membrului.'
			);
			reason = '';
			rejecting = '';
		} catch (error) {
			message = error instanceof Error ? error.message : 'Verificarea nu a putut fi salvată.';
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open title="Documente adulți" description={name}>
	<div class="dossier">
		<div class="year-row">
			<label
				>An cercetășesc<select
					aria-label="An cercetășesc"
					bind:value={year}
					disabled={busy || loading}
					onchange={() => {
						success = '';
						void load(memberId, year);
					}}
				>
					{#each years as value (value)}<option {value}>{yearLabel(value)}</option>{/each}
				</select></label
			>
			{#if dossier}<span class="coverage"
					>{dossier.complete
						? 'Certificat validat pentru acest an'
						: 'Certificat de integritate comportamentală'}</span
				>{/if}
		</div>
		{#if message}<div class="feedback error" role="alert">
				{message}{#if loadFailed}<button
						type="button"
						disabled={busy || loading}
						onclick={() => load(memberId, year)}>Încearcă din nou</button
					>{/if}
			</div>{/if}
		{#if success}<p class="feedback success" role="status">{success}</p>{/if}
		{#if loading}<p role="status" class="muted">Se încarcă dosarul…</p>
		{:else if dossier}
			{#each documentKinds as kind (kind)}
				{@const document = currentDocument(dossier.documents, kind)}
				{@const history = dossier.documents.filter((d) => d.kind === kind && d.id !== document?.id)}
				<section class="document-slot" aria-label={documentLabels[kind]}>
					<header>
						<h3>{documentLabels[kind]}</h3>
						<DocumentBadge status={document?.status ?? 'missing'} />
					</header>
					{#if document}
						<a class="filename" href={path(`versions/${document.id}/download`)} download
							>{document.filename} ↓</a
						>
						<p class="metadata">
							Versiunea {document.version} · {(document.size / 1024 / 1024).toLocaleString(
								'ro-RO',
								{ maximumFractionDigits: 2 }
							)} MB
						</p>
						<p class="metadata">
							Încărcat de {document.uploaderName} · {documentDate(document.uploadedAt)}
						</p>
						{#if document.reviewedAt}<p class="metadata">
								Verificat de {document.reviewerName} · {documentDate(document.reviewedAt)}
							</p>{/if}
						{#if document.rejectionReason}<p class="rejection">
								<strong>Motivul respingerii:</strong>
								{document.rejectionReason}
							</p>{/if}
					{:else}<p class="muted">Încarcă documentul pentru anul {yearLabel(year)}.</p>{/if}
					<label class="upload-label" for={`document-${kind}`}
						>{document ? 'Înlocuiește documentul' : 'Încarcă documentul'}</label
					>
					<input
						id={`document-${kind}`}
						aria-label={`${document ? 'Înlocuiește' : 'Încarcă'} ${documentLabels[kind]}`}
						type="file"
						accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
						disabled={busy || loading || dossier.eligible !== true}
						onchange={(event) => upload(event, kind)}
					/>
					{#if document}<p class="metadata">
							Înlocuirea păstrează versiunea veche și necesită o nouă verificare.
						</p>{/if}
					{#if dossier.canReview && document?.status === 'pending'}
						<div class="review-actions">
							<button
								class="primary"
								type="button"
								disabled={busy}
								onclick={() => review(document, 'validated')}>Validează documentul</button
							><button
								type="button"
								disabled={busy}
								onclick={() => {
									rejecting = document.id;
									reason = '';
								}}>Respinge</button
							>
						</div>
						{#if rejecting === document.id}<form
								onsubmit={(event) => {
									event.preventDefault();
									void review(document, 'rejected');
								}}
							>
								<label for={`reason-${kind}`}
									>Motivul respingerii <span class="metadata">(vizibil membrului)</span></label
								>
								<textarea
									id={`reason-${kind}`}
									bind:value={reason}
									required
									maxlength="2000"
									disabled={busy}
									rows="3"
								></textarea>
								<div class="review-actions">
									<button type="submit" class="primary" disabled={busy}>Confirmă respingerea</button
									><button type="button" disabled={busy} onclick={() => (rejecting = '')}
										>Anulează</button
									>
								</div>
							</form>{/if}
					{/if}
					{#if history.length}<details class="history">
							<summary>Versiuni anterioare ({history.length})</summary>
							{#each history as previous (previous.id)}<div class="history-version">
									<div>
										<a href={path(`versions/${previous.id}/download`)} download
											>Versiunea {previous.version} · {previous.filename} ↓</a
										><DocumentBadge status={previous.status} />
									</div>
									<p class="metadata">
										Încărcat de {previous.uploaderName} · {documentDate(previous.uploadedAt)}
									</p>
									{#if previous.reviewedAt}<p class="metadata">
											Verificat de {previous.reviewerName} · {documentDate(previous.reviewedAt)}
										</p>{/if}
									{#if previous.rejectionReason}<p class="rejection">
											{previous.rejectionReason}
										</p>{/if}
								</div>{/each}
						</details>{/if}
				</section>
			{/each}
		{/if}
		{#if busy}<p role="status" class="muted">Se salvează…</p>{/if}
		<p class="privacy">
			PDF, JPG sau PNG · maximum 10 MB per document. Acces doar pentru titular și administratorii
			centrali.
		</p>
		<DocumentGuidance />
	</div>
</Modal>

<style>
	.dossier {
		display: grid;
		gap: 16px;
	}
	.year-row {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
	}
	label {
		display: grid;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
	}
	select,
	textarea {
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-inset);
		color: var(--sc-ink);
		padding: 9px 10px;
		font: inherit;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
	}
	.coverage {
		max-width: 220px;
		font-size: 12px;
		color: var(--sc-muted);
		text-align: right;
	}
	.document-slot {
		padding: 16px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		min-width: 0;
	}
	header {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}
	h3 {
		margin: 2px 0 0;
		font-size: 15px;
		font-weight: 600;
		line-height: 1.4;
	}
	a {
		color: var(--sc-accent);
		overflow-wrap: anywhere;
		font-size: 13px;
	}
	.filename {
		display: block;
		font-size: 14px;
		margin-bottom: 6px;
	}
	.metadata {
		color: var(--sc-muted);
		font-size: 12px;
		font-weight: 400;
		margin: 6px 0;
		line-height: 1.5;
	}
	.muted,
	.privacy {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--sc-muted);
	}
	.upload-label {
		margin: 14px 0 8px;
	}
	input[type='file'] {
		width: 100%;
		font: inherit;
		font-size: 13px;
		color: var(--sc-muted);
	}
	input::file-selector-button,
	button {
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		min-height: 38px;
		padding: 8px 12px;
		border-radius: 7px;
		border: 1px solid var(--sc-border-strong);
		color: var(--sc-ink);
		background: var(--sc-surface);
		cursor: pointer;
	}
	input::file-selector-button {
		margin-right: 8px;
	}
	button.primary {
		background: var(--sc-accent);
		border-color: var(--sc-accent);
		color: white;
	}
	button:hover {
		filter: brightness(0.96);
	}
	button:disabled,
	input:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	textarea:focus-visible,
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.review-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}
	form {
		display: grid;
		gap: 8px;
		margin-top: 14px;
	}
	form .review-actions {
		margin-top: 0;
	}
	.rejection,
	.feedback {
		border-radius: 7px;
		padding: 10px 12px;
		font-size: 13px;
		line-height: 1.5;
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
	.rejection,
	.error {
		background: var(--sc-accent-soft);
		color: var(--sc-accent);
	}
	.feedback {
		margin: 0;
	}
	.feedback button {
		display: block;
		margin-top: 8px;
	}
	.success {
		background: var(--sc-success-soft, #edf7ef);
		color: var(--sc-success, #27633b);
	}
	.history {
		margin-top: 16px;
		font-size: 13px;
	}
	summary {
		cursor: pointer;
		color: var(--sc-muted);
		padding: 6px 0;
	}
	.history-version {
		margin-top: 8px;
		padding-top: 10px;
		border-top: 1px solid var(--sc-border);
	}
	.history-version > div {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	@media (max-width: 480px) {
		header {
			flex-wrap: wrap;
		}
		.document-slot {
			padding: 12px;
		}
		.coverage {
			max-width: 140px;
		}
	}
</style>
