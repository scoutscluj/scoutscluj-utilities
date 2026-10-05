// Synthetic local API for UI regression tests. Never connects to production.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const current = '11111111-1111-4111-8111-111111111111';
const previous = '22222222-2222-4222-8222-222222222222';
const prices = Object.fromEntries(
	[
		['normal', 'Normală', 30500, 15000],
		['fam1', 'Fam 1', 30500, 15000],
		['fam2', 'Fam 2', 15500, 7500],
		['fam3', 'Fam 3', 8000, 3750],
		['social', 'Socială', 10500, 5000]
	].map(([id, label, totalBani, nationalBani]) => [
		id,
		{ label, totalBani, nationalBani, baseBani: totalBani - 500 }
	])
);
const fixture = () => ({
	periods: [
		{
			id: current,
			name: 'Cotizație 2026–2027',
			startsOn: '2026-09-01',
			endsOn: '2027-08-31',
			active: true,
			prices
		},
		{
			id: previous,
			name: 'Cotizație 2025–2026',
			startsOn: '2025-09-01',
			endsOn: '2026-08-31',
			active: false,
			prices
		}
	],
	obligations: [
		{
			id: '33333333-3333-4333-8333-333333333333',
			periodId: current,
			orgoUserId: 36801,
			cardId: 'AT36801',
			memberName: 'Ana Popescu',
			plan: 'normal',
			totalBani: 30500,
			nationalBani: 15000
		},
		{
			id: '44444444-4444-4444-8444-444444444444',
			periodId: current,
			orgoUserId: 36802,
			cardId: 'AT36802',
			memberName: 'Andrei Ionescu',
			plan: 'normal',
			totalBani: 30500,
			nationalBani: 15000
		},
		{
			id: '55555555-5555-4555-8555-555555555555',
			periodId: current,
			orgoUserId: 36803,
			memberName: 'Maria Dumitrescu',
			plan: 'fam2',
			totalBani: 15500,
			nationalBani: 7500
		},
		{
			id: '66666666-6666-4666-8666-666666666666',
			periodId: previous,
			orgoUserId: 36801,
			memberName: 'Ana Popescu',
			plan: 'normal',
			totalBani: 30500,
			nationalBani: 15000
		}
	],
	receipts: [
		{
			id: 'r1',
			periodId: current,
			amountBani: 30500,
			refundedBani: 0,
			method: 'bank',
			receivedOn: '2026-10-01',
			note: 'Cotizație achitată prin transfer bancar',
			reference: 'BT-100',
			reviewRequired: false
		},
		{
			id: 'r2',
			periodId: current,
			amountBani: 10000,
			refundedBani: 0,
			method: 'cash',
			receivedOn: '2026-10-02',
			note: 'Plată parțială în numerar',
			reference: 'CH-101',
			reviewRequired: false
		}
	],
	allocations: [
		{
			id: 'a1',
			receiptId: 'r1',
			obligationId: '33333333-3333-4333-8333-333333333333',
			amountBani: 30500,
			reversed: false,
			note: ''
		},
		{
			id: 'a2',
			receiptId: 'r2',
			obligationId: '44444444-4444-4444-8444-444444444444',
			amountBani: 10000,
			reversed: false,
			note: ''
		}
	],
	checkouts: [
		{
			id: '77777777-7777-4777-8777-777777777777',
			periodId: current,
			obligationId: '55555555-5555-4555-8555-555555555555',
			identifier: '36803',
			plan: 'fam2',
			state: 'pending',
			amountBani: 15500,
			provider: 'netopia',
			providerId: '123456',
			environment: 'live',
			createdAt: '2026-10-05T10:00:00Z',
			reviewRequired: false
		},
		{
			id: '88888888-8888-4888-8888-888888888888',
			periodId: current,
			obligationId: '44444444-4444-4444-8444-444444444444',
			identifier: '36802',
			plan: 'normal',
			state: 'pending',
			amountBani: 20500,
			provider: 'stripe',
			providerId: 'cs_test_123',
			environment: 'test',
			createdAt: '2026-10-05T11:00:00Z',
			reviewRequired: false
		}
	],
	payouts: [],
	batches: [],
	nationalItems: [],
	cardEnabled: true,
	orgoIntegration: 'ready',
	rosterInitialized: true,
	rosterSync: {
		id: 'sync-1',
		periodId: current,
		mode: 'manual',
		status: 'succeeded',
		summary: { added: 3, updated: 0, review: 0, unchanged: 0 },
		createdAt: '2026-10-05T09:00:00Z',
		completedAt: '2026-10-05T09:01:00Z'
	},
	paymentConfiguration: {
		activeProvider: 'netopia',
		activeEnvironment: 'live',
		vaultReady: true,
		providers: []
	}
});
let ledger = fixture();
let submissions = [];
const respond = (res, value, status = 200) => {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(value));
};
createServer(async (req, res) => {
	if (req.url === '/test/reset') {
		ledger = fixture();
		submissions = [];
		return respond(res, {});
	}
	if (req.url === '/test/submissions') return respond(res, submissions);
	if (req.url === '/api/auth/me')
		return respond(res, { id: 1, displayName: 'Responsabil financiar', roles: ['super_admin'] });
	if (req.url === '/api/activities') return respond(res, []);
	if (req.url === '/api/membership/admin') return respond(res, ledger);
	if (req.url === '/api/membership/bank-receipts' && req.method === 'POST') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw);
		submissions.push(body);
		if (ledger.receipts.some((r) => r.method === body.method && r.reference === body.reference))
			return respond(res, { message: 'Referință de încasare deja înregistrată.' }, 409);
		const receipt = {
			id: randomUUID(),
			periodId: body.periodId,
			amountBani: body.amountBani,
			refundedBani: 0,
			method: body.method,
			receivedOn: body.receivedOn,
			note: body.note,
			reference: body.reference,
			reviewRequired: false
		};
		ledger.receipts.push(receipt);
		if (body.obligationId)
			ledger.allocations.push({
				id: randomUUID(),
				receiptId: receipt.id,
				obligationId: body.obligationId,
				amountBani: body.amountBani,
				reversed: false,
				note: body.note
			});
		return respond(res, receipt);
	}
	return respond(res, {});
}).listen(3015, '127.0.0.1', () => console.log('Synthetic membership API: 3015'));
