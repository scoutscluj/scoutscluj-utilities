import type {
	DocumentBlock,
	FormField,
	InlineMark,
	InlineNode,
	TemplateDocument
} from '@scouts-cluj/parental-consent-schema';

export type EditorJsonNode = {
	type: string;
	attrs?: Record<string, unknown>;
	content?: EditorJsonNode[];
	text?: string;
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

const toEditorInline = (node: InlineNode): EditorJsonNode => ({
	type: 'text',
	text: node.text,
	marks: node.marks?.map((mark) =>
		mark.type === 'link'
			? { type: 'link', attrs: { href: mark.href, target: '_blank', rel: 'noopener noreferrer' } }
			: { type: mark.type }
	)
});

const toEditorBlock = (block: DocumentBlock): EditorJsonNode => {
	switch (block.type) {
		case 'paragraph':
			return { type: 'paragraph', content: block.content?.map(toEditorInline) };
		case 'heading':
			return {
				type: 'heading',
				attrs: { level: block.level },
				content: block.content?.map(toEditorInline)
			};
		case 'callout':
			return {
				type: 'callout',
				attrs: { tone: block.tone },
				content: block.content.map((entry) => toEditorBlock(entry))
			};
		case 'bulletList':
		case 'orderedList':
			return {
				type: block.type,
				content: block.content.map((item) => ({
					type: 'listItem',
					content: item.content.map((entry) => toEditorBlock(entry))
				}))
			};
		case 'table':
			return {
				type: 'table',
				content: block.content.map((row) => ({
					type: 'tableRow',
					content: row.content.map((cell) => ({
						type: 'tableCell',
						content: cell.content.map((entry) => toEditorBlock(entry))
					}))
				}))
			};
		case 'separator':
		case 'pageBreak':
			return { type: block.type };
		case 'asset':
			return {
				type: 'asset',
				attrs: { assetId: block.assetId, alt: block.alt, widthPercent: block.widthPercent ?? 50 }
			};
		case 'variable':
			return { type: 'variable', attrs: { key: block.key } };
		case 'formField':
			return { type: 'formField', attrs: { field: structuredClone(block.field) } };
		case 'module':
			return { type: 'module', attrs: { key: block.key } };
	}
};

const requiredString = (value: unknown, label: string) => {
	if (typeof value !== 'string' || !value) throw new Error(`Invalid editor ${label}`);
	return value;
};

const fromEditorInline = (node: EditorJsonNode): InlineNode => {
	if (node.type !== 'text' || typeof node.text !== 'string')
		throw new Error('Invalid editor inline node');
	const marks = node.marks?.map((mark): InlineMark => {
		if (mark.type === 'bold' || mark.type === 'italic' || mark.type === 'underline')
			return { type: mark.type };
		if (mark.type === 'link')
			return { type: 'link', href: requiredString(mark.attrs?.href, 'link') };
		throw new Error(`Unsupported editor mark: ${mark.type}`);
	});
	return { type: 'text', text: node.text, marks };
};

const paragraph = (node: EditorJsonNode) => ({
	type: 'paragraph' as const,
	content: node.content?.map(fromEditorInline)
});

const fromEditorBlock = (node: EditorJsonNode): DocumentBlock => {
	switch (node.type) {
		case 'paragraph':
			return paragraph(node);
		case 'heading': {
			const level = Number(node.attrs?.level);
			if (level !== 1 && level !== 2 && level !== 3)
				throw new Error('Invalid editor heading level');
			return { type: 'heading', level, content: node.content?.map(fromEditorInline) };
		}
		case 'callout': {
			const tone = node.attrs?.tone;
			if (tone !== 'info' && tone !== 'warning' && tone !== 'important')
				throw new Error('Invalid editor callout');
			return { type: 'callout', tone, content: (node.content ?? []).map(paragraph) };
		}
		case 'bulletList':
		case 'orderedList':
			return {
				type: node.type,
				content: (node.content ?? []).map((item) => {
					if (item.type !== 'listItem') throw new Error('Invalid editor list item');
					return {
						type: 'listItem',
						content: (item.content ?? []).map((entry) => fromEditorBlock(entry)) as never
					};
				})
			};
		case 'table':
			return {
				type: 'table',
				content: (node.content ?? []).map((row) => {
					if (row.type !== 'tableRow') throw new Error('Invalid editor table row');
					return {
						type: 'tableRow',
						content: (row.content ?? []).map((cell) => {
							if (cell.type !== 'tableCell') throw new Error('Invalid editor table cell');
							return { type: 'tableCell', content: (cell.content ?? []).map(paragraph) };
						})
					};
				})
			};
		case 'separator':
			return { type: 'separator' };
		case 'pageBreak':
			return { type: 'pageBreak' };
		case 'asset':
			return {
				type: 'asset',
				assetId: Number(node.attrs?.assetId),
				alt: requiredString(node.attrs?.alt, 'asset alt'),
				widthPercent: Number(node.attrs?.widthPercent ?? 50)
			};
		case 'variable':
			return { type: 'variable', key: requiredString(node.attrs?.key, 'variable') as never };
		case 'formField':
			return { type: 'formField', field: structuredClone(node.attrs?.field) as FormField };
		case 'module':
			return { type: 'module', key: requiredString(node.attrs?.key, 'module') as never };
		default:
			throw new Error(`Unsupported editor node: ${node.type}`);
	}
};

export const toEditorDocument = (document: TemplateDocument): EditorJsonNode => ({
	type: 'doc',
	content: document.content.map(toEditorBlock)
});

export const fromEditorDocument = (document: EditorJsonNode): TemplateDocument => {
	if (document.type !== 'doc' || !Array.isArray(document.content))
		throw new Error('Invalid editor document');
	return { type: 'doc', content: document.content.map(fromEditorBlock) };
};
