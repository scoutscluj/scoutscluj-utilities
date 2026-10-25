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
	admissionAllocations: [],
	admissionMembers: [
		{
			orgoUserId: 99999,
			name: 'Istoric bancar',
			expectedBani: 5500,
			paid: false,
			receivedBani: 0,
			inactive: true
		},
		{ orgoUserId: 36801, name: 'Ana Popescu', expectedBani: 5500, paid: false, receivedBani: 0 },
		{ orgoUserId: 36802, name: 'Andrei Ionescu', expectedBani: 10500, paid: false, receivedBani: 0 }
	],
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
let objectives = [];
let profileOptions = {};
let adultDocuments = [];
const adultOwner = '11111111-1111-4111-8111-111111111111';
const adultOther = '22222222-2222-4222-8222-222222222222';
const adultKinds = ['behavioural_integrity'];
const adultYear = 2026;
const adultDossier = (memberId, year, canReview) => {
	const documents = adultDocuments
		.filter((d) => d.memberId === memberId && d.year === year)
		.map((document) => {
			const metadata = { ...document };
			delete metadata.contentBase64;
			delete metadata.memberId;
			delete metadata.year;
			return metadata;
		});
	const statuses = adultKinds.map(
		(kind) =>
			documents.filter((d) => d.kind === kind).sort((a, b) => b.version - a.version)[0]?.status ??
			'missing'
	);
	return {
		memberId,
		name: memberId === adultOwner ? 'Ana Popescu' : 'Elena Ionescu',
		birthDate: '1990-01-01',
		eligible: true,
		year,
		currentYear: adultYear,
		canReview,
		documents,
		complete: statuses.every((s) => s === 'validated'),
		years: [...new Set([adultYear, year, ...adultDocuments.map((d) => d.year)])].sort(
			(a, b) => b - a
		)
	};
};
let subscribedDevices = new Set();
const respond = (res, value, status = 200) => {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(value));
};
createServer(async (req, res) => {
	res.setHeader(
		'Access-Control-Allow-Origin',
		process.env.MEMBERSHIP_TEST_WEB_ORIGIN ?? 'http://127.0.0.1:5182'
	);
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Headers', 'content-type');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		return res.end();
	}
	if (req.url === '/test/reset') {
		ledger = fixture();
		submissions = [];
		objectives = [];
		profileOptions = {};
		adultDocuments = [];
		subscribedDevices = new Set();
		return respond(res, {});
	}
	if (req.url === '/test/profile' && req.method === 'POST') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		Object.assign(profileOptions, JSON.parse(raw));
		return respond(res, {});
	}
	if (req.url?.startsWith('/api/adult-documents')) {
		const url = new URL(req.url, 'http://localhost');
		const path = url.pathname.slice('/api/adult-documents'.length);
		const admin = profileOptions.documentsAdmin === true;
		const year = Number(url.searchParams.get('year') ?? adultYear);
		if (profileOptions.failDocuments)
			return respond(res, { message: 'Documentele nu sunt disponibile momentan.' }, 503);
		if (path === '/access') return respond(res, { admin });
		if (path === '/mine')
			return respond(
				res,
				profileOptions.adultDocuments
					? { eligible: true, reason: null, dossier: adultDossier(adultOwner, year, false) }
					: { eligible: false, reason: 'under_age', dossier: null }
			);
		if (path === '') {
			if (!admin) return respond(res, { message: 'Doar administratorii centrali au acces.' }, 403);
			const rows = [adultOwner, adultOther].map((memberId) => {
				const dossier = adultDossier(memberId, year, true);
				return {
					memberId,
					name: dossier.name,
					structureId: memberId === adultOwner ? 'cluj' : 'floresti',
					complete: dossier.complete,
					statuses: adultKinds.map(
						(kind) =>
							dossier.documents
								.filter((d) => d.kind === kind)
								.sort((a, b) => b.version - a.version)[0]?.status ?? 'missing'
					)
				};
			});
			return respond(res, {
				year,
				currentYear: adultYear,
				years: [adultYear, adultYear - 1],
				rows,
				total: rows.length,
				loadedTotal: rows.length,
				unknownBirthDates: 0,
				page: 1,
				pageSize: 0
			});
		}
		if (path.startsWith('/members/')) {
			const memberId = path.split('/')[2];
			if (memberId !== adultOwner && !admin)
				return respond(res, { message: 'Acces refuzat.' }, 403);
			if (req.method === 'GET') return respond(res, adultDossier(memberId, year, admin));
			let raw = '';
			for await (const chunk of req) raw += chunk;
			const input = JSON.parse(raw);
			const version =
				adultDocuments.filter(
					(d) => d.memberId === memberId && d.year === input.year && d.kind === input.kind
				).length + 1;
			const document = {
				...input,
				memberId,
				id: randomUUID(),
				version,
				size: Buffer.from(input.contentBase64, 'base64').length,
				status: 'pending',
				uploadedAt: '2026-10-25T09:00:00Z',
				uploaderName: admin ? 'Administrator' : 'Ana Popescu',
				reviewedAt: null,
				reviewerName: null,
				rejectionReason: null
			};
			adultDocuments.push(document);
			return respond(res, { id: document.id }, 201);
		}
		if (path.startsWith('/versions/')) {
			const document = adultDocuments.find((d) => d.id === path.split('/')[2]);
			if (!document) return respond(res, { message: 'Document inexistent.' }, 404);
			if (path.endsWith('/download')) {
				res.writeHead(200, {
					'content-type': document.contentType,
					'cache-control': 'private, no-store',
					'content-disposition': `attachment; filename="${document.filename}"`
				});
				return res.end(Buffer.from(document.contentBase64, 'base64'));
			}
			if (!admin) return respond(res, { message: 'Acces refuzat.' }, 403);
			let raw = '';
			for await (const chunk of req) raw += chunk;
			const input = JSON.parse(raw);
			if (input.status === 'rejected' && !input.reason?.trim())
				return respond(res, { message: 'Motiv obligatoriu.' }, 400);
			Object.assign(document, {
				status: input.status,
				rejectionReason: input.status === 'rejected' ? input.reason : null,
				reviewerName: 'Administrator',
				reviewedAt: '2026-10-25T10:00:00Z'
			});
			return respond(res, { id: document.id }, 201);
		}
		return respond(res, {}, 404);
	}
	if (req.url === '/api/personal-objectives') {
		if (req.method === 'POST') {
			let raw = '';
			for await (const chunk of req) raw += chunk;
			const body = JSON.parse(raw);
			if (profileOptions.saveDelay)
				await new Promise((resolve) => setTimeout(resolve, profileOptions.saveDelay));
			if (profileOptions.failSave)
				return respond(res, { message: 'Salvarea nu este disponibilă momentan.' }, 503);
			const objective = { ...body, id: objectives.length + 1, createdAt: new Date().toISOString() };
			objectives.push(objective);
			return respond(res, objective, 201);
		}
		if (profileOptions.failList) return respond(res, { message: 'Indisponibil' }, 503);
		return respond(
			res,
			[...objectives].sort((a, b) => a.deadline.localeCompare(b.deadline) || b.id - a.id)
		);
	}
	if (req.url?.startsWith('/api/notifications/me')) {
		if (profileOptions.failNotifications)
			return respond(res, { message: 'Statusul notificărilor nu este disponibil.' }, 503);
		const deviceId = new URL(req.url, 'http://localhost').searchParams.get('deviceId');
		return respond(res, {
			configured: profileOptions.notificationConfigured ?? true,
			publicKey: 'AQID',
			activeDeviceCount: subscribedDevices.size,
			currentDeviceSubscribed: subscribedDevices.has(deviceId)
		});
	}
	if (req.url === '/api/notifications/subscribe' && req.method === 'POST') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		subscribedDevices.add(JSON.parse(raw).deviceId);
		return respond(res, {
			success: true,
			message: 'Notificările au fost activate.',
			activeDeviceCount: subscribedDevices.size,
			currentDeviceSubscribed: true
		});
	}
	if (req.url === '/api/notifications/test')
		return respond(res, {
			success: true,
			totalDevices: subscribedDevices.size,
			successCount: subscribedDevices.size,
			failureCount: 0
		});
	if (req.url?.startsWith('/api/notifications/subscriptions') && req.method === 'DELETE') {
		const deviceId = req.url.split('/')[4];
		if (deviceId) subscribedDevices.delete(decodeURIComponent(deviceId));
		else subscribedDevices.clear();
		return respond(res, {
			success: true,
			message: 'Notificările au fost dezactivate.',
			activeDeviceCount: subscribedDevices.size,
			currentDeviceSubscribed: false
		});
	}
	if (req.url === '/test/submissions') return respond(res, submissions);
	if (req.url === '/api/users')
		return respond(
			res,
			Array.from({ length: 32 }, (_, i) => ({
				id: i + 1,
				displayName: `Voluntar ${String(i + 1).padStart(2, '0')}`,
				email: `voluntar${i + 1}@example.test`,
				roles: [i % 2 ? 'moderator' : 'finance_manager'],
				notificationsEnabled: i % 2 === 0,
				createdAt: '2026-10-01T10:00:00Z',
				updatedAt: '2026-10-01T10:00:00Z'
			}))
		);
	if (req.url === '/api/auth/me')
		return respond(res, {
			id: 1,
			displayName: 'Responsabil financiar',
			roles: req.headers.cookie?.includes('read-only') ? [] : ['super_admin'],
			...profileOptions.user
		});
	if (req.url === '/api/activities') return respond(res, []);
	if (req.url === '/api/members')
		return respond(res, {
			structures: [
				{ id: 'cluj', name: 'Cluj' },
				{ id: 'floresti', name: 'Florești' }
			],
			delegableRoles: ['helper', 'leader', 'chief', 'structure_admin', 'council'],
			manageableStructureIds: ['cluj', 'floresti'],
			admin: !req.headers.cookie?.includes('read-only'),
			canFinance: !req.headers.cookie?.includes('read-only'),
			canCreateMember: !req.headers.cookie?.includes('read-only'),
			canManage: !req.headers.cookie?.includes('read-only'),
			chiefUnitIds: [],
			ownMemberId: null,
			progressionEnabled: false,
			sync: [],
			transitions: [],
			notices: [],
			units: [
				{
					id: 'u3',
					name: 'Temerari Florești',
					structureId: 'floresti',
					branch: 'temerari',
					parentId: null,
					archived: false,
					canCreateMember: !req.headers.cookie?.includes('read-only'),
					canManage: !req.headers.cookie?.includes('read-only'),
					delegateRoles: ['helper', 'leader', 'chief'],
					grades: []
				},
				{
					id: 'u1',
					name: 'Temerari',
					branch: 'temerari',
					parentId: null,
					archived: false,
					canCreateMember: !req.headers.cookie?.includes('read-only'),
					canManage: !req.headers.cookie?.includes('read-only'),
					delegateRoles: ['helper', 'leader', 'chief'],
					grades: []
				},
				{
					id: 'u2',
					name: 'Lupișori',
					branch: 'lupisori',
					parentId: null,
					archived: false,
					canCreateMember: !req.headers.cookie?.includes('read-only'),
					canManage: !req.headers.cookie?.includes('read-only'),
					delegateRoles: ['helper', 'leader', 'chief'],
					grades: []
				},
				{
					id: 'g1',
					name: 'Grupa temerari',
					branch: 'temerari',
					parentId: 'u1',
					archived: false,
					canCreateMember: !req.headers.cookie?.includes('read-only'),
					canManage: !req.headers.cookie?.includes('read-only'),
					delegateRoles: ['helper', 'leader', 'chief'],
					grades: [5]
				},
				{
					id: 'g2',
					name: 'Grupa lupișori',
					branch: 'lupisori',
					parentId: 'u2',
					archived: false,
					canCreateMember: !req.headers.cookie?.includes('read-only'),
					canManage: !req.headers.cookie?.includes('read-only'),
					delegateRoles: ['helper', 'leader', 'chief'],
					grades: [3]
				}
			],
			inactiveMembers: Array.from({ length: 52 }, (_, i) => ({
				id: `inactive-${i + 1}`,
				name: `Istoric ${String(i + 1).padStart(2, '0')}`,
				orgoId: 900 + i,
				revision: 1,
				access: { detail: true, edit: true, identity: true, transfer: true, fees: true },
				status: 'review'
			})),
			members: [
				{
					id: 'm2',
					revision: 1,
					name: 'Copil Florești',
					structureId: 'floresti',
					orgoId: 36802,
					unitId: 'u3',
					groupId: null,
					grade: 5,
					category: 'temerari',
					access: {
						detail: true,
						edit: !req.headers.cookie?.includes('read-only'),
						identity: true,
						transfer: true,
						fees: true
					},
					status: 'active'
				},
				{
					id: 'm1',
					revision: 1,
					name: 'Ana Popescu',
					orgoId: 36801,
					unitId: 'u1',
					groupId: 'g1',
					grade: 5,
					category: 'temerari',
					access: {
						delegate: !req.headers.cookie?.includes('read-only'),
						detail: true,
						edit: !req.headers.cookie?.includes('read-only'),
						identity: true,
						transfer: true,
						fees: true
					},
					status: 'active',
					adultKind: null
				}
			]
		});

	if (req.url === '/api/members/m1/assignments' && req.method === 'POST') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		submissions.push(JSON.parse(raw));
		return respond(res, { ok: true });
	}
	if (req.url === '/api/members/bulk') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw);
		submissions.push(body);
		return respond(res, {
			version: 'preview-version',
			members: body.members.map((m) => ({
				...m,
				name: m.id === 'm1' ? 'Ana Popescu' : m.id === 'm2' ? 'Copil Florești' : m.id,
				from: 'cluj',
				unitId: null
			})),
			changes: body.changes,
			applied: body.confirm === true
		});
	}
	if (req.url === '/api/membership/national-direct') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		submissions.push(JSON.parse(raw));
		return respond(res, { success: true });
	}
	if (/^\/api\/members\/(m[12]|inactive-\d+)$/.test(req.url ?? ''))
		return respond(res, {
			member: { id: req.url.split('/').pop(), name: 'Membru test', profile: {} },
			access: { read: true, fees: true },
			fees: [
				{
					period: 'Cotizație 2026–2027',
					obligationId: ledger.obligations[0].id,
					totalBani: 30000,
					nationalBani: 15000,
					nationalDirectBani: 0,
					localPaidBani: 0,
					paidBani: 0,
					remainingBani: 30000,
					collectible: true
				}
			],
			notes: [],
			assignments: [],
			sync: []
		});
	if (req.url === '/api/members/structures/preview')
		return respond(res, {
			structures: [
				{ id: 'cluj', name: 'Cluj' },
				{ id: 'floresti', name: 'Florești' }
			],
			units: [],
			members: [
				{
					id: 'm1',
					name: 'Copil Florești',
					revision: 1,
					category: 'temerari',
					unitId: 'u1',
					structureId: 'floresti',
					inactive: false
				}
			]
		});
	if (req.url === '/api/members/structures/confirm') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		submissions.push(JSON.parse(raw));
		return respond(res, { ok: true });
	}
	if (req.url === '/api/membership/catalog')
		return respond(res, {
			period: ledger.periods[0],
			cardEnabled: true,
			environment: 'sandbox',
			activeProvider: 'netopia'
		});
	if (req.url === '/api/membership/mine')
		return profileOptions.failMembership
			? respond(res, { message: 'Indisponibil' }, 503)
			: respond(res, profileOptions.membershipObligations ?? []);
	if (req.url?.startsWith('/api/membership/status/'))
		return respond(res, { message: 'No payment' }, 404);
	if (req.url === '/api/membership/guest-lookup') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw);
		submissions.push(body);
		return respond(res, {
			identifier: body.identifier,
			displayName: 'Ana P.',
			affiliation: 'Centrul Local Cluj',
			amountBani: body.purpose === 'admission' ? 5500 : 30500,
			paid: false
		});
	}
	if (req.url === '/api/membership/guest-checkout') {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		submissions.push(JSON.parse(raw));
		return respond(res, { message: 'Eroare de test. Reîncearcă.' }, 409);
	}
	if (req.url === '/test/admission-confirm') {
		ledger.admissionMembers.find((m) => m.orgoUserId === 36801).paid = true;
		const member = ledger.obligations[0];
		ledger.checkouts.push({
			id: 'admission',
			obligationId: member.id,
			periodName: ledger.periods[0].name,
			periodId: member.periodId,
			purpose: 'admission',
			identifier: String(member.orgoUserId),
			plan: 'normal',
			amountBani: 5500,
			state: 'succeeded',
			provider: 'netopia',
			reviewRequired: false
		});
		ledger.receipts.push({
			id: 'admission-receipt',
			checkoutId: 'admission',
			periodId: member.periodId,
			amountBani: 5500,
			refundedBani: 0,
			method: 'card',
			receivedOn: '2026-10-19',
			reference: 'admission',
			note: 'Adeziune',
			reviewRequired: false
		});
		return respond(res, {});
	}
	if (req.url === '/api/membership/admin') return respond(res, ledger);
	if (req.url?.startsWith('/test/review/')) {
		const member = ledger.obligations[0];
		member.reviewState = req.url.endsWith('/missing')
			? 'missing_from_orgo'
			: 'plan_changed_after_payment';
		member.reviewReason =
			member.reviewState === 'missing_from_orgo'
				? 'Membrul nu mai apare ca eligibil în registrul ORGO.'
				: 'Plan ORGO nou: fam1. Obligația are deja încasări.';
		if (req.url.endsWith('/surplus')) member.testSurplus = true;
		if (req.url.endsWith('/stale')) member.testStale = true;
		return respond(res, {});
	}
	if (req.url?.endsWith('/review-preview')) {
		const member = ledger.obligations[0];
		return respond(res, {
			obligationId: member.id,
			reviewState: member.reviewState,
			reviewReason: member.reviewReason,
			currentPlan: member.plan,
			currentTotalBani: member.totalBani,
			currentNationalBani: member.nationalBani,
			orgoPlan: member.testSurplus
				? 'fam2'
				: member.reviewState === 'missing_from_orgo'
					? null
					: 'fam1',
			proposedTotalBani: member.testSurplus ? 15500 : 30500,
			proposedNationalBani: 15000,
			paidBani: 30500,
			remainingBani: 0,
			resultingState: 'paid',
			canResolve: !member.testSurplus && member.reviewState !== 'missing_from_orgo',
			blockers: member.testSurplus
				? [{ target: 'receipts', message: 'Suma alocată depășește noul tarif. Rezolvă surplusul.' }]
				: member.reviewState === 'missing_from_orgo'
					? [
							{
								target: 'orgo',
								message: 'Membrul lipsește din registrul ORGO. Corectează datele în ORGO.'
							}
						]
					: [],
			version: 'synthetic-review-version'
		});
	}
	if (req.url?.endsWith('/resolve-review')) {
		let raw = '';
		for await (const chunk of req) raw += chunk;
		const body = JSON.parse(raw);
		submissions.push(body);
		const member = ledger.obligations[0];
		if (member.testStale) {
			delete member.testStale;
			return respond(
				res,
				{ message: 'Datele s-au schimbat. Reîncarcă verificarea și confirmă noile valori.' },
				409
			);
		}
		member.plan = 'fam1';
		member.reviewState = null;
		member.reviewReason = null;
		return respond(res, { success: true, state: 'paid', remainingBani: 0 });
	}
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
		for (const a of body.allocations ?? []) {
			if (a.purpose === 'admission') {
				const member = ledger.admissionMembers.find((m) => m.orgoUserId === Number(a.orgoUserId));
				ledger.admissionAllocations.push({
					id: randomUUID(),
					receiptId: receipt.id,
					orgoUserId: Number(a.orgoUserId),
					amountBani: a.amountBani,
					expectedBani: a.expectedBani ?? member.expectedBani,
					note: a.note,
					reversed: false
				});
				member.receivedBani += a.amountBani;
				member.paid = member.receivedBani >= member.expectedBani;
			} else
				ledger.allocations.push({
					id: randomUUID(),
					receiptId: receipt.id,
					obligationId: a.obligationId,
					amountBani: a.amountBani,
					note: a.note,
					reversed: false
				});
		}
		return respond(res, receipt);
	}
	return respond(res, {});
}).listen(Number(process.env.MEMBERSHIP_TEST_API_PORT ?? 3015), '127.0.0.1', () =>
	console.log('Synthetic membership API ready')
);
