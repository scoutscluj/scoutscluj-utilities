<script lang="ts">
	import { onMount } from 'svelte';
	import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
	import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
	let { url }: { url: string } = $props();
	let container: HTMLDivElement, canvas: HTMLCanvasElement;
	let page = $state(1),
		count = $state(0),
		zoom = $state(1),
		loading = $state(true),
		error = $state('');
	let document: PDFDocumentProxy | undefined,
		task: PDFDocumentLoadingTask | undefined,
		renderTask: RenderTask | undefined;
	let disposed = false,
		rendering = false,
		pending = false;
	async function render() {
		if (!document || disposed) return;
		if (rendering) {
			pending = true;
			return;
		}
		rendering = true;
		try {
			const pdfPage = await document.getPage(page);
			if (disposed) return;
			const base = pdfPage.getViewport({ scale: 1 });
			const scale = (Math.max(1, container.clientWidth - 20) / base.width) * zoom;
			const density = Math.min(window.devicePixelRatio || 1, 2);
			const viewport = pdfPage.getViewport({ scale: scale * density });
			canvas.width = Math.ceil(viewport.width);
			canvas.height = Math.ceil(viewport.height);
			canvas.style.width = `${base.width * scale}px`;
			canvas.style.height = `${base.height * scale}px`;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Canvas unavailable');
			renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
			await renderTask.promise;
			if (!disposed) loading = false;
		} catch (reason) {
			if (!disposed && (reason as Error).name !== 'RenderingCancelledException')
				error = 'Previzualizarea nu a putut fi afișată. Poți descărca PDF-ul.';
		} finally {
			rendering = false;
			renderTask = undefined;
			if (pending && !disposed) {
				pending = false;
				void render();
			}
		}
	}
	$effect(() => {
		if (page && zoom && count) void render();
	});
	onMount(() => {
		void (async () => {
			try {
				const pdf = await import('pdfjs-dist');
				if (disposed) return;
				pdf.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
				task = pdf.getDocument({ url });
				document = await task.promise;
				if (!disposed) {
					count = document.numPages;
					void render();
				}
			} catch {
				if (!disposed) {
					error = 'PDF-ul nu a putut fi încărcat.';
					loading = false;
				}
			}
		})();
		const observer = new ResizeObserver(() => void render());
		observer.observe(container);
		return () => {
			disposed = true;
			observer.disconnect();
			renderTask?.cancel();
			void task?.destroy();
		};
	});
</script>

<div class="viewer" role="region" aria-label="Acord de participare fără date de participant">
	<div class="controls">
		<button
			type="button"
			aria-label="Pagina anterioară a acordului"
			disabled={page <= 1}
			onclick={() => page--}>←</button
		><label
			>Pagina <select bind:value={page} disabled={!count}
				>{#each Array.from({ length: count }, (_, i) => i + 1) as n (n)}<option value={n}
						>{n}</option
					>{/each}</select
			>
			din {count || '…'}</label
		><button
			type="button"
			aria-label="Pagina următoare a acordului"
			disabled={page >= count}
			onclick={() => page++}>→</button
		><button
			type="button"
			aria-label="Micșorează previzualizarea"
			disabled={zoom <= 1}
			onclick={() => (zoom = Math.max(1, zoom - 0.25))}>−</button
		><button
			type="button"
			aria-label="Mărește previzualizarea"
			disabled={zoom >= 2}
			onclick={() => (zoom = Math.min(2, zoom + 0.25))}>+</button
		>
	</div>
	{#if loading && !error}<p role="status">Se afișează documentul…</p>{/if}
	{#if error}<p role="alert">{error}</p>{/if}
	<div class="pages" bind:this={container}>
		<canvas bind:this={canvas} aria-label={`Pagina ${page} a acordului de participare`}></canvas>
	</div>
	<!-- This download uses a locally generated blob URL, not an application route. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={url} download="acord-previzualizare.pdf">Descarcă previzualizarea curentă</a>
</div>

<style>
	.viewer {
		min-width: 0;
		display: grid;
		gap: 8px;
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}
	button,
	select {
		min-height: 32px;
		border: 1px solid var(--sc-border);
		border-radius: 6px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 4px 8px;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	label {
		font-size: 12px;
	}
	select {
		max-width: 64px;
	}
	.pages {
		overflow: auto;
		max-height: 65vh;
		min-height: 100px;
		background: var(--sc-border);
		padding: 10px;
		box-sizing: border-box;
	}
	canvas {
		display: block;
		background: white;
	}
	p {
		font-size: 13px;
		margin: 0;
		color: var(--sc-muted);
	}
	a {
		color: var(--sc-accent);
		font-size: 12px;
	}
</style>
