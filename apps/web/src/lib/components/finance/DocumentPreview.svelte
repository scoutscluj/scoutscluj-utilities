<script lang="ts">
	import { resolve } from '$app/paths';
	import Modal from '$lib/components/ui/Modal.svelte';
	import PdfPagePreview from './PdfPagePreview.svelte';

	type Props = {
		documentId: number;
		filename: string;
		contentType: string;
		compact?: boolean;
		dense?: boolean;
	};

	let { documentId, filename, contentType, compact = false, dense = false }: Props = $props();
	let isOpen = $state(false);

	const lowerFilename = $derived(filename.toLowerCase());
	const fileUrl = $derived(resolve(`/finance/documents/${documentId}/file`));
	const previewUrl = $derived(`${fileUrl}?preview=1`);
	const isPdf = $derived(contentType === 'application/pdf' || lowerFilename.endsWith('.pdf'));
	const isImage = $derived(
		contentType.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/.test(lowerFilename)
	);
	const previewKind = $derived(isPdf ? 'pdf' : isImage ? 'image' : 'file');
</script>

<div class="preview-card" class:compact class:dense>
	<span class="preview-frame" aria-hidden="true">
		{#if previewKind === 'image'}
			<img src={previewUrl} alt="" loading="lazy" />
		{:else if previewKind === 'pdf'}
			<PdfPagePreview url={previewUrl} title={`Miniatură PDF pentru ${filename}`} />
			<span class="preview-badge">PDF</span>
		{:else}
			<span class="file-placeholder">Fișier</span>
		{/if}
	</span>
	<button
		type="button"
		class="preview-overlay"
		aria-label={`Previzualizează ${filename}`}
		onclick={() => (isOpen = true)}
	></button>
	{#if !dense}
		<span class="preview-label">Previzualizare</span>
	{/if}
</div>

<Modal
	wide
	bind:open={isOpen}
	title={`Previzualizare ${filename}`}
	description="Consultă documentul înainte de a continua."
>
	<div
		class="preview-body"
		class:image-preview={previewKind === 'image'}
		class:pdf-preview={previewKind === 'pdf'}
	>
		{#if previewKind === 'image'}
			<img src={previewUrl} alt={filename} />
		{:else if previewKind === 'pdf'}
			<PdfPagePreview url={previewUrl} title={`Previzualizare PDF pentru ${filename}`} />
		{:else}
			<div class="unsupported-preview">
				<p>Acest tip de fișier nu poate fi previzualizat în browser.</p>
				<a href={fileUrl}>Descarcă documentul</a>
			</div>
		{/if}
	</div>
</Modal>

<style>
	.preview-card {
		position: relative;
		width: 104px;
		display: grid;
		gap: 7px;
		color: var(--sc-ink);
		text-align: center;
	}

	.preview-card.compact {
		width: 76px;
		gap: 5px;
	}

	.preview-card.dense {
		width: 48px;
		gap: 0;
	}

	.preview-card:has(.preview-overlay:hover) .preview-frame,
	.preview-card:has(.preview-overlay:focus-visible) .preview-frame {
		border-color: var(--sc-accent-hover);
		box-shadow: 0 0 0 3px rgb(153 27 27 / 0.1);
	}

	.preview-overlay {
		position: absolute;
		inset: 0 0 24px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
	}

	.dense .preview-overlay {
		inset: 0;
		border-radius: 6px;
	}

	.preview-overlay:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}

	.preview-frame {
		position: relative;
		width: 104px;
		aspect-ratio: 0.78;
		display: grid;
		place-items: center;
		overflow: hidden;
		border: 1px solid var(--sc-border-strong);
		border-radius: 8px;
		background: var(--sc-canvas);
	}

	.compact .preview-frame {
		width: 76px;
	}

	.dense .preview-frame {
		width: 48px;
		border-radius: 6px;
	}

	.preview-frame img {
		width: 100%;
		height: 100%;
		border: 0;
		object-fit: contain;
		pointer-events: none;
	}

	.preview-badge,
	.file-placeholder {
		border-radius: 999px;
		background: rgb(0 0 0 / 0.78);
		padding: 4px 8px;
		color: var(--sc-on-accent);
		font-size: 0.72rem;
		font-weight: 600;
	}

	.preview-badge {
		position: absolute;
		right: 6px;
		bottom: 6px;
	}

	.dense .preview-badge {
		right: 3px;
		bottom: 3px;
		padding: 2px 5px;
		font-size: 0.58rem;
	}

	.preview-label {
		color: var(--sc-muted);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.compact .preview-label {
		font-size: 0.72rem;
	}

	.preview-body {
		height: min(620px, calc(100dvh - 220px));
		min-height: 200px;
		display: grid;
		background: var(--sc-inset);
	}

	.preview-body.image-preview,
	.preview-body.pdf-preview {
		place-items: center;
		overflow: auto;
		background: var(--sc-inset);
	}

	.preview-body img {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.unsupported-preview {
		place-self: center;
		display: grid;
		gap: 12px;
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 18px;
		text-align: center;
	}

	.unsupported-preview p {
		margin: 0;
		color: var(--sc-muted);
	}

	.unsupported-preview a {
		color: var(--sc-link);
		font-weight: 600;
	}
</style>
