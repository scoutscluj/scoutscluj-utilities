import {
	initialTemplateDocument,
	type TemplateDocument
} from '@scouts-cluj/parental-consent-schema';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ParentalConsentTemplateEditor from './ParentalConsentTemplateEditor.svelte';

describe('ParentalConsentTemplateEditor', () => {
	it('inserts an editable handwritten field and supports undo/redo', async () => {
		const documents: TemplateDocument[] = [];
		const onchange = vi.fn((document: TemplateDocument) => documents.push(document));
		render(ParentalConsentTemplateEditor, {
			document: structuredClone(initialTemplateDocument),
			assets: [],
			onchange
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Inserează câmpul' }));
		await waitFor(() => expect(onchange).toHaveBeenCalled());
		expect(documents.at(-1)?.content.find((node) => node.type === 'formField')).toMatchObject({
			type: 'formField',
			field: { code: 'camp_nou', type: 'short_text', label: 'Câmp nou' }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Anulează' }));
		await waitFor(() =>
			expect(documents.at(-1)?.content.find((node) => node.type === 'formField')).not.toMatchObject(
				{
					type: 'formField',
					field: { code: 'camp_nou' }
				}
			)
		);

		await fireEvent.click(screen.getByRole('button', { name: 'Refă' }));
		await waitFor(() =>
			expect(documents.at(-1)?.content.find((node) => node.type === 'formField')).toMatchObject({
				type: 'formField',
				field: { code: 'camp_nou' }
			})
		);
	});
});
