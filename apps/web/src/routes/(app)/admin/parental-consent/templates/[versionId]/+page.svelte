<script lang="ts">
	import { resolve } from '$app/paths';
	import ParentalConsentTemplateEditor from '$lib/parental-consent/ParentalConsentTemplateEditor.svelte';
	import type { LayoutSettings, TemplateDocument } from '@scouts-cluj/parental-consent-schema';

	let { data, form } = $props();
	const initialDocument = () => structuredClone(data.template.document);
	const initialLayout = () => structuredClone(data.template.layout);
	const initialName = () => data.template.name;
	const initialUpdatedAt = () => data.template.updatedAt;
	let document = $state<TemplateDocument>(initialDocument());
	let layout = $state<LayoutSettings>(initialLayout());
	let name = $state(initialName());
	let dirty = $state(false);
	let expectedUpdatedAt = $state(initialUpdatedAt());
	const editable = $derived(data.template.status === 'draft');

	const documentChanged = (next: TemplateDocument) => {
		document = next;
		dirty = true;
	};
	const layoutChanged = () => (dirty = true);
	$effect(() => {
		if (form?.success && form.action === 'save') {
			dirty = false;
			if (form.updatedAt) expectedUpdatedAt = form.updatedAt;
		}
	});
</script>

<svelte:head><title>Template v{data.template.version} | Acord parental</title></svelte:head>

<section class="page">
	<header>
		<div>
			<a href={resolve('/admin/parental-consent')}>← Acorduri parentale</a>
			<h1>Template v{data.template.version}</h1>
			<p>{data.template.status} · schema {data.template.schemaVersion}</p>
		</div>
		<div class="actions">
			{#each ['lupisori', 'temerari', 'exploratori'] as branch (branch)}
				<a
					class="button secondary"
					target="_blank"
					href={resolve(`/admin/parental-consent/templates/${data.template.id}/preview/${branch}`)}
					>Preview {branch}</a
				>
			{/each}
			{#if data.isSuperAdmin && data.template.status !== 'active'}
				<form
					method="POST"
					action="?/activate"
					onsubmit={(event) =>
						!confirm('Activezi această versiune? Versiunea activă curentă va fi arhivată.') &&
						event.preventDefault()}
				>
					<button>Activează</button>
				</form>
			{/if}
		</div>
	</header>
	{#if dirty}<div class="notice warning">Ai modificări nesalvate.</div>{/if}
	{#if form?.message}<div class="notice error" role="alert">
			{form.message}
		</div>{:else if form?.success}<div class="notice success">Operațiunea a reușit.</div>{/if}

	<section class="settings">
		<label>Nume<input bind:value={name} oninput={layoutChanged} disabled={!editable} /></label>
		<label
			>Margine sus (mm)<input
				type="number"
				min="10"
				max="35"
				bind:value={layout.marginTopMm}
				oninput={layoutChanged}
				disabled={!editable}
			/></label
		>
		<label
			>Margine dreapta<input
				type="number"
				min="10"
				max="35"
				bind:value={layout.marginRightMm}
				oninput={layoutChanged}
				disabled={!editable}
			/></label
		>
		<label
			>Margine jos<input
				type="number"
				min="10"
				max="35"
				bind:value={layout.marginBottomMm}
				oninput={layoutChanged}
				disabled={!editable}
			/></label
		>
		<label
			>Margine stânga<input
				type="number"
				min="10"
				max="35"
				bind:value={layout.marginLeftMm}
				oninput={layoutChanged}
				disabled={!editable}
			/></label
		>
		<label
			>Font (pt)<input
				type="number"
				min="8"
				max="14"
				step="0.5"
				bind:value={layout.baseFontSizePt}
				oninput={layoutChanged}
				disabled={!editable}
			/></label
		>
	</section>

	{#if editable}
		<ParentalConsentTemplateEditor {document} assets={data.assets} onchange={documentChanged} />
	{:else}
		<div class="notice">
			Versiunile active sau arhivate sunt imuabile. Clonează versiunea din pagina de administrare
			pentru a o edita.
		</div>
		<pre>{JSON.stringify(document, null, 2)}</pre>
	{/if}

	{#if editable}
		<form method="POST" action="?/save" class="save-bar">
			<input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
			<input type="hidden" name="name" value={name} />
			<input type="hidden" name="document" value={JSON.stringify(document)} />
			<input type="hidden" name="layout" value={JSON.stringify(layout)} />
			<span>{dirty ? 'Modificări nesalvate' : 'Salvat'}</span><button disabled={!dirty}
				>Salvează draftul</button
			>
		</form>
	{/if}
</section>

<style>
	.page {
		display: grid;
		gap: 14px;
		max-width: 1280px;
		margin: 0 auto;
		color: #172033;
		padding-bottom: 70px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 14px;
	}
	header a {
		color: #991b1b;
		text-decoration: none;
		font-weight: 800;
	}
	h1 {
		margin: 6px 0 0;
	}
	header p {
		margin: 4px 0 0;
		color: #64748b;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
		justify-content: end;
	}
	button,
	.button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		border: 0;
		border-radius: 7px;
		background: #991b1b;
		padding: 7px 12px;
		color: #fff;
		font: inherit;
		font-weight: 850;
		text-decoration: none;
		cursor: pointer;
	}
	.button.secondary {
		border: 1px solid #cbd5e1;
		background: #fff;
		color: #334155;
		font-size: 0.84rem;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.settings {
		display: grid;
		grid-template-columns: 2fr repeat(5, 1fr);
		gap: 9px;
		border: 1px solid #dbe3ef;
		border-radius: 10px;
		background: #fff;
		padding: 12px;
	}
	label {
		display: grid;
		gap: 5px;
		color: #475569;
		font-size: 0.78rem;
		font-weight: 850;
	}
	input {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		padding: 8px;
		font: inherit;
	}
	.notice {
		border-radius: 8px;
		background: #f1f5f9;
		padding: 10px;
		color: #475569;
	}
	.notice.warning {
		background: #fff7ed;
		color: #9a3412;
	}
	.notice.error {
		background: #fef2f2;
		color: #991b1b;
	}
	.notice.success {
		background: #ecfdf5;
		color: #047857;
	}
	pre {
		max-height: 600px;
		overflow: auto;
		border-radius: 9px;
		background: #0f172a;
		padding: 14px;
		color: #e2e8f0;
	}
	.save-bar {
		position: sticky;
		bottom: 10px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.95);
		padding: 10px 12px;
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
	}
	@media (max-width: 950px) {
		header {
			display: grid;
		}
		.actions {
			justify-content: start;
		}
		.settings {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
