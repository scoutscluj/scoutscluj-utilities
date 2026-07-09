<script lang="ts">
	import { resolve } from '$app/paths';

	type Props = {
		documentId: number;
		filename: string;
		contentType: string;
		compact?: boolean;
	};

	let { documentId, filename, contentType, compact = false }: Props = $props();
	let isOpen = $state(false);

	const lowerFilename = $derived(filename.toLowerCase());
	const fileUrl = $derived(resolve(`/finance/documents/${documentId}/file`));
	const previewUrl = $derived(`${fileUrl}?preview=1`);
	const isPdf = $derived(contentType === 'application/pdf' || lowerFilename.endsWith('.pdf'));
	const isImage = $derived(
		contentType.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/.test(lowerFilename)
	);
	const pdfPreviewUrl = $derived(`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1`);
	const previewKind = $derived(isPdf ? 'pdf' : isImage ? 'image' : 'file');

	const closePreview = () => {
		isOpen = false;
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (isOpen && event.key === 'Escape') {
			closePreview();
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="preview-card" class:compact>
	<span class="preview-frame" aria-hidden="true">
		{#if previewKind === 'image'}
			<img src={previewUrl} alt="" loading="lazy" />
		{:else if previewKind === 'pdf'}
			<iframe src={pdfPreviewUrl} title={`Miniatură PDF pentru ${filename}`} loading="lazy"
			></iframe>
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
	<span class="preview-label">Previzualizare</span>
</div>

{#if isOpen}
	<div class="preview-backdrop">
		<button
			type="button"
			class="backdrop-close"
			aria-label="Închide previzualizarea"
			onclick={closePreview}
		></button>
		<div
			class="preview-dialog"
			role="dialog"
			aria-modal="true"
			aria-label={`Previzualizare ${filename}`}
		>
			<header>
				<p>{filename}</p>
				<button
					type="button"
					class="close-button"
					aria-label="Închide previzualizarea"
					onclick={closePreview}
				>
					×
				</button>
			</header>

			<div class="preview-body">
				{#if previewKind === 'image'}
					<img src={previewUrl} alt={filename} />
				{:else if previewKind === 'pdf'}
					<iframe src={pdfPreviewUrl} title={`Previzualizare PDF pentru ${filename}`}></iframe>
				{:else}
					<div class="unsupported-preview">
						<p>Acest tip de fișier nu poate fi previzualizat în browser.</p>
						<a href={fileUrl}>Descarcă documentul</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.preview-card {
		position: relative;
		width: 104px;
		display: grid;
		gap: 7px;
		color: #334155;
		text-align: center;
	}

	.preview-card.compact {
		width: 76px;
		gap: 5px;
	}

	.preview-card:has(.preview-overlay:hover) .preview-frame,
	.preview-card:has(.preview-overlay:focus-visible) .preview-frame {
		border-color: #991b1b;
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

	.preview-overlay:focus-visible {
		outline: 3px solid rgb(153 27 27 / 0.18);
		outline-offset: 2px;
	}

	.preview-frame {
		position: relative;
		width: 104px;
		aspect-ratio: 0.78;
		display: grid;
		place-items: center;
		overflow: hidden;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #f8fafc;
	}

	.compact .preview-frame {
		width: 76px;
	}

	.preview-frame img,
	.preview-frame iframe {
		width: 100%;
		height: 100%;
		border: 0;
		object-fit: cover;
		pointer-events: none;
	}

	.preview-badge,
	.file-placeholder {
		border-radius: 999px;
		background: rgb(15 23 42 / 0.78);
		padding: 4px 8px;
		color: #ffffff;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.preview-badge {
		position: absolute;
		right: 6px;
		bottom: 6px;
	}

	.preview-label {
		color: #475569;
		font-size: 0.78rem;
		font-weight: 850;
	}

	.compact .preview-label {
		font-size: 0.72rem;
	}

	.preview-backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		background: rgb(15 23 42 / 0.58);
		padding: 22px;
	}

	.backdrop-close {
		position: absolute;
		inset: 0;
		border: 0;
		background: transparent;
		cursor: default;
	}

	.preview-dialog {
		position: relative;
		width: min(1040px, 100%);
		height: min(760px, calc(100vh - 44px));
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.28);
	}

	header {
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-bottom: 1px solid #d8dee6;
		padding: 12px 14px;
	}

	header p {
		min-width: 0;
		margin: 0;
		overflow: hidden;
		color: #0f172a;
		font-weight: 900;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.close-button {
		width: 36px;
		height: 36px;
		flex: 0 0 auto;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		color: #334155;
		font-size: 1.35rem;
		line-height: 1;
		cursor: pointer;
	}

	.preview-body {
		min-height: 0;
		display: grid;
		background: #0f172a;
	}

	.preview-body img,
	.preview-body iframe {
		width: 100%;
		height: 100%;
		border: 0;
		object-fit: contain;
	}

	.unsupported-preview {
		place-self: center;
		display: grid;
		gap: 12px;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		text-align: center;
	}

	.unsupported-preview p {
		margin: 0;
		color: #475569;
	}

	.unsupported-preview a {
		color: #2563eb;
		font-weight: 900;
	}
</style>
