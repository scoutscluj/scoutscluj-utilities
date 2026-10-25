<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FileCheck from '@lucide/svelte/icons/file-check';
	import DocumentDossier from './DocumentDossier.svelte';
	import DocumentBadge from './DocumentBadge.svelte';
	import {
		currentDocument,
		documentKinds,
		documentLabels,
		yearLabel,
		type MineDocuments
	} from './types';
	let { documents }: { documents: MineDocuments | null } = $props();
	let open = $state(false);
	const dossier = $derived(documents?.dossier);
	const missingCertificate = $derived(
		!!dossier && !currentDocument(dossier.documents, 'behavioural_integrity')
	);
</script>

{#if documents?.eligible !== false}
	<section class="adult-summary" aria-labelledby="adult-documents-title">
		<header>
			<div class="title">
				<FileCheck size={20} aria-hidden="true" />
				<h2 id="adult-documents-title">Documente adulți</h2>
			</div>
			{#if dossier}<button
					class:primary={missingCertificate}
					type="button"
					onclick={() => (open = true)}
					>{missingCertificate ? 'Adaugă document' : 'Deschide dosarul'}</button
				>{/if}
		</header>
		{#if dossier}
			<p class="summary-copy">
				An cercetășesc {yearLabel(dossier.year)}{dossier.complete ? ' · Dosar complet' : ''}
			</p>
			<div class="slots">
				{#each documentKinds as kind (kind)}<div>
						<span>{documentLabels[kind]}</span><DocumentBadge
							status={currentDocument(dossier.documents, kind)?.status ?? 'missing'}
						/>
					</div>{/each}
			</div>
			<DocumentDossier
				bind:open
				memberId={dossier.memberId}
				name={dossier.name}
				initialYear={dossier.year}
				onchanged={() => invalidate('app:adult-documents')}
			/>
		{:else if documents?.reason === 'birth_date_missing'}<p class="summary-copy">
				Data nașterii nu este înregistrată. Cere unui administrator să o completeze pentru a stabili
				documentele necesare.
			</p>
		{:else if documents?.reason === 'member_not_found'}<p class="summary-copy">
				Profilul tău nu este încă asociat unui membru. Cere ajutorul unui administrator.
			</p>
		{:else}<p class="summary-copy" role="status">
				Situația documentelor nu este disponibilă momentan.
			</p>
			<button type="button" onclick={() => invalidate('app:adult-documents')}
				>Încearcă din nou</button
			>{/if}
	</section>
{/if}

<style>
	.adult-summary {
		width: 100%;
		max-width: 680px;
		box-sizing: border-box;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		padding: 16px;
		margin-top: 24px;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.title {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--sc-accent);
	}
	h2 {
		color: var(--sc-ink);
		font-size: 18px;
		font-weight: 600;
		margin: 0;
	}
	button {
		min-height: 38px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-inset);
	}
	button.primary {
		background: var(--sc-accent);
		border-color: var(--sc-accent);
		color: white;
	}
	button.primary:hover {
		background: var(--sc-accent-hover);
	}
	button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.summary-copy {
		color: var(--sc-muted);
		font-size: 13px;
		line-height: 1.6;
		margin: 8px 0 12px;
	}
	.slots {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px 24px;
	}
	.slots > div {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 12px;
		font-size: 14px;
	}
	@media (max-width: 700px) {
		.slots {
			grid-template-columns: 1fr;
		}
		.adult-summary {
			padding: 16px;
		}
	}
</style>
