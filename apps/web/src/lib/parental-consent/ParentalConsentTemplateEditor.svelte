<script lang="ts">
	import {
		formFieldTypes,
		moduleKeys,
		variableKeys,
		type FormField,
		type FormFieldType,
		type TemplateDocument
	} from '@scouts-cluj/parental-consent-schema';
	import { Editor, Node, mergeAttributes, type JSONContent } from '@tiptap/core';
	import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
	import StarterKit from '@tiptap/starter-kit';
	import { onMount } from 'svelte';
	import { fromEditorDocument, toEditorDocument } from './editor-schema';

	type Asset = { id: number; name: string; altText: string };
	type Props = {
		document: TemplateDocument;
		assets?: Asset[];
		onchange: (document: TemplateDocument) => void;
	};

	let { document, assets = [], onchange }: Props = $props();
	let editorElement: HTMLDivElement;
	let editor = $state<Editor | null>(null);
	let revision = $state(0);
	let selectedField = $state(false);
	let fieldCode = $state('camp_nou');
	let fieldLabel = $state('Câmp nou');
	let fieldHelp = $state('');
	let fieldType = $state<FormFieldType>('short_text');
	let fieldRequired = $state(false);
	let fieldLines = $state(3);
	let fieldOptions = $state('da|Da\nnu|Nu');
	let selectedAssetId = $state<number | undefined>();
	let selectedVariable = $state<(typeof variableKeys)[number]>('activity.title');
	let selectedModule = $state<(typeof moduleKeys)[number]>('transport');

	const atomNode = (name: string, label: (attrs: Record<string, unknown>) => string) =>
		Node.create({
			name,
			group: 'block',
			atom: true,
			selectable: true,
			addAttributes() {
				return name === 'asset'
					? { assetId: { default: null }, alt: { default: '' }, widthPercent: { default: 50 } }
					: name === 'formField'
						? { field: { default: null } }
						: { key: { default: '' } };
			},
			renderHTML({ HTMLAttributes }) {
				return [
					'div',
					mergeAttributes(HTMLAttributes, {
						class: `pc-editor-node pc-editor-node-${name}`,
						'data-node-type': name
					}),
					label(HTMLAttributes)
				];
			}
		});

	const Callout = Node.create({
		name: 'callout',
		group: 'block',
		content: 'paragraph+',
		defining: true,
		addAttributes() {
			return { tone: { default: 'info' } };
		},
		renderHTML({ HTMLAttributes }) {
			return ['aside', mergeAttributes(HTMLAttributes, { class: 'pc-editor-callout' }), 0];
		}
	});

	const Separator = Node.create({
		name: 'separator',
		group: 'block',
		atom: true,
		renderHTML() {
			return ['hr', { class: 'pc-editor-separator' }];
		}
	});

	const PageBreak = Node.create({
		name: 'pageBreak',
		group: 'block',
		atom: true,
		renderHTML() {
			return ['div', { class: 'pc-editor-page-break' }, 'Întrerupere de pagină'];
		}
	});

	const extensions = [
		StarterKit.configure({
			heading: { levels: [1, 2, 3] },
			link: { openOnClick: false, protocols: ['http', 'https', 'mailto', 'tel'] }
		}),
		Table.configure({ resizable: false }),
		TableRow,
		TableHeader,
		TableCell,
		Callout,
		Separator,
		PageBreak,
		atomNode(
			'asset',
			(attrs) => `Asset aprobat #${String(attrs.assetId ?? '')}: ${String(attrs.alt ?? '')}`
		),
		atomNode('variable', (attrs) => `Variabilă: ${String(attrs.key ?? '')}`),
		atomNode('module', (attrs) => `Modul condițional: ${String(attrs.key ?? '')}`),
		atomNode('formField', (attrs) => {
			const field = attrs.field as FormField | undefined;
			return field ? `Câmp formular: ${field.label} [${field.type}]` : 'Câmp formular';
		})
	];

	const emitChange = (instance: Editor) => {
		revision += 1;
		try {
			onchange(fromEditorDocument(instance.getJSON()));
		} catch {
			// The API performs authoritative validation; unsupported transient states are not emitted.
		}
	};

	const loadSelectedField = (instance: Editor) => {
		const selection = instance.state.selection as typeof instance.state.selection & {
			node?: { type: { name: string }; attrs: Record<string, unknown> };
		};
		const candidate = selection.node ?? selection.$from.nodeAfter;
		if (candidate?.type.name !== 'formField') {
			selectedField = false;
			return;
		}
		const field = candidate.attrs.field as FormField;
		if (!field) return;
		selectedField = true;
		fieldCode = field.code;
		fieldLabel = field.label;
		fieldHelp = field.helpText ?? '';
		fieldType = field.type;
		fieldRequired = Boolean(field.required);
		fieldLines = field.handwrittenLines ?? 3;
		fieldOptions = (field.options ?? [])
			.map((option) => `${option.value}|${option.label}`)
			.join('\n');
	};

	onMount(() => {
		selectedAssetId ??= assets[0]?.id;
		const instance = new Editor({
			element: editorElement,
			extensions,
			content: toEditorDocument(document) as JSONContent,
			onUpdate: ({ editor: changedEditor }) => emitChange(changedEditor),
			onSelectionUpdate: ({ editor: changedEditor }) => loadSelectedField(changedEditor)
		});
		editor = instance;
		return () => instance.destroy();
	});

	const insert = (content: JSONContent) => editor?.chain().focus().insertContent(content).run();
	const setLink = () => {
		if (!editor) return;
		const href = window.prompt('Link HTTP(S), mailto sau tel:');
		if (!href) return;
		editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
	};
	const options = () =>
		fieldOptions
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [value, ...label] = line.split('|');
				return { value: value.trim(), label: (label.join('|') || value).trim() };
			});
	const currentField = (): FormField => ({
		code: fieldCode.trim(),
		type: fieldType,
		label: fieldLabel.trim(),
		helpText: fieldHelp.trim() || undefined,
		required: fieldRequired,
		handwrittenLines: fieldLines,
		options: ['single_choice', 'multiple_choice', 'dropdown'].includes(fieldType)
			? options()
			: undefined,
		children:
			fieldType === 'repeating_group'
				? [
						{ code: `${fieldCode}_item`, type: 'short_text', label: 'Element' },
						{ code: `${fieldCode}_details`, type: 'short_text', label: 'Detalii' }
					]
				: undefined
	});
	const saveField = () => {
		if (!editor || !fieldCode.trim() || !fieldLabel.trim()) return;
		const field = currentField();
		if (selectedField) editor.chain().focus().updateAttributes('formField', { field }).run();
		else insert({ type: 'formField', attrs: { field } });
	};
	const insertAsset = () => {
		const asset = assets.find((entry) => entry.id === Number(selectedAssetId));
		if (asset)
			insert({ type: 'asset', attrs: { assetId: asset.id, alt: asset.altText, widthPercent: 50 } });
	};
</script>

<section class="editor-shell" data-revision={revision}>
	<div class="toolbar" aria-label="Instrumente editor">
		<button
			type="button"
			onclick={() => editor?.chain().focus().undo().run()}
			disabled={!editor?.can().undo()}>Anulează</button
		>
		<button
			type="button"
			onclick={() => editor?.chain().focus().redo().run()}
			disabled={!editor?.can().redo()}>Refă</button
		>
		<button type="button" onclick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
		<button type="button" onclick={() => editor?.chain().focus().toggleItalic().run()}
			>Italic</button
		>
		<button type="button" onclick={() => editor?.chain().focus().toggleUnderline().run()}
			>Subliniat</button
		>
		<button type="button" onclick={setLink}>Link</button>
		<button type="button" onclick={() => editor?.chain().focus().setParagraph().run()}
			>Paragraf</button
		>
		{#each [1, 2, 3] as level (level)}
			<button
				type="button"
				onclick={() =>
					editor
						?.chain()
						.focus()
						.toggleHeading({ level: level as 1 | 2 | 3 })
						.run()}>H{level}</button
			>
		{/each}
		<button type="button" onclick={() => editor?.chain().focus().toggleBulletList().run()}
			>Listă</button
		>
		<button type="button" onclick={() => editor?.chain().focus().toggleOrderedList().run()}
			>Listă numerotată</button
		>
		<button
			type="button"
			onclick={() =>
				editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}
			>Tabel</button
		>
		<button
			type="button"
			onclick={() =>
				insert({ type: 'callout', attrs: { tone: 'important' }, content: [{ type: 'paragraph' }] })}
			>Callout</button
		>
		<button type="button" onclick={() => insert({ type: 'separator' })}>Separator</button>
		<button type="button" onclick={() => insert({ type: 'pageBreak' })}>Pagină nouă</button>
	</div>

	<div class="insert-grid">
		<label>
			Variabilă
			<select bind:value={selectedVariable}
				>{#each variableKeys as key (key)}<option value={key}>{key}</option>{/each}</select
			>
		</label>
		<button
			type="button"
			onclick={() => insert({ type: 'variable', attrs: { key: selectedVariable } })}
			>Inserează</button
		>
		<label>
			Modul condițional
			<select bind:value={selectedModule}
				>{#each moduleKeys as key (key)}<option value={key}>{key}</option>{/each}</select
			>
		</label>
		<button type="button" onclick={() => insert({ type: 'module', attrs: { key: selectedModule } })}
			>Inserează</button
		>
		<label>
			Asset aprobat
			<select bind:value={selectedAssetId}>
				{#each assets as asset (asset.id)}<option value={asset.id}>{asset.name}</option>{/each}
			</select>
		</label>
		<button type="button" onclick={insertAsset} disabled={!assets.length}>Inserează</button>
	</div>

	<div class="editor-canvas" bind:this={editorElement}></div>

	<fieldset class="field-panel">
		<legend
			>{selectedField
				? 'Modifică textbox-ul selectat'
				: 'Adaugă textbox / câmp de formular'}</legend
		>
		<label>Cod<input bind:value={fieldCode} /></label>
		<label>Etichetă<input bind:value={fieldLabel} /></label>
		<label>Ajutor<input bind:value={fieldHelp} /></label>
		<label>
			Tip
			<select bind:value={fieldType}
				>{#each formFieldTypes as type (type)}<option value={type}>{type}</option>{/each}</select
			>
		</label>
		<label>Linii olografe<input type="number" min="1" max="12" bind:value={fieldLines} /></label>
		<label class="checkbox"
			><input type="checkbox" bind:checked={fieldRequired} /> Obligatoriu</label
		>
		{#if ['single_choice', 'multiple_choice', 'dropdown'].includes(fieldType)}
			<label class="wide"
				>Opțiuni (valoare|etichetă, una pe linie)<textarea rows="3" bind:value={fieldOptions}
				></textarea></label
			>
		{/if}
		<button type="button" onclick={saveField}
			>{selectedField ? 'Actualizează câmpul' : 'Inserează câmpul'}</button
		>
	</fieldset>
</section>

<style>
	.editor-shell {
		display: grid;
		gap: 12px;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 10px;
		border: 1px solid #d8e0ea;
		border-radius: 10px;
		background: #f8fafc;
	}
	button,
	select,
	input,
	textarea {
		font: inherit;
	}
	button {
		min-height: 34px;
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		background: #fff;
		padding: 5px 10px;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		border-color: #991b1b;
		color: #991b1b;
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.insert-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr) auto);
		gap: 8px;
		align-items: end;
	}
	label {
		display: grid;
		gap: 5px;
		color: #334155;
		font-size: 0.85rem;
		font-weight: 750;
	}
	select,
	input,
	textarea {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		background: #fff;
		padding: 8px;
		color: #0f172a;
	}
	.editor-canvas {
		min-height: 520px;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		background: #fff;
		padding: 20px;
	}
	:global(.editor-canvas .ProseMirror) {
		min-height: 475px;
		outline: none;
		color: #172033;
		line-height: 1.5;
	}
	:global(.editor-canvas .ProseMirror h1) {
		text-align: center;
		color: #17365d;
	}
	:global(.editor-canvas .ProseMirror h2),
	:global(.editor-canvas .ProseMirror h3) {
		color: #17365d;
	}
	:global(.pc-editor-callout) {
		border-left: 4px solid #a12828;
		background: #fff0f0;
		padding: 8px 12px;
	}
	:global(.pc-editor-node) {
		margin: 8px 0;
		border: 1px dashed #8291a5;
		border-radius: 7px;
		background: #f1f5f9;
		padding: 9px;
		color: #334155;
	}
	:global(.pc-editor-page-break) {
		margin: 16px 0;
		border-top: 2px dashed #94a3b8;
		color: #64748b;
		text-align: center;
	}
	:global(.editor-canvas table) {
		width: 100%;
		border-collapse: collapse;
	}
	:global(.editor-canvas td),
	:global(.editor-canvas th) {
		border: 1px solid #94a3b8;
		padding: 7px;
	}
	.field-panel {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		border: 1px solid #d8e0ea;
		border-radius: 10px;
		padding: 14px;
	}
	.field-panel legend {
		padding: 0 6px;
		font-weight: 900;
	}
	.field-panel .checkbox {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.field-panel .checkbox input {
		width: auto;
	}
	.field-panel .wide {
		grid-column: 1 / -1;
	}
	@media (max-width: 900px) {
		.insert-grid,
		.field-panel {
			grid-template-columns: 1fr;
		}
		.field-panel .wide {
			grid-column: auto;
		}
	}
</style>
