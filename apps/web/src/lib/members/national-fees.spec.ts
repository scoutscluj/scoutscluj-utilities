import { expect, it, vi } from 'vitest';
import { refreshNationalFees } from './national-fees';

it('verifies every requested member in bounded batches and publishes each batch', async () => {
	const request = vi.fn(async (_url, init) => {
		const { memberIds } = JSON.parse(init.body);
		return Response.json({
			results: memberIds.map((id: string) => ({ id, state: 'synced', fees: [] }))
		});
	});
	const update = vi.fn();
	await refreshNationalFees(
		Array.from({ length: 23 }, (_, i) => String(i)),
		new AbortController().signal,
		update,
		request as unknown as typeof fetch
	);
	expect(request).toHaveBeenCalledTimes(3);
	expect(update.mock.calls.map(([rows]) => rows.length)).toEqual([10, 10, 3]);
});

it('discards a stale response after navigation and does not request further batches', async () => {
	const controller = new AbortController();
	let finish!: (response: Response) => void;
	const request = vi.fn(
		() =>
			new Promise<Response>((resolve) => {
				finish = resolve;
			})
	);
	const update = vi.fn();
	const pending = refreshNationalFees(
		Array.from({ length: 15 }, (_, i) => String(i)),
		controller.signal,
		update,
		request as unknown as typeof fetch
	);
	controller.abort();
	finish(Response.json({ results: [{ id: 'old', state: 'synced' }] }));
	await pending;
	expect(update).not.toHaveBeenCalled();
	expect(request).toHaveBeenCalledTimes(1);
});

it('preserves the displayed data when a batch fails', async () => {
	const update = vi.fn();
	await expect(
		refreshNationalFees(
			['member'],
			new AbortController().signal,
			update,
			vi.fn(async () => new Response('', { status: 503 })) as unknown as typeof fetch
		)
	).rejects.toThrow();
	expect(update).not.toHaveBeenCalled();
});
