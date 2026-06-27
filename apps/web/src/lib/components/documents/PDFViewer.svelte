<script lang="ts">
	import { asset } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import 'pdfjs-dist/web/pdf_viewer.css';
	import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
	import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
	import type {
		EventBus,
		PDFFindController,
		PDFLinkService,
		PDFViewer
	} from 'pdfjs-dist/web/pdf_viewer.mjs';

	type AssetPath = Parameters<typeof asset>[0];
	type Props = {
		url: AssetPath;
		title?: string;
	};

	type FindMatchesCount = {
		current: number;
		total: number;
	};

	type FindEvent = {
		source: PDFViewer;
		type: '' | 'again';
		query: string;
		phraseSearch: boolean;
		caseSensitive: boolean;
		entireWord: boolean;
		highlightAll: boolean;
		findPrevious: boolean;
		matchDiacritics: boolean;
	};

	let { url, title = 'Document PDF' }: Props = $props();

	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 3;
	const ZOOM_FACTOR = 1.15;

	let viewerContainer: HTMLDivElement;
	let viewerElement: HTMLDivElement;
	let searchInput = $state<HTMLInputElement>();
	let loadingTask: PDFDocumentLoadingTask | null = null;
	let eventBus: EventBus | null = null;
	let linkService: PDFLinkService | null = null;
	let findController: PDFFindController | null = null;
	let pdfViewer: PDFViewer | null = null;
	let disposed = false;

	let pageNumber = $state(1);
	let pageCount = $state(0);
	let zoomPercent = $state(100);
	let loadingPercent = $state<number | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let statusMessage = $state('Se încarcă documentul.');
	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchPending = $state(false);
	let searchNotFound = $state(false);
	let matchCount = $state<FindMatchesCount>({ current: 0, total: 0 });

	const documentUrl = $derived(asset(url));
	const downloadName = $derived(decodeURIComponent(url.split('/').pop() || 'document.pdf'));
	const loadingLabel = $derived(
		loadingPercent === null ? 'Se încarcă documentul…' : `Se încarcă documentul… ${loadingPercent}%`
	);
	const searchStatus = $derived.by(() => {
		if (!searchQuery.trim()) return 'Introdu textul căutat';
		if (searchPending) return 'Se caută…';
		if (searchNotFound) return 'Niciun rezultat';
		if (matchCount.total > 0) return `${matchCount.current} din ${matchCount.total}`;
		return '';
	});

	const updateZoomStatus = () => {
		if (!pdfViewer) return;
		zoomPercent = Math.round(pdfViewer.currentScale * 100);
	};

	const find = (findPrevious: boolean, type: '' | 'again') => {
		const query = searchQuery.trim();
		if (!eventBus || !pdfViewer || !query) {
			matchCount = { current: 0, total: 0 };
			searchNotFound = false;
			searchPending = false;
			return;
		}

		searchPending = true;
		searchNotFound = false;
		eventBus.dispatch('find', {
			source: pdfViewer,
			type,
			query,
			phraseSearch: true,
			caseSensitive: false,
			entireWord: false,
			highlightAll: true,
			findPrevious,
			matchDiacritics: true
		} satisfies FindEvent);
	};

	const handleSearchInput = () => {
		matchCount = { current: 0, total: 0 };
		if (searchQuery.trim()) {
			find(false, '');
		} else {
			searchNotFound = false;
			searchPending = false;
			eventBus?.dispatch('findbarclose', { source: pdfViewer });
		}
	};

	const showNextMatch = () => find(false, 'again');
	const showPreviousMatch = () => find(true, 'again');

	const handleSearchSubmit = () => {
		if (matchCount.total > 0) {
			showNextMatch();
		} else {
			find(false, '');
		}
	};

	const openSearch = async () => {
		searchOpen = true;
		await tick();
		searchInput?.focus();
		searchInput?.select();
	};

	const closeSearch = () => {
		searchOpen = false;
		eventBus?.dispatch('findbarclose', { source: pdfViewer });
	};

	const handleSearchKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSearch();
		}
	};

	const zoomOut = () => {
		if (!pdfViewer) return;
		pdfViewer.currentScale = Math.max(MIN_ZOOM, pdfViewer.currentScale / ZOOM_FACTOR);
		updateZoomStatus();
	};

	const zoomIn = () => {
		if (!pdfViewer) return;
		pdfViewer.currentScale = Math.min(MAX_ZOOM, pdfViewer.currentScale * ZOOM_FACTOR);
		updateZoomStatus();
	};

	const loadDocument = async () => {
		isLoading = true;
		errorMessage = null;
		loadingPercent = null;

		try {
			const pdfjs = await import('pdfjs-dist');
			(
				globalThis as typeof globalThis & {
					pdfjsLib: typeof pdfjs;
				}
			).pdfjsLib = pdfjs;
			const pdfjsViewer = await import('pdfjs-dist/web/pdf_viewer.mjs');
			if (disposed) return;

			pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
			eventBus = new pdfjsViewer.EventBus();
			linkService = new pdfjsViewer.PDFLinkService({ eventBus });
			findController = new pdfjsViewer.PDFFindController({
				eventBus,
				linkService,
				updateMatchesCountOnProgress: true
			});
			pdfViewer = new pdfjsViewer.PDFViewer({
				container: viewerContainer,
				viewer: viewerElement,
				eventBus,
				linkService,
				findController,
				removePageBorders: false
			});
			linkService.setViewer(pdfViewer);

			eventBus.on('pagesinit', () => {
				if (!pdfViewer || disposed) return;
				pdfViewer.currentScaleValue = 'page-width';
				updateZoomStatus();
				isLoading = false;
				statusMessage = `Document încărcat: ${pageCount} pagini.`;
			});
			eventBus.on('pagechanging', ({ pageNumber: currentPage }: { pageNumber: number }) => {
				pageNumber = currentPage;
				statusMessage = `Pagina ${pageNumber} din ${pageCount}.`;
			});
			eventBus.on('scalechanging', ({ scale }: { scale: number }) => {
				zoomPercent = Math.round(scale * 100);
			});
			eventBus.on(
				'updatefindmatchescount',
				({ matchesCount }: { matchesCount: FindMatchesCount }) => {
					matchCount = matchesCount;
					searchPending = false;
					searchNotFound = false;
				}
			);
			eventBus.on(
				'updatefindcontrolstate',
				({ state, matchesCount }: { state: number; matchesCount: FindMatchesCount }) => {
					matchCount = matchesCount;
					searchPending = state === 3;
					searchNotFound = state === 1;
					if (state !== 3 && matchesCount.total > 0) {
						statusMessage = `Rezultatul ${matchesCount.current} din ${matchesCount.total}.`;
					}
				}
			);

			loadingTask = pdfjs.getDocument({ url: documentUrl });
			loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
				if (!disposed && total > 0) {
					loadingPercent = Math.min(100, Math.round((loaded / total) * 100));
				}
			};

			const pdfDocument = await loadingTask.promise;
			if (disposed) {
				await loadingTask.destroy();
				return;
			}

			pageCount = pdfDocument.numPages;
			findController.setDocument(pdfDocument);
			linkService.setDocument(pdfDocument);
			pdfViewer.setDocument(pdfDocument);
		} catch (error) {
			if (!disposed) {
				console.error('PDF load error:', error);
				errorMessage =
					'Nu s-a putut încărca documentul PDF. Îl poți deschide sau descărca folosind legătura de mai jos.';
				statusMessage = 'Documentul PDF nu a putut fi încărcat.';
				isLoading = false;
			}
		}
	};

	onMount(() => {
		void loadDocument();

		return () => {
			disposed = true;
			eventBus?.dispatch('findbarclose', { source: pdfViewer });
			void loadingTask?.destroy();
		};
	});
</script>

<!-- Static files use SvelteKit's asset() helper instead of route resolve(). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<section class="pdf-viewer" aria-labelledby="pdf-viewer-title">
	<header class="viewer-header">
		<div>
			<p class="eyebrow">Document</p>
			<h1 id="pdf-viewer-title">{title}</h1>
		</div>

		<div class="header-actions">
			<button
				type="button"
				class:active={searchOpen}
				aria-expanded={searchOpen}
				aria-controls="pdf-search"
				onclick={() => (searchOpen ? closeSearch() : void openSearch())}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="11" cy="11" r="7"></circle>
					<path d="m20 20-4-4"></path>
				</svg>
				Caută
			</button>
			<a class="download-button" href={documentUrl} download={downloadName}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"></path>
				</svg>
				Descarcă
			</a>
		</div>
	</header>

	{#if searchOpen}
		<form
			id="pdf-search"
			class="search-bar"
			onsubmit={(event) => {
				event.preventDefault();
				handleSearchSubmit();
			}}
		>
			<label for="pdf-search-query">Caută în document</label>
			<div class="search-field">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="11" cy="11" r="7"></circle>
					<path d="m20 20-4-4"></path>
				</svg>
				<input
					id="pdf-search-query"
					bind:this={searchInput}
					bind:value={searchQuery}
					oninput={handleSearchInput}
					onkeydown={handleSearchKeydown}
					placeholder="Text de căutat"
					autocomplete="off"
				/>
			</div>
			<span class="search-status" aria-live="polite">{searchStatus}</span>
			<div class="match-actions">
				<button
					type="button"
					onclick={showPreviousMatch}
					disabled={matchCount.total === 0}
					aria-label="Rezultatul anterior">↑</button
				>
				<button
					type="button"
					onclick={showNextMatch}
					disabled={matchCount.total === 0}
					aria-label="Rezultatul următor">↓</button
				>
				<button
					type="button"
					class="close-search"
					onclick={closeSearch}
					aria-label="Închide căutarea">×</button
				>
			</div>
		</form>
	{/if}

	<div class="toolbar" aria-label="Comenzi document PDF">
		<span class="page-status" aria-label={`Pagina ${pageNumber} din ${pageCount || 'necunoscut'}`}>
			Pagina {pageNumber} din {pageCount || '—'}
		</span>
		<div class="zoom-controls">
			<button
				type="button"
				onclick={zoomOut}
				disabled={isLoading || zoomPercent <= MIN_ZOOM * 100}
				aria-label="Micșorează">−</button
			>
			<span aria-label={`Zoom ${zoomPercent}%`}>{zoomPercent}%</span>
			<button
				type="button"
				onclick={zoomIn}
				disabled={isLoading || zoomPercent >= MAX_ZOOM * 100}
				aria-label="Mărește">+</button
			>
		</div>
	</div>

	<p class="sr-only" aria-live="polite">{statusMessage}</p>

	<div class="viewer-frame" class:has-error={errorMessage !== null}>
		{#if isLoading}
			<div class="viewer-state" role="status">
				<span class="spinner" aria-hidden="true"></span>
				<p>{loadingLabel}</p>
			</div>
		{:else if errorMessage}
			<div class="viewer-state error" role="alert">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M12 8v5m0 4h.01M10.3 4.4 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.4a2 2 0 0 0-3.4 0Z"
					></path>
				</svg>
				<strong>Document indisponibil</strong>
				<p>{errorMessage}</p>
				<a href={documentUrl} download={downloadName}>Deschide documentul PDF</a>
			</div>
		{/if}

		<div
			class="viewer-container"
			class:hidden={errorMessage !== null}
			bind:this={viewerContainer}
			aria-label={`${title}, document cu ${pageCount} pagini`}
		>
			<div class="pdfViewer" bind:this={viewerElement}></div>
		</div>
	</div>
</section>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	.pdf-viewer {
		overflow: hidden;
		border: 1px solid #d8dee6;
		border-radius: 12px;
		background: #ffffff;
		box-shadow: 0 10px 28px rgb(15 23 42 / 0.08);
	}

	.viewer-header,
	.header-actions,
	.toolbar,
	.zoom-controls,
	.search-bar,
	.search-field,
	.match-actions,
	.download-button,
	button {
		display: flex;
		align-items: center;
	}

	.viewer-header {
		justify-content: space-between;
		gap: 20px;
		padding: 18px 20px;
	}

	.eyebrow {
		margin: 0;
		color: #64748b;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		margin: 4px 0 0;
		color: #17202a;
		font-size: clamp(1.2rem, 3vw, 1.55rem);
		line-height: 1.2;
	}

	.header-actions {
		gap: 8px;
	}

	.download-button,
	.header-actions button {
		gap: 8px;
		min-height: 40px;
		border-radius: 8px;
		padding: 0 14px;
		text-decoration: none;
		font-weight: 800;
	}

	.download-button {
		background: #17202a;
		color: #ffffff;
	}

	.download-button:hover {
		background: #2f3b47;
	}

	svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.search-bar {
		gap: 10px;
		border-top: 1px solid #e2e8f0;
		background: #fff7ed;
		padding: 10px 14px;
	}

	.search-bar > label {
		font-size: 0.82rem;
		font-weight: 900;
	}

	.search-field {
		position: relative;
		flex: 1;
		max-width: 440px;
	}

	.search-field svg {
		position: absolute;
		left: 10px;
		width: 17px;
		height: 17px;
		color: #64748b;
		pointer-events: none;
	}

	.search-field input {
		width: 100%;
		height: 38px;
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		background: #ffffff;
		padding: 0 10px 0 34px;
		font: inherit;
	}

	.search-status {
		min-width: 104px;
		color: #475569;
		font-size: 0.82rem;
		font-weight: 800;
		text-align: center;
	}

	.match-actions {
		gap: 5px;
	}

	.toolbar {
		justify-content: space-between;
		gap: 16px;
		border-block: 1px solid #e2e8f0;
		background: #f8fafc;
		padding: 10px 14px;
	}

	.zoom-controls {
		gap: 8px;
	}

	button {
		justify-content: center;
		min-height: 36px;
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		background: #ffffff;
		color: #263442;
		padding: 0 11px;
		font: inherit;
		font-size: 0.88rem;
		font-weight: 800;
		cursor: pointer;
	}

	button.active,
	button:hover:not(:disabled) {
		border-color: #64748b;
		background: #f1f5f9;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	button:focus-visible,
	.download-button:focus-visible,
	.viewer-state a:focus-visible,
	input:focus-visible {
		outline: 3px solid rgb(200 30 30 / 0.35);
		outline-offset: 2px;
	}

	.page-status,
	.zoom-controls span {
		color: #475569;
		font-variant-numeric: tabular-nums;
		font-size: 0.88rem;
		font-weight: 800;
	}

	.zoom-controls span {
		min-width: 58px;
		text-align: center;
	}

	.zoom-controls button,
	.match-actions button {
		width: 36px;
		padding: 0;
		font-size: 1.05rem;
	}

	.close-search {
		margin-left: 3px;
		font-size: 1.25rem;
	}

	.viewer-frame {
		position: relative;
		min-height: min(72vh, 820px);
		background: #dfe5eb;
	}

	.viewer-frame.has-error {
		display: grid;
		place-items: center;
	}

	.viewer-container {
		position: absolute;
		inset: 0;
		overflow: auto;
	}

	.viewer-container.hidden {
		display: none;
	}

	.viewer-container :global(.pdfViewer) {
		padding-block: 16px;
	}

	.viewer-container :global(.pdfViewer .page) {
		margin: 0 auto 16px;
		border: 0;
		box-shadow: 0 5px 18px rgb(15 23 42 / 0.18);
	}

	.viewer-container :global(.textLayer .highlight) {
		background-color: rgb(250 204 21 / 0.7);
	}

	.viewer-container :global(.textLayer .highlight.selected) {
		background-color: rgb(249 115 22 / 0.85);
	}

	.viewer-state {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 10px;
		padding: 28px;
		background: #e9eef3;
		color: #475569;
		text-align: center;
	}

	.viewer-state p {
		max-width: 540px;
		margin: 0;
	}

	.viewer-state.error {
		position: static;
		color: #7f1d1d;
	}

	.viewer-state.error svg {
		width: 34px;
		height: 34px;
	}

	.viewer-state.error a {
		margin-top: 6px;
		border-radius: 8px;
		background: #991b1b;
		color: #ffffff;
		padding: 10px 14px;
		text-decoration: none;
		font-weight: 800;
	}

	.spinner {
		width: 30px;
		height: 30px;
		border: 3px solid #cbd5e1;
		border-top-color: #c81e1e;
		border-radius: 999px;
		animation: spin 700ms linear infinite;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		clip-path: inset(50%);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 720px) {
		.viewer-header {
			align-items: flex-start;
			padding: 15px;
		}

		.header-actions button,
		.download-button {
			width: 40px;
			padding: 0;
			font-size: 0;
		}

		.search-bar {
			align-items: stretch;
			flex-wrap: wrap;
		}

		.search-bar > label {
			width: 100%;
		}

		.search-field {
			max-width: none;
			min-width: 180px;
		}

		.search-status {
			order: 3;
			flex: 1;
			min-width: 100px;
			text-align: left;
		}

		.match-actions {
			margin-left: auto;
		}

		.viewer-frame {
			min-height: 68vh;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 1400ms;
		}
	}
</style>
