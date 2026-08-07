export const fetchParentalConsentPreview = async (
	path: string,
	fetcher: typeof fetch = fetch
): Promise<{ ok: true; pdf: Blob } | { ok: false; message: string }> => {
	const response = await fetcher(path);
	if (!response.ok) {
		return {
			ok: false,
			message:
				response.status === 400
					? 'Preview-ul nu poate fi generat. Rezolvă erorile marcate și salvează din nou.'
					: `Preview-ul nu a putut fi generat (eroare ${response.status}).`
		};
	}
	return { ok: true, pdf: await response.blob() };
};
