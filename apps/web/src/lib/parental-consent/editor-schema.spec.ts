import { initialTemplateDocument } from '@scouts-cluj/parental-consent-schema';
import { describe, expect, it } from 'vitest';
import { fromEditorDocument, toEditorDocument } from './editor-schema';

describe('parental-consent editor schema', () => {
	it('round-trips the initial structured template without arbitrary HTML', () => {
		expect(fromEditorDocument(toEditorDocument(initialTemplateDocument))).toEqual(
			initialTemplateDocument
		);
	});

	it('serializes links through allowlisted structured marks', () => {
		const document = {
			type: 'doc' as const,
			content: [
				{
					type: 'paragraph' as const,
					content: [
						{
							type: 'text' as const,
							text: 'Regulament',
							marks: [{ type: 'link' as const, href: 'https://example.com' }]
						}
					]
				}
			]
		};
		expect(fromEditorDocument(toEditorDocument(document))).toEqual(document);
	});

	it('rejects unsupported nodes instead of accepting arbitrary HTML', () => {
		expect(() =>
			fromEditorDocument({
				type: 'doc',
				content: [{ type: 'html', attrs: { value: '<script />' } }]
			})
		).toThrow('Unsupported editor node');
	});
});
