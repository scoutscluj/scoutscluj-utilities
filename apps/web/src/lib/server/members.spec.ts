import { beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('./api', () => ({ apiFetch }));
import { memberAction, refreshMemberNational } from './members';

const members = [{ id: 'member', revision: 3 }];
const changes = { kind: 'grade', grade: '7' };
function event() {
	const form = new FormData();
	form.set('action', 'bulk');
	form.set('members', JSON.stringify(members));
	form.set('changes', JSON.stringify(changes));
	return {
		params: {},
		cookies: { get: () => 'session' },
		request: { formData: async () => form }
	} as unknown as RequestEvent;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => apiFetch.mockReset());

it('posts manual receipt details as integer bani without inventing national credit', async () => {
	const form = new FormData();
	for (const [key, value] of Object.entries({
		action: 'manual-fee',
		obligationId: 'obligation',
		periodId: 'period',
		amount: '50.25',
		method: 'cash',
		reference: 'CH-42',
		receivedOn: '2026-11-10',
		note: 'Încasare locală'
	}))
		form.set(key, value);
	const requestEvent = {
		...event(),
		request: { formData: async () => form }
	} as unknown as RequestEvent;
	apiFetch.mockResolvedValueOnce(json({ id: 'receipt' }));
	expect(await memberAction(requestEvent)).toMatchObject({ message: 'Plata a fost înregistrată.' });
	expect(apiFetch).toHaveBeenCalledWith(
		'/api/membership/bank-receipts',
		expect.objectContaining({ method: 'POST' })
	);
	expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({
		obligationId: 'obligation',
		periodId: 'period',
		amountBani: 5025,
		method: 'cash',
		reference: 'CH-42',
		receivedOn: '2026-11-10',
		note: 'Încasare locală'
	});
});

it('preserves cached fee access when national verification is unavailable', async () => {
	apiFetch.mockRejectedValueOnce(new Error('Unavailable'));
	expect(await refreshMemberNational(event(), 'member')).toContain('Se afișează situația salvată');
});

it('refreshes current national credit before loading a member fee menu', async () => {
	const form = new FormData();
	form.set('action', 'fee-menu');
	form.set('id', 'member');
	const requestEvent = {
		...event(),
		request: { formData: async () => form }
	} as unknown as RequestEvent;
	apiFetch
		.mockResolvedValueOnce(json({ state: 'synced', message: 'Confirmat' }))
		.mockResolvedValueOnce(
			json({ member: { name: 'Membru' }, fees: [{ nationalDirectBani: 15000 }] })
		);
	expect(await memberAction(requestEvent)).toMatchObject({
		message: 'Confirmat',
		feeMenu: { fees: [{ nationalDirectBani: 15000 }] }
	});
	expect(apiFetch.mock.calls[0][0]).toBe('/api/membership/members/member/national-status');
	expect(apiFetch.mock.calls[1][0]).toBe('/api/members/member');
});

it('validates and applies the same edit in one form submission', async () => {
	apiFetch
		.mockResolvedValueOnce(json({ applied: false, version: 'checked-version' }))
		.mockResolvedValueOnce(json({ applied: true }));
	const result = await memberAction(event());
	expect(result).toMatchObject({ section: 'bulk', message: 'Modificarea a fost salvată.' });
	expect(result).not.toHaveProperty('bulkPreview');
	expect(apiFetch).toHaveBeenCalledTimes(2);
	const [, options] = apiFetch.mock.calls[1];
	expect(JSON.parse(options.body)).toEqual({
		members,
		changes,
		confirm: true,
		version: 'checked-version'
	});
});

it.each([403, 409, 400])(
	'preserves validation failure %i without attempting an update',
	async (status) => {
		apiFetch.mockResolvedValueOnce(
			json({ message: 'Selecția nu mai poate fi modificată.' }, status)
		);
		const result = await memberAction(event());
		expect(result).toMatchObject({
			status,
			data: { section: 'bulk', message: 'Selecția nu mai poate fi modificată.' }
		});
		expect(apiFetch).toHaveBeenCalledTimes(1);
	}
);

it('preserves a conflict detected between validation and saving', async () => {
	apiFetch
		.mockResolvedValueOnce(json({ applied: false, version: 'checked-version' }))
		.mockResolvedValueOnce(json({ message: 'Selecția s-a schimbat. Reîncarcă registrul.' }, 409));
	expect(await memberAction(event())).toMatchObject({
		status: 409,
		data: { message: 'Selecția s-a schimbat. Reîncarcă registrul.' }
	});
	expect(apiFetch).toHaveBeenCalledTimes(2);
});

it('requires a valid validation response and a confirmed save', async () => {
	apiFetch.mockResolvedValueOnce(json({ applied: false }));
	expect(await memberAction(event())).toMatchObject({ status: 502 });
	expect(apiFetch).toHaveBeenCalledTimes(1);
	apiFetch.mockReset();
	apiFetch
		.mockResolvedValueOnce(json({ applied: false, version: 'checked-version' }))
		.mockResolvedValueOnce(json({ applied: false }));
	expect(await memberAction(event())).toMatchObject({ status: 502 });
});
