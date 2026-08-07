import { describe, expect, it, vi } from 'vitest';
import { fetchParentalConsentPreview } from './preview';

describe('fetchParentalConsentPreview', () => {
	it('turns a validation response into an actionable inline message', async () => {
		const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));

		await expect(fetchParentalConsentPreview('/preview', fetcher)).resolves.toEqual({
			ok: false,
			message: 'Preview-ul nu poate fi generat. Rezolvă erorile marcate și salvează din nou.'
		});
	});

	it('returns the generated PDF without navigating away', async () => {
		const fetcher = vi.fn().mockResolvedValue(
			new Response('pdf', {
				status: 200,
				headers: { 'content-type': 'application/pdf' }
			})
		);

		const result = await fetchParentalConsentPreview('/preview', fetcher);

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.pdf.size).toBe(3);
	});
});
