import type { Detail } from './types';

export type NationalFeeResult = {
	id: string;
	state: string;
	message?: string | null;
	fees?: Detail['fees'];
};

// Sequential batches keep browser/server load bounded; the API checks three
// members concurrently with separate ORM contexts inside each batch.
export async function refreshNationalFees(
	memberIds: string[],
	signal: AbortSignal,
	onBatch: (results: NationalFeeResult[]) => void,
	request: typeof fetch = fetch,
	url = '/units/fees'
) {
	const ids = [...new Set(memberIds)];
	for (let start = 0; start < ids.length; start += 10) {
		if (signal.aborted) return;
		const response = await request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ memberIds: ids.slice(start, start + 10) }),
			signal
		});
		if (!response.ok) throw new Error('Verificarea cotizațiilor nu este disponibilă.');
		const payload = (await response.json()) as { results: NationalFeeResult[] };
		if (signal.aborted) return;
		onBatch(payload.results);
	}
}
