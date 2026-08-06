<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import {
		Boxes,
		Check,
		Edit3,
		Image as ImageIcon,
		Plus,
		RotateCcw,
		Search,
		Trash2,
		Upload,
		X
	} from '@lucide/svelte';
	import type { InventoryItem, InventoryOption } from './+page.server';
	import type { PageProps } from './$types';

	type Draft = {
		id: string;
		name: string;
		quantity: number;
		category: string;
		subcategory: string;
		owner: string;
		locationDescription: string;
		condition: string;
		isConsumable: boolean;
		notes: string;
		removeImage: boolean;
		imageUrl: string;
	};

	type ColumnKey =
		| 'quantity'
		| 'category'
		| 'subcategory'
		| 'isConsumable'
		| 'owner'
		| 'locationDescription'
		| 'condition'
		| 'notes'
		| 'createdByDisplayName'
		| 'image';

	type InventoryActionForm = {
		intent?: string;
		message?: string;
		values?: Partial<Draft>;
	};

	let { data, form }: PageProps = $props();
	const actionForm = $derived(form as InventoryActionForm | undefined);
	const formValues = $derived(actionForm?.values);
	let editorOpen = $state(false);
	let deleteTarget = $state<InventoryItem | null>(null);
	let filePreview = $state('');
	let selectedFileName = $state('');

	const columnStorageKey = 'inventorySelectedColumns';
	const optionalColumns: { key: ColumnKey; label: string }[] = [
		{ key: 'quantity', label: 'Cantitate' },
		{ key: 'category', label: 'Categorie' },
		{ key: 'subcategory', label: 'Subcategorie' },
		{ key: 'isConsumable', label: 'Consumabil' },
		{ key: 'owner', label: 'Centru Local' },
		{ key: 'locationDescription', label: 'Locație' },
		{ key: 'condition', label: 'Stare' },
		{ key: 'notes', label: 'Observații' },
		{ key: 'createdByDisplayName', label: 'Adăugat de' },
		{ key: 'image', label: 'Imagine' }
	];

	const emptyDraft = (): Draft => ({
		id: '',
		name: '',
		quantity: 0,
		category: '',
		subcategory: '',
		owner: '',
		locationDescription: '',
		condition: 'Buna',
		isConsumable: false,
		notes: '',
		removeImage: false,
		imageUrl: ''
	});

	const draftFromItem = (item: InventoryItem): Draft => ({
		id: String(item.id),
		name: item.name,
		quantity: item.quantity,
		category: item.category ?? '',
		subcategory: item.subcategory ?? '',
		owner: item.owner ?? '',
		locationDescription: item.locationDescription ?? '',
		condition: item.condition ?? 'Buna',
		isConsumable: item.isConsumable,
		notes: item.notes ?? '',
		removeImage: false,
		imageUrl: item.image ? imageProxyUrl(item.id) : ''
	});

	const draftFromForm = (values: Partial<Draft>): Draft => ({
		...emptyDraft(),
		...values,
		quantity: Number(values.quantity ?? 0),
		isConsumable: Boolean(values.isConsumable)
	});

	let draft = $state<Draft>(emptyDraft());
	let visibleColumns = $state<ColumnKey[]>(optionalColumns.map((column) => column.key));
	let columnsInitialized = $state(false);

	$effect(() => {
		if (actionForm?.intent === 'save' && formValues) {
			draft = draftFromForm(formValues);
			editorOpen = true;
		}
	});

	$effect(() => {
		if (!browser || columnsInitialized) return;
		const stored = localStorage.getItem(columnStorageKey);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					const allowed = new Set(optionalColumns.map((column) => column.key));
					const sanitized = parsed.filter((key): key is ColumnKey => allowed.has(key));
					if (sanitized.length) {
						visibleColumns = sanitized;
					}
				}
			} catch {
				visibleColumns = optionalColumns.map((column) => column.key);
			}
		}
		columnsInitialized = true;
	});

	$effect(() => {
		if (!browser || !columnsInitialized) return;
		localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumns));
	});

	const currentPage = $derived(data.inventory.page);
	const totalPages = $derived(
		Math.max(1, Math.ceil(data.inventory.total / data.inventory.pageSize))
	);
	const totalQuantity = $derived(
		data.inventory.items.reduce(
			(sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0),
			0
		)
	);
	const activeFilterCount = $derived(
		[
			data.filters.search,
			data.filters.category,
			data.filters.subcategory,
			data.filters.owner,
			data.filters.locationDescription,
			data.filters.condition,
			data.filters.consumable !== 'all' ? data.filters.consumable : ''
		].filter(Boolean).length
	);
	const categoryOptions = $derived(
		mergeOptions(
			data.options.categories.map(({ value, label }) => ({ value, label })),
			data.inventory.items.map((item) => item.category)
		)
	);
	const ownerOptions = $derived(
		mergeOptions(
			data.options.owners,
			data.inventory.items.map((item) => item.owner)
		)
	);
	const locationOptions = $derived(
		mergeOptions(
			data.options.locations,
			data.inventory.items.map((item) => item.locationDescription)
		)
	);
	const conditionOptions = $derived(
		mergeOptions(
			data.options.conditions,
			data.inventory.items.map((item) => item.condition)
		)
	);
	const subcategoryOptions = $derived.by(() => {
		const configured = draft.category
			? (data.options.categories.find((category) => category.value === draft.category)
					?.subcategories ?? [])
			: data.options.categories.flatMap((category) => category.subcategories);
		return mergeOptions(
			configured,
			data.inventory.items.map((item) => item.subcategory)
		);
	});

	function mergeOptions(configured: InventoryOption[], values: Array<string | undefined>) {
		const options = [...configured];
		for (const value of values) {
			if (value && !options.some((option) => option.value === value)) {
				options.push({ value, label: value });
			}
		}
		return options.sort((left, right) => left.label.localeCompare(right.label, 'ro'));
	}

	function labelFor(options: InventoryOption[], value?: string) {
		return options.find((option) => option.value === value)?.label ?? value ?? '-';
	}

	function categoryLabel(value?: string) {
		return labelFor(categoryOptions, value);
	}

	function subcategoryLabel(item: Pick<InventoryItem, 'category' | 'subcategory'>) {
		const configured =
			data.options.categories.find((category) => category.value === item.category)?.subcategories ??
			[];
		return labelFor(mergeOptions(configured, [item.subcategory]), item.subcategory);
	}

	function conditionLabel(value?: string) {
		return labelFor(conditionOptions, value);
	}

	function imageProxyUrl(itemId: number | string) {
		return resolve(`/sediu/inventar/items/${itemId}/image`);
	}

	function paginationFields(page: number) {
		return Object.entries(data.filters)
			.map(([name, value]) => ({
				name,
				value: name === 'page' ? String(page) : String(value)
			}))
			.filter((field) => field.value);
	}

	function openCreate() {
		draft = emptyDraft();
		filePreview = '';
		selectedFileName = '';
		editorOpen = true;
	}

	function openEdit(item: InventoryItem) {
		draft = draftFromItem(item);
		filePreview = '';
		selectedFileName = '';
		editorOpen = true;
	}

	function closeEditor() {
		editorOpen = false;
		filePreview = '';
		selectedFileName = '';
	}

	function handleCategoryChange() {
		draft.subcategory = '';
	}

	function handleImageChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			filePreview = '';
			selectedFileName = '';
			return;
		}
		if (filePreview) {
			URL.revokeObjectURL(filePreview);
		}
		filePreview = URL.createObjectURL(file);
		selectedFileName = file.name;
		draft.removeImage = false;
	}

	function handleColumnChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		visibleColumns = Array.from(select.selectedOptions).map((option) => option.value as ColumnKey);
	}

	function isVisible(column: ColumnKey) {
		return visibleColumns.includes(column);
	}
</script>

<svelte:head>
	<title>Inventar sediu | Scouts Cluj Utilities</title>
</svelte:head>

<section class="inventory-page">
	<div class="page-heading">
		<div>
			<p class="eyebrow">Sediu</p>
			<h1>Inventar</h1>
		</div>
		<div class="page-actions">
			<div class="count-chip">
				<Boxes size={16} aria-hidden="true" />
				<span>{data.inventory.total} obiecte</span>
			</div>
			<div class="count-chip secondary">{data.inventory.items.length} afișate</div>
			<div class="count-chip secondary">{totalQuantity} bucăți</div>
			{#if data.canEdit}
				<button class="primary-button" type="button" onclick={openCreate}>
					<Plus size={16} aria-hidden="true" />
					Adaugă obiect
				</button>
			{/if}
		</div>
	</div>

	{#if form?.message}
		<p class={actionForm?.intent === 'delete' ? 'error-message' : 'success-message'}>
			{form.message}
		</p>
	{/if}

	<form class="filter-panel" method="GET">
		<div class="filter-heading">
			<div>
				<p class="panel-title">Filtre</p>
				<span>{activeFilterCount ? `${activeFilterCount} active` : 'Niciun filtru activ'}</span>
			</div>
			<div class="filter-actions">
				<a class="secondary-button" href={resolve('/sediu/inventar')}>
					<RotateCcw size={15} aria-hidden="true" />
					Resetează
				</a>
				<button class="secondary-button" type="submit">
					<Search size={15} aria-hidden="true" />
					Aplică
				</button>
			</div>
		</div>

		<div class="filter-grid">
			<label class="search-field">
				<span>Căutare</span>
				<input name="search" type="search" value={data.filters.search} />
			</label>

			<label>
				<span>Categorie</span>
				<select name="category" value={data.filters.category}>
					<option value="">Toate</option>
					{#each categoryOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Subcategorie</span>
				<select name="subcategory" value={data.filters.subcategory}>
					<option value="">Toate</option>
					{#each mergeOptions( data.options.categories.flatMap((category) => category.subcategories), data.inventory.items.map((item) => item.subcategory) ) as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Locație</span>
				<select name="locationDescription" value={data.filters.locationDescription}>
					<option value="">Toate</option>
					{#each locationOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Stare</span>
				<select name="condition" value={data.filters.condition}>
					<option value="">Toate</option>
					{#each conditionOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Centru Local</span>
				<select name="owner" value={data.filters.owner}>
					<option value="">Toate</option>
					{#each ownerOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>

			<label>
				<span>Consumabil</span>
				<select name="consumable" value={data.filters.consumable}>
					<option value="all">Toate</option>
					<option value="yes">Doar consumabile</option>
					<option value="no">Doar neconsumabile</option>
				</select>
			</label>

			<label>
				<span>Sortare</span>
				<select name="sort" value={data.filters.sort}>
					<option value="name">Nume</option>
					<option value="quantity">Cantitate</option>
					<option value="category">Categorie</option>
					<option value="locationDescription">Locație</option>
					<option value="condition">Stare</option>
					<option value="updatedAt">Actualizat</option>
				</select>
			</label>

			<label>
				<span>Direcție</span>
				<select name="direction" value={data.filters.direction}>
					<option value="asc">Crescător</option>
					<option value="desc">Descrescător</option>
				</select>
			</label>
		</div>

		<input type="hidden" name="pageSize" value={data.filters.pageSize} />
	</form>

	{#if data.inventory.items.length}
		<div class="table-tools">
			<label>
				<span>Coloane vizibile</span>
				<select multiple onchange={handleColumnChange}>
					{#each optionalColumns as column (column.key)}
						<option value={column.key} selected={visibleColumns.includes(column.key)}>
							{column.label}
						</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="table-shell">
			<table>
				<thead>
					<tr>
						<th>Nume</th>
						{#if isVisible('quantity')}<th>Cantitate</th>{/if}
						{#if isVisible('category')}<th>Categorie</th>{/if}
						{#if isVisible('subcategory')}<th>Subcategorie</th>{/if}
						{#if isVisible('isConsumable')}<th>Consumabil</th>{/if}
						{#if isVisible('owner')}<th>Centru Local</th>{/if}
						{#if isVisible('locationDescription')}<th>Locație</th>{/if}
						{#if isVisible('condition')}<th>Stare</th>{/if}
						{#if isVisible('notes')}<th>Observații</th>{/if}
						{#if isVisible('createdByDisplayName')}<th>Adăugat de</th>{/if}
						{#if isVisible('image')}<th>Imagine</th>{/if}
						{#if data.canEdit}<th>Acțiuni</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each data.inventory.items as item (item.id)}
						<tr>
							<th scope="row">
								<span class="item-name">{item.name}</span>
								{#if item.notes}
									<span class="item-note">{item.notes}</span>
								{/if}
							</th>
							{#if isVisible('quantity')}<td>{item.quantity}</td>{/if}
							{#if isVisible('category')}<td>{categoryLabel(item.category)}</td>{/if}
							{#if isVisible('subcategory')}<td>{subcategoryLabel(item)}</td>{/if}
							{#if isVisible('isConsumable')}
								<td>
									<span class:warn-chip={item.isConsumable} class="mini-chip">
										{item.isConsumable ? 'Da' : 'Nu'}
									</span>
								</td>
							{/if}
							{#if isVisible('owner')}<td>{item.owner ?? '-'}</td>{/if}
							{#if isVisible('locationDescription')}<td>{item.locationDescription ?? '-'}</td>{/if}
							{#if isVisible('condition')}
								<td>
									<span class:error-chip={item.condition === 'De reparat'} class="mini-chip">
										{conditionLabel(item.condition)}
									</span>
								</td>
							{/if}
							{#if isVisible('notes')}<td>{item.notes ?? '-'}</td>{/if}
							{#if isVisible('createdByDisplayName')}<td>{item.createdByDisplayName ?? '-'}</td
								>{/if}
							{#if isVisible('image')}
								<td>
									{#if item.image}
										<a class="thumb-link" href={imageProxyUrl(item.id)} target="_blank">
											<img src={imageProxyUrl(item.id)} alt={item.name} />
										</a>
									{:else}
										<span class="muted-icon">
											<ImageIcon size={20} aria-hidden="true" />
										</span>
									{/if}
								</td>
							{/if}
							{#if data.canEdit}
								<td>
									<div class="row-actions">
										<button
											type="button"
											class="icon-button"
											aria-label="Editează"
											onclick={() => openEdit(item)}
										>
											<Edit3 size={16} aria-hidden="true" />
										</button>
										<button
											type="button"
											class="icon-button danger"
											aria-label="Șterge"
											onclick={() => (deleteTarget = item)}
										>
											<Trash2 size={16} aria-hidden="true" />
										</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="card-list">
			{#each data.inventory.items as item (item.id)}
				<article class="inventory-card">
					<div class="card-image">
						{#if item.image}
							<img src={imageProxyUrl(item.id)} alt={item.name} />
						{:else}
							<ImageIcon size={24} aria-hidden="true" />
						{/if}
					</div>
					<div class="card-body">
						<div class="card-title-row">
							<div>
								<h2>{item.name}</h2>
								<p>{item.quantity} buc. · {conditionLabel(item.condition)}</p>
							</div>
							{#if data.canEdit}
								<div class="row-actions">
									<button
										type="button"
										class="icon-button"
										aria-label="Editează"
										onclick={() => openEdit(item)}
									>
										<Edit3 size={16} aria-hidden="true" />
									</button>
									<button
										type="button"
										class="icon-button danger"
										aria-label="Șterge"
										onclick={() => (deleteTarget = item)}
									>
										<Trash2 size={16} aria-hidden="true" />
									</button>
								</div>
							{/if}
						</div>
						<div class="chip-row">
							{#if item.category}<span class="mini-chip">{categoryLabel(item.category)}</span>{/if}
							{#if item.locationDescription}<span class="mini-chip">{item.locationDescription}</span
								>{/if}
							{#if item.isConsumable}<span class="mini-chip warn-chip">Consumabil</span>{/if}
						</div>
						{#if item.notes}
							<p class="card-notes">{item.notes}</p>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		<div class="pagination">
			<form method="GET">
				{#each paginationFields(Math.max(1, currentPage - 1)) as field (field.name)}
					<input type="hidden" name={field.name} value={field.value} />
				{/each}
				<button class="secondary-button" type="submit" disabled={currentPage <= 1}>Înapoi</button>
			</form>
			<span>Pagina {currentPage} din {totalPages}</span>
			<form method="GET">
				{#each paginationFields(Math.min(totalPages, currentPage + 1)) as field (field.name)}
					<input type="hidden" name={field.name} value={field.value} />
				{/each}
				<button class="secondary-button" type="submit" disabled={currentPage >= totalPages}>
					Înainte
				</button>
			</form>
		</div>
	{:else}
		<section class="empty-state">
			<Boxes size={38} aria-hidden="true" />
			<h2>Nu am găsit obiecte</h2>
			<p>Ajustează filtrele sau adaugă un obiect nou în inventar.</p>
			<div class="empty-actions">
				<a class="secondary-button" href={resolve('/sediu/inventar')}>
					<RotateCcw size={15} aria-hidden="true" />
					Resetează
				</a>
				{#if data.canEdit}
					<button class="primary-button" type="button" onclick={openCreate}>
						<Plus size={16} aria-hidden="true" />
						Adaugă obiect
					</button>
				{/if}
			</div>
		</section>
	{/if}
</section>

{#if editorOpen && data.canEdit}
	<div class="modal-backdrop">
		<section class="modal-panel" aria-labelledby="inventory-editor-title">
			<div class="modal-heading">
				<div>
					<p class="eyebrow">Inventar</p>
					<h2 id="inventory-editor-title">{draft.id ? 'Editează obiectul' : 'Adaugă obiect'}</h2>
				</div>
				<button class="icon-button" type="button" aria-label="Închide" onclick={closeEditor}>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			{#if actionForm?.intent === 'save' && form?.message}
				<p class="error-message">{form.message}</p>
			{/if}

			<form class="editor-form" method="POST" action="?/save" enctype="multipart/form-data">
				<input type="hidden" name="itemId" value={draft.id} />

				<fieldset>
					<legend>Identitate</legend>
					<div class="form-grid two">
						<label>
							<span>Nume</span>
							<input name="name" type="text" bind:value={draft.name} maxlength="255" required />
						</label>
						<label>
							<span>Cantitate</span>
							<input name="quantity" type="number" min="0" bind:value={draft.quantity} />
						</label>
					</div>
				</fieldset>

				<fieldset>
					<legend>Clasificare</legend>
					<div class="form-grid two">
						<label>
							<span>Categorie</span>
							<select name="category" bind:value={draft.category} onchange={handleCategoryChange}>
								<option value="">Fără categorie</option>
								{#each categoryOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
						<label>
							<span>Subcategorie</span>
							<select name="subcategory" bind:value={draft.subcategory} disabled={!draft.category}>
								<option value="">Fără subcategorie</option>
								{#each subcategoryOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
					</div>
				</fieldset>

				<fieldset>
					<legend>Depozitare</legend>
					<div class="form-grid two">
						<label>
							<span>Centru Local</span>
							<select name="owner" bind:value={draft.owner}>
								<option value="">Fără centru</option>
								{#each ownerOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
						<label>
							<span>Locație</span>
							<select name="locationDescription" bind:value={draft.locationDescription}>
								<option value="">Fără locație</option>
								{#each locationOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
					</div>
				</fieldset>

				<fieldset>
					<legend>Stare</legend>
					<div class="form-grid two">
						<label>
							<span>Stare</span>
							<select name="condition" bind:value={draft.condition}>
								{#each conditionOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
						<label class="checkbox-card">
							<input name="isConsumable" type="checkbox" bind:checked={draft.isConsumable} />
							<span>Consumabil</span>
						</label>
					</div>
					<label>
						<span>Observații</span>
						<textarea name="notes" rows="3" bind:value={draft.notes}></textarea>
					</label>
				</fieldset>

				<fieldset>
					<legend>Imagine</legend>
					<div class="image-editor">
						<div class="image-preview">
							{#if filePreview}
								<img src={filePreview} alt="Previzualizare imagine" />
							{:else if draft.imageUrl && !draft.removeImage}
								<img src={draft.imageUrl} alt={draft.name || 'Imagine obiect'} />
							{:else}
								<ImageIcon size={28} aria-hidden="true" />
							{/if}
						</div>
						<div class="image-controls">
							<label class="upload-button">
								<Upload size={16} aria-hidden="true" />
								<span>{selectedFileName || 'Încarcă imagine'}</span>
								<input
									name="image"
									type="file"
									accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
									onchange={handleImageChange}
								/>
							</label>
							{#if draft.imageUrl}
								<label class="checkbox-card slim">
									<input name="removeImage" type="checkbox" bind:checked={draft.removeImage} />
									<span>Elimină imaginea</span>
								</label>
							{/if}
						</div>
					</div>
				</fieldset>

				<div class="modal-actions">
					<button class="secondary-button" type="button" onclick={closeEditor}>Anulează</button>
					<button class="primary-button" type="submit">
						<Check size={16} aria-hidden="true" />
						Salvează
					</button>
				</div>
			</form>
		</section>
	</div>
{/if}

{#if deleteTarget && data.canEdit}
	<div class="modal-backdrop">
		<section class="confirm-panel" aria-labelledby="delete-title">
			<div class="modal-heading">
				<h2 id="delete-title">Șterge obiectul?</h2>
				<button
					class="icon-button"
					type="button"
					aria-label="Închide"
					onclick={() => (deleteTarget = null)}
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>
			<p>Obiectul "{deleteTarget.name}" va fi șters din inventar.</p>
			<form class="modal-actions" method="POST" action="?/delete">
				<input type="hidden" name="itemId" value={deleteTarget.id} />
				<button class="secondary-button" type="button" onclick={() => (deleteTarget = null)}
					>Anulează</button
				>
				<button class="danger-button" type="submit">
					<Trash2 size={16} aria-hidden="true" />
					Șterge
				</button>
			</form>
		</section>
	</div>
{/if}

<style>
	.inventory-page,
	.filter-panel,
	.editor-form,
	.card-list {
		display: grid;
		gap: 18px;
	}

	.page-heading,
	.filter-heading,
	.card-title-row,
	.modal-heading,
	.modal-actions,
	.page-actions,
	.filter-actions,
	.empty-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.page-heading,
	.filter-heading {
		align-items: flex-start;
	}

	.page-actions,
	.filter-actions,
	.empty-actions {
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.eyebrow,
	h1,
	h2,
	p {
		margin: 0;
	}

	.eyebrow {
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin-top: 5px;
		color: #0f172a;
		font-size: clamp(1.75rem, 2.4vw, 2.35rem);
	}

	h2 {
		color: #0f172a;
		font-size: 1.15rem;
	}

	.filter-panel,
	.table-shell,
	.table-tools,
	.inventory-card,
	.empty-state,
	.modal-panel,
	.confirm-panel {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
	}

	.filter-panel,
	.table-tools,
	.empty-state,
	.modal-panel,
	.confirm-panel {
		padding: 16px;
	}

	.panel-title {
		margin: 0 0 4px;
		color: #0f172a;
		font-weight: 900;
	}

	.filter-heading span,
	.item-note,
	.card-body p,
	.card-notes,
	.empty-state p {
		color: #64748b;
	}

	.filter-grid,
	.form-grid {
		display: grid;
		gap: 12px;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.form-grid.two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.search-field {
		grid-column: span 2;
	}

	label {
		display: grid;
		gap: 7px;
		color: #334155;
		font-size: 0.86rem;
		font-weight: 800;
	}

	input,
	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 10px 11px;
		color: #0f172a;
		font: inherit;
	}

	select[multiple] {
		min-height: 92px;
	}

	textarea {
		resize: vertical;
	}

	.primary-button,
	.secondary-button,
	.danger-button,
	.icon-button,
	.upload-button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border-radius: 8px;
		font-weight: 900;
		text-decoration: none;
	}

	.primary-button {
		border: 0;
		background: #c81e1e;
		padding: 0 14px;
		color: #ffffff;
		cursor: pointer;
	}

	.secondary-button {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
		cursor: pointer;
	}

	.danger-button {
		border: 0;
		background: #b91c1c;
		padding: 0 12px;
		color: #ffffff;
		cursor: pointer;
	}

	.icon-button {
		width: 34px;
		min-height: 34px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
		cursor: pointer;
	}

	.icon-button.danger {
		color: #b91c1c;
	}

	.count-chip,
	.mini-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border-radius: 999px;
		background: #eef6ff;
		padding: 6px 9px;
		color: #164e63;
		font-size: 0.82rem;
		font-weight: 900;
	}

	.count-chip.secondary,
	.mini-chip {
		background: #f1f5f9;
		color: #334155;
	}

	.warn-chip {
		background: #fff7ed;
		color: #9a3412;
	}

	.error-chip {
		background: #fef2f2;
		color: #991b1b;
	}

	.success-message,
	.error-message {
		border-radius: 8px;
		padding: 12px 14px;
		font-weight: 850;
	}

	.success-message {
		border: 1px solid #bbf7d0;
		background: #f0fdf4;
		color: #166534;
	}

	.error-message {
		border: 1px solid #fecaca;
		background: #fef2f2;
		color: #991b1b;
	}

	.table-shell {
		display: block;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 980px;
	}

	th,
	td {
		border-bottom: 1px solid #e2e8f0;
		padding: 10px 12px;
		text-align: left;
		vertical-align: middle;
	}

	thead th {
		background: #f8fafc;
		color: #475569;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	tbody th {
		width: 240px;
	}

	.item-name,
	.item-note {
		display: block;
	}

	.item-name {
		color: #0f172a;
		font-weight: 900;
	}

	.item-note {
		margin-top: 3px;
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.82rem;
		font-weight: 500;
	}

	.thumb-link,
	.card-image,
	.image-preview {
		display: grid;
		place-items: center;
		overflow: hidden;
		background: #f1f5f9;
		color: #94a3b8;
	}

	.thumb-link {
		width: 46px;
		height: 46px;
		border-radius: 8px;
	}

	.thumb-link img,
	.card-image img,
	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.row-actions,
	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.card-list {
		display: none;
	}

	.inventory-card {
		grid-template-columns: 84px minmax(0, 1fr);
		gap: 14px;
		padding: 12px;
	}

	.card-image {
		width: 84px;
		height: 84px;
		border-radius: 8px;
	}

	.card-body {
		min-width: 0;
		display: grid;
		gap: 10px;
	}

	.card-title-row {
		align-items: flex-start;
	}

	.card-title-row h2 {
		margin-bottom: 3px;
	}

	.card-notes {
		line-height: 1.45;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.pagination form {
		margin: 0;
	}

	.pagination button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.empty-state {
		min-height: 260px;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 12px;
		text-align: center;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		background: rgb(15 23 42 / 0.46);
		padding: 16px;
	}

	.modal-panel,
	.confirm-panel {
		width: min(820px, 100%);
		max-height: calc(100vh - 32px);
		overflow: auto;
	}

	.confirm-panel {
		width: min(440px, 100%);
		display: grid;
		gap: 16px;
	}

	fieldset {
		display: grid;
		gap: 12px;
		border: 0;
		margin: 0;
		padding: 0;
	}

	legend {
		margin-bottom: 4px;
		color: #0f172a;
		font-size: 0.94rem;
		font-weight: 900;
	}

	.checkbox-card {
		min-height: 42px;
		display: flex;
		align-items: center;
		gap: 9px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0 12px;
	}

	.checkbox-card input {
		width: auto;
	}

	.checkbox-card.slim {
		justify-content: flex-start;
	}

	.image-editor {
		display: grid;
		grid-template-columns: 150px minmax(0, 1fr);
		gap: 14px;
		align-items: center;
	}

	.image-preview {
		width: 150px;
		height: 112px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
	}

	.image-controls {
		display: grid;
		gap: 10px;
	}

	.upload-button {
		position: relative;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
		cursor: pointer;
	}

	.upload-button input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.muted-icon {
		color: #94a3b8;
	}

	@media (max-width: 1100px) {
		.filter-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 760px) {
		.page-heading,
		.filter-heading,
		.modal-actions {
			display: grid;
			justify-content: stretch;
		}

		.page-actions,
		.filter-actions,
		.empty-actions {
			justify-content: flex-start;
		}

		.filter-grid,
		.form-grid.two,
		.image-editor {
			grid-template-columns: 1fr;
		}

		.search-field {
			grid-column: span 1;
		}

		.table-shell,
		.table-tools {
			display: none;
		}

		.card-list {
			display: grid;
		}

		.inventory-card {
			display: grid;
		}

		.image-preview {
			width: 100%;
		}
	}
</style>
