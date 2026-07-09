<script lang="ts">
	import { onMount, tick } from 'svelte';
	import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
	import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

	type Props = {
		url: string;
		title: string;
	};

	let { url, title }: Props = $props();
	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let isLoading = $state(true);
	let hasError = $state(false);

	onMount(() => {
		let disposed = false;
		let loadingTask: PDFDocumentLoadingTask | null = null;
		let renderTask: RenderTask | null = null;

		const renderFirstPage = async () => {
			try {
				await tick();
				await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

				const pdfjs = await import('pdfjs-dist');
				pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

				loadingTask = pdfjs.getDocument({ url });
				const pdfDocument = await loadingTask.promise;
				if (disposed) return;

				const page = await pdfDocument.getPage(1);
				if (disposed) return;

				const viewport = page.getViewport({ scale: 1 });
				const containerWidth = Math.max(1, container.clientWidth);
				const containerHeight = Math.max(1, container.clientHeight);
				const cssScale = Math.min(
					containerWidth / viewport.width,
					containerHeight / viewport.height
				);
				const outputScale = Math.min(window.devicePixelRatio || 1, 2);
				const renderViewport = page.getViewport({ scale: cssScale * outputScale });
				const cssWidth = viewport.width * cssScale;
				const cssHeight = viewport.height * cssScale;

				canvas.width = Math.max(1, Math.floor(renderViewport.width));
				canvas.height = Math.max(1, Math.floor(renderViewport.height));
				canvas.style.width = `${cssWidth}px`;
				canvas.style.height = `${cssHeight}px`;

				const canvasContext = canvas.getContext('2d');
				if (!canvasContext) {
					throw new Error('PDF canvas context is unavailable.');
				}

				renderTask = page.render({
					canvas,
					canvasContext,
					viewport: renderViewport
				});
				await renderTask.promise;
				renderTask = null;
				if (!disposed) {
					isLoading = false;
				}
			} catch (error) {
				if (!disposed && (error as { name?: string }).name !== 'RenderingCancelledException') {
					hasError = true;
					isLoading = false;
				}
			}
		};

		void renderFirstPage();

		return () => {
			disposed = true;
			renderTask?.cancel();
			void loadingTask?.destroy();
		};
	});
</script>

<div class="pdf-page-preview" bind:this={container}>
	{#if isLoading}
		<span class="preview-state" aria-hidden="true">PDF</span>
	{/if}
	{#if hasError}
		<span class="preview-state error" aria-hidden="true">PDF</span>
	{/if}
	<canvas bind:this={canvas} aria-label={title}></canvas>
</div>

<style>
	.pdf-page-preview {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: #e5e7eb;
	}

	canvas {
		display: block;
		max-width: 100%;
		max-height: 100%;
		background: #ffffff;
		box-shadow: 0 4px 16px rgb(15 23 42 / 0.18);
	}

	.preview-state {
		grid-area: 1 / 1;
		border-radius: 999px;
		background: rgb(15 23 42 / 0.78);
		padding: 4px 8px;
		color: #ffffff;
		font-size: 0.72rem;
		font-weight: 900;
	}

	.preview-state.error {
		background: #991b1b;
	}
</style>
