<script lang="ts">
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import DocumentBadge from '$lib/adult-documents/DocumentBadge.svelte';
	import DocumentDossier from '$lib/adult-documents/DocumentDossier.svelte';
	import { yearLabel, type DocumentWorkspace } from '$lib/adult-documents/types';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	let search = $state('');
	let status = $state('');
	let page = $state(0);
	let pageSize = $state(25);
	let descending = $state(false);
	let selected = $state<DocumentWorkspace['rows'][number] | null>(null);
	let open = $state(false);
	const rows = $derived(
		data.workspace.rows
			.filter(
				(row) =>
					matchesSearch(row.name, search) && (!status || row.statuses.some((s) => s === status))
			)
			.sort((a, b) => (descending ? -1 : 1) * a.name.localeCompare(b.name, 'ro'))
	);
	const size = $derived(pageSize || Math.max(1, rows.length));
	const activePage = $derived(Math.min(page, Math.max(0, Math.ceil(rows.length / size) - 1)));
	const visible = $derived(rows.slice(activePage * size, (activePage + 1) * size));
	const years = $derived(
		Array.from(
			{ length: data.workspace.currentYear - 1999 },
			(_, i) => data.workspace.currentYear - i
		)
	);
	async function changeYear(event: Event) {
		const year = (event.currentTarget as HTMLSelectElement).value;
		page = 0;
		await goto(resolve(`/admin/adult-documents?year=${year}`), {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head><title>Documente adulți | Scouts Cluj Utilities</title></svelte:head>

<section class="documents-page" aria-labelledby="adult-documents-heading">
	<header>
		<h1 id="adult-documents-heading">Documente adulți</h1>
		<p>Dosarele membrilor de minimum 18 ani · anul cercetășesc {yearLabel(data.workspace.year)}</p>
	</header>
	{#if data.workspace.unknownBirthDates}<aside class="notice">
			{data.workspace.unknownBirthDates} membri activi nu au o dată de naștere validă.
			<a href={resolve('/units')}>Completează datele în lista membrilor</a> pentru a stabili documentele
			necesare.
		</aside>{/if}
	<TableToolbar>
		{#snippet filters()}
			<label
				>Caută membru<input
					type="search"
					placeholder="Numele membrului"
					bind:value={search}
					oninput={() => (page = 0)}
				/></label
			>
			<label
				>An cercetășesc<select
					aria-label="An cercetășesc"
					value={data.workspace.year}
					onchange={changeYear}
					>{#each years as year (year)}<option value={year}>{yearLabel(year)}</option
						>{/each}</select
				></label
			>

			<label
				>Documente<select
					aria-label="Starea documentelor"
					bind:value={status}
					onchange={() => (page = 0)}
					><option value="">Toate stările</option><option value="missing">Lipsă</option><option
						value="pending">În verificare</option
					><option value="validated">Validate</option><option value="rejected">Respinse</option
					></select
				></label
			>
		{/snippet}
	</TableToolbar>
	<div class="table-scroll">
		<table use:highlightSearch={search}>
			<thead
				><tr
					><th aria-sort={descending ? 'descending' : 'ascending'}
						><button class="sort" type="button" onclick={() => (descending = !descending)}
							>Membru {descending ? '↓' : '↑'}</button
						></th
					><th>Integritate comportamentală (CIC)</th><th><span class="sr-only">Acțiuni</span></th
					></tr
				></thead
			>
			<tbody
				>{#each visible as row (row.memberId)}<tr>
						<td
							><strong>{row.name}</strong><span class="structure"
								>{row.structureId === 'floresti' ? 'Florești' : 'Cluj'}</span
							></td
						>
						<td><DocumentBadge status={row.statuses[0]} /></td>
						<td
							><button
								class="open-dossier"
								type="button"
								aria-label={`Deschide dosarul: ${row.name}`}
								onclick={() => {
									selected = row;
									open = true;
								}}>Deschide dosarul</button
							></td
						>
					</tr>{:else}<tr
						><td colspan="3" class="empty"
							>{data.workspace.rows.length
								? 'Niciun membru nu corespunde filtrelor selectate.'
								: 'Nu există membri activi de minimum 18 ani cu data nașterii înregistrată.'}</td
						></tr
					>{/each}</tbody
			>
		</table>
	</div>
	<TablePagination
		bind:page
		bind:pageSize
		total={rows.length}
		loadedTotal={data.workspace.loadedTotal}
		label="Paginile documentelor adulților"
	/>
	<p class="access-note">
		Fișierele sunt accesibile doar titularului și administratorilor centrali. Accesările și
		verificările sunt înregistrate în jurnalul de audit.
	</p>
</section>

{#if selected}<DocumentDossier
		bind:open
		memberId={selected.memberId}
		name={selected.name}
		initialYear={data.workspace.year}
		onchanged={() => invalidate('app:adult-documents')}
	/>{/if}

<style>
	.documents-page {
		display: grid;
		gap: 20px;
	}
	h1 {
		margin: 0;
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	header p {
		margin: 8px 0 0;
		color: var(--sc-muted);
		font-size: 14px;
	}
	label {
		display: grid;
		gap: 6px;
		color: var(--sc-muted);
		font-size: 12px;
	}
	input,
	select {
		min-height: 36px;
		box-sizing: border-box;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		padding: 7px 10px;
		background: var(--sc-inset);
		color: var(--sc-ink);
		font: inherit;
		font-size: 13px;
	}
	input {
		min-width: 200px;
	}
	.table-scroll {
		overflow-x: auto;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	th,
	td {
		text-align: left;
		padding: 14px 16px;
		border-bottom: 1px solid var(--sc-border);
	}
	th {
		color: var(--sc-muted);
		font-size: 12px;
		font-weight: 500;
		background: var(--sc-inset);
		white-space: nowrap;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	strong {
		font-weight: 500;
	}
	.structure {
		display: block;
		margin-top: 5px;
		color: var(--sc-muted);
		font-size: 12px;
	}
	.sort {
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		padding: 0;
		min-height: 36px;
		cursor: pointer;
	}
	.open-dossier {
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 8px 12px;
		min-height: 38px;
		font: inherit;
		font-size: 13px;
		white-space: nowrap;
		cursor: pointer;
	}
	.open-dossier:hover {
		background: var(--sc-inset);
		color: var(--sc-accent);
	}
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.empty {
		text-align: center;
		padding: 36px 16px;
		color: var(--sc-muted);
	}
	.notice {
		border-radius: 7px;
		background: var(--sc-inset);
		color: var(--sc-muted);
		padding: 12px 16px;
		font-size: 13px;
		line-height: 1.6;
	}
	a {
		color: var(--sc-accent);
	}
	.access-note {
		margin: 0;
		font-size: 12px;
		color: var(--sc-muted);
		line-height: 1.6;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	@media (max-width: 650px) {
		h1 {
			font-size: 26px;
		}
		th,
		td {
			padding: 12px;
		}
		input {
			min-width: 160px;
		}
	}
</style>
