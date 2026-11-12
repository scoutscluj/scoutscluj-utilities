// Synthetic API for UI checks. It never reads real members or connects to a payment provider.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import schema from '../../../../packages/parental-consent-schema/dist/index.js';
// Exercise the real preview validator; CI builds the API before browser tests.
import rules from '../../../api/dist/modules/activity-registrations/registration.rules.js';
const { participationFields, createRepresentativeOrganizerDraft } = schema;
const id = '11111111-1111-4111-8111-111111111111';
const token = 'a'.repeat(43);
const lists = {
	structures: [
		{ id: 'cluj', name: 'Cluj' },
		{ id: 'floresti', name: 'Florești' }
	],
	units: [
		{ id: 'cluj-temerari', name: 'Temerari', branch: 'temerari', structureId: 'cluj' },
		{ id: 'floresti-temerari', name: 'Temerari', branch: 'temerari', structureId: 'floresti' }
	],
	groups: [
		{ id: 'cluj-group', name: 'Patrula Cluj', parentId: 'cluj-temerari', structureId: 'cluj' },
		{
			id: 'floresti-group',
			name: 'Patrula Florești',
			parentId: 'floresti-temerari',
			structureId: 'floresti'
		}
	]
};
const activity = {
	id: 1,
	title: 'Camp de test — Cântul Vâlvelor',
	type: 'camp',
	status: 'planned',
	coordinatorId: 1,
	coordinatorName: 'Coordonator de test',
	departments: ['administrative', 'finance'],
	startDate: '2027-08-24T07:00:00Z',
	endDate: '2027-08-28T15:00:00Z',
	location: 'Roșia Montană',
	description: 'Activitate de test pentru verificarea înscrierilor. Datele sunt fictive.',
	financeSummary: { totalDocuments: 0, openDocuments: 0, sentDocuments: 0, needsClarification: 0 }
};
const settings = {
	published: true,
	opensAt: '',
	closesAt: '',
	approvalRequired: false,
	paymentConfirmsPlace: false,
	paymentDue: '2027-08-01',
	beneficiaryCapacity: 30,
	staffCapacity: 10,
	totalCapacity: 40,
	branchCapacities: { lupisori: 10 },
	structureIds: [],
	unitIds: [],
	groupIds: [],
	feeBani: 50000,
	branchFees: {},
	familyFees: [50000, 40000, 30000],
	installments: [
		{ amountBani: 20000, due: '2027-07-01' },
		{ amountBani: 30000, due: '2027-08-01' }
	],
	questions: [],
	medicalUserIds: [],
	administrativeUserIds: [],
	terms: 'Taxa este aceeași pentru toate metodele de plată. Retragerea se discută cu organizatorul.'
};
let designMode = false;
let drafts = [];
let previews = [];
let eligibleBranchesOverride = null;
let informationOverride = null;
let row;
let created = null;
let savedSettings = null;
let settingsRevision = 1;
let concurrentAfterSave = false;
const originalSettings = structuredClone(settings);
const originalActivity = structuredClone(activity);
function reset() {
	designMode = false;
	Object.assign(activity, originalActivity);
	previews = [];
	drafts = [];
	eligibleBranchesOverride = null;
	informationOverride = null;
	created = null;
	savedSettings = null;
	settingsRevision = 1;
	concurrentAfterSave = false;
	for (const key of Object.keys(settings)) delete settings[key];
	Object.assign(settings, structuredClone(originalSettings));
	row = {
		id,
		orgoId: 36805,
		memberName: 'Participant de test',
		branch: 'lupisori',
		role: 'beneficiary',
		minor: true,
		state: 'accepted',
		revision: 1,
		answerRevision: 1,
		consentPublicationId: 1,
		consentState: 'awaiting',
		canEdit: true,
		totalBani: 50000,
		cashBani: 10000,
		supportBani: 5000,
		coveredBani: 15000,
		remainingBani: 35000,
		excessBani: 0,
		installment: { amountBani: 5000, due: '2027-07-01' },
		paymentState: 'partial',
		familyPlan: 'fam2',
		email: 'parent@example.test',
		answers: {
			participant_name: 'Participant de test',
			birth_date: '2016-04-12',
			guardian_name: 'Părinte de test',
			guardian_relation: 'mother',
			guardian_phone: '0700000000',
			emergency_name: 'Contact alternativ',
			emergency_phone: '0700000001',
			transport: 'branch',
			treatment: 'call_first',
			medical_notes: 'Fără informații medicale relevante',
			acknowledgement: true
		},
		questions: [],
		entries: [],
		documents: [],
		payments: [],
		createdAt: '2026-10-27T08:00:00Z',
		mailState: 'pending'
	};
}
const designIngredients = [
	{
		id: 1,
		name: 'Orez',
		category: 'Cereale',
		unitFamily: 'mass',
		defaultUnit: 'kg',
		defaultPricePerUnit: 8.5
	},
	{
		id: 2,
		name: 'Morcovi',
		category: 'Legume',
		unitFamily: 'mass',
		defaultUnit: 'kg',
		defaultPricePerUnit: 5
	}
];
const designRecipes = [
	{
		id: 1,
		name: 'Orez cu legume',
		description: 'Prânz cald pentru echipa de camp.',
		condiments: ['Sare', 'Piper'],
		servings: 10,
		ingredients: [
			{ id: 1, ingredientId: 1, ingredientName: 'Orez', quantity: 1, unit: 'kg' },
			{ id: 2, ingredientId: 2, ingredientName: 'Morcovi', quantity: 0.6, unit: 'kg' }
		]
	}
];
const designKitchen = {
	plan: { id: 1, activityId: 1, defaultParticipantCount: 32, hasCompleteActivityDates: true },
	days: [
		{ id: 1, date: '2027-08-24', dateStatus: 'current' },
		{ id: 2, date: '2027-08-25', dateStatus: 'current' }
	],
	meals: [
		{
			id: 11,
			kitchenDayId: 1,
			slot: 'lunch',
			name: 'Prânzul de sosire',
			sortOrder: 0,
			attendanceMode: 'plan_default',
			attendanceTotal: 32,
			recipes: [
				{
					id: 21,
					mealId: 11,
					recipeId: 1,
					recipeName: 'Orez cu legume',
					servings: 32,
					condiments: ['Sare', 'Piper'],
					isSnapshot: true,
					isStale: false,
					scalingMode: 'proportional'
				}
			],
			attendance: [{ id: 31, subgroupName: 'Temerari', attendance: 20 }],
			adjustments: []
		}
	],
	ingredientNeeds: [
		{
			ingredientId: 1,
			ingredientName: 'Orez',
			category: 'Cereale',
			unit: 'kg',
			neededQuantity: 3.2,
			procuredQuantity: 2,
			remainingQuantity: 1.2,
			coveragePercent: 62.5,
			estimatedCost: 27.2,
			breakdown: [{ date: '2027-08-24', mealId: 11, mealLabel: 'Prânz', quantity: 3.2 }]
		},
		{
			ingredientId: 2,
			ingredientName: 'Morcovi',
			category: 'Legume',
			unit: 'kg',
			neededQuantity: 1.92,
			procuredQuantity: 2,
			remainingQuantity: 0,
			coveragePercent: 100,
			estimatedCost: 9.6,
			breakdown: [{ date: '2027-08-24', mealId: 11, mealLabel: 'Prânz', quantity: 1.92 }]
		}
	],
	mealCoverage: [
		{
			mealId: 11,
			kitchenDayId: 1,
			date: '2027-08-24',
			slot: 'lunch',
			mealLabel: 'Prânzul de sosire',
			items: [
				{
					ingredientId: 1,
					ingredientName: 'Orez',
					neededQuantity: 3.2,
					coveredQuantity: 2,
					remainingQuantity: 1.2,
					overCoveredQuantity: 0,
					unit: 'kg',
					state: 'partial'
				},
				{
					ingredientId: 2,
					ingredientName: 'Morcovi',
					neededQuantity: 1.92,
					coveredQuantity: 1.92,
					remainingQuantity: 0,
					overCoveredQuantity: 0.08,
					unit: 'kg',
					state: 'covered'
				}
			],
			condiments: ['Sare', 'Piper']
		}
	],
	condimentReminders: ['Sare', 'Piper']
};
const designProcurement = [
	{
		id: 1,
		kitchenPlanId: 1,
		name: 'Cumpărături înainte de camp',
		supplier: 'Magazin local',
		ownerName: 'Echipa logistică',
		date: '2027-08-23',
		method: 'shopping_run',
		status: 'in_progress',
		notes: 'Verificați cantitatea de orez înainte de plecare.',
		items: [
			{
				id: 1,
				ingredientId: 1,
				ingredientName: 'Orez',
				quantity: 2,
				unit: 'kg',
				estimatedUnitPrice: 8.5,
				estimatedTotalCost: 17
			}
		],
		documents: []
	}
];
const designDocuments = [
	{
		id: 501,
		uploaderId: 1,
		uploaderName: 'Coordonator de test',
		status: 'ready_to_send',
		originalFilename: 'Bon cumpărături bucătărie.pdf',
		contentType: 'application/pdf',
		fileSize: 42600,
		checksumSha256: 'synthetic',
		activityId: 1,
		activityTitle: 'Camp de test — Cântul Vâlvelor',
		notes: 'Aprovizionarea inițială a campului.',
		createdAt: '2026-11-10T10:00:00Z',
		updatedAt: '2026-11-10T10:00:00Z'
	},
	{
		id: 502,
		uploaderId: 1,
		uploaderName: 'Coordonator de test',
		status: 'needs_clarification',
		originalFilename: 'Factură transport.pdf',
		contentType: 'application/pdf',
		fileSize: 64200,
		checksumSha256: 'synthetic-2',
		activityId: 1,
		activityTitle: 'Camp de test — Cântul Vâlvelor',
		reviewerNotes: 'Lipsește dovada plății.',
		createdAt: '2026-11-09T09:00:00Z',
		updatedAt: '2026-11-10T11:00:00Z'
	}
];
const designAudit = [
	{
		id: 1,
		actorId: 1,
		actorName: 'Coordonator de test',
		action: 'registration.paper_received',
		entityType: 'activity_registration',
		entityId: id,
		activityId: 1,
		metadata: { memberName: 'Maria Popescu' },
		createdAt: '2026-11-12T09:30:00Z'
	},
	{
		id: 2,
		actorId: 1,
		actorName: 'Coordonator de test',
		action: 'registration.receipt_recorded',
		entityType: 'activity_registration',
		entityId: id,
		activityId: 1,
		metadata: { method: 'cash', amountBani: 15000 },
		createdAt: '2026-11-12T09:25:00Z'
	}
];
function designActivityList() {
	return [
		activity,
		{
			...activity,
			id: 2,
			title: 'Drumeție în Cheile Turzii',
			type: 'hike',
			location: 'Cheile Turzii',
			status: 'planned',
			startDate: '2027-09-12T07:00:00Z',
			financeSummary: {
				totalDocuments: 0,
				openDocuments: 0,
				sentDocuments: 0,
				needsClarification: 0
			}
		},
		{
			...activity,
			id: 3,
			title: 'Atelier de orientare și prim ajutor',
			type: 'training',
			location: 'Sediul centrului local',
			status: 'active',
			financeSummary: {
				totalDocuments: 1,
				openDocuments: 0,
				sentDocuments: 1,
				needsClarification: 0
			}
		},
		{
			...activity,
			id: 4,
			title: 'Campul de vară al centrului local',
			status: 'completed',
			startDate: '2026-08-01T07:00:00Z',
			financeSummary: {
				totalDocuments: 12,
				openDocuments: 0,
				sentDocuments: 12,
				needsClarification: 0
			}
		}
	];
}
function designRows() {
	return [
		row,
		...[
			['Maria Popescu', 5, 'paper_received', 0],
			['Andrei Ionescu', 7, 'awaiting', 15000],
			['Alexandra Ștefan', 0, 'uploaded', 15000],
			['Radu Marinescu', null, 'not_required', 0]
		].map(([memberName, grade, consentState, cashRemainingBani], index) => ({
			...row,
			id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, '0')}`,
			orgoId: 36806 + index,
			memberName,
			grade,
			consentState,
			minor: index !== 3,
			role: index === 3 ? 'staff' : 'beneficiary',
			cashRemainingBani,
			cashInstallments:
				index === 3
					? []
					: [
							{
								key: 'cash',
								amountBani: 15000,
								remainingBani: cashRemainingBani,
								due: '2027-08-24'
							}
						],
			entries: [],
			totalBani: index === 3 ? 0 : 50000,
			remainingBani: index === 3 ? 0 : cashRemainingBani
		}))
	];
}

reset();
function previewPdf() {
	const stream = 'BT /F1 15 Tf 40 760 Td (Previzualizare sintetica - fara date personale) Tj ET';
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
		`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
	];
	let pdf = '%PDF-1.4\n';
	const offsets = [0];
	for (const [index, obj] of objects.entries()) {
		offsets.push(Buffer.byteLength(pdf));
		pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
	}
	const xref = Buffer.byteLength(pdf);
	pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
		.slice(1)
		.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
		.join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
	return Buffer.from(pdf);
}
const send = (res, data, status = 200) => {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data));
};
createServer(async (req, res) => {
	let body = '';
	for await (const chunk of req) body += chunk;
	const input = body ? JSON.parse(body) : {};
	const path = new URL(req.url, 'http://127.0.0.1').pathname;
	const memberMode = !!req.headers.cookie?.includes('synthetic-member');
	const authenticated = memberMode || !!req.headers.cookie?.includes('synthetic-admin');
	if (path === '/test/reset') {
		reset();
		return send(res, {});
	}
	if (path === '/test/drafts') return send(res, drafts);
	if (path === '/test/row') return send(res, row);
	if (path === '/test/configure') {
		Object.assign(activity, input.activity ?? {});
		Object.assign(settings, input.settings ?? {});
		if (input.eligibleBranches) eligibleBranchesOverride = input.eligibleBranches;
		if (input.information) informationOverride = input.information;
		Object.assign(row, input.row ?? {});
		if (input.capabilities) settings.testCapabilities = input.capabilities;
		if (input.designMode !== undefined) {
			designMode = input.designMode;
			if (designMode) {
				if (!input.activity?.departments)
					activity.departments = ['administrative', 'finance', 'kitchen'];
				if (!input.activity?.financeSummary)
					activity.financeSummary = {
						totalDocuments: 3,
						openDocuments: 2,
						sentDocuments: 1,
						needsClarification: 1
					};
				if (!input.row?.grade) row.grade = 6;
			}
		}
		return send(res, {});
	}
	if (path === '/test/previews') return send(res, previews);
	if (path.includes('/consent-preview')) {
		try {
			rules.parseSettings({
				...(path === '/api/activity-registrations/consent-preview' ? input.settings : input),
				published: false
			});
		} catch (error) {
			const body = error.getResponse?.() ?? { message: error.message };
			return send(
				res,
				typeof body === 'string' ? { message: body } : body,
				error.getStatus?.() ?? 500
			);
		}
		previews.push({
			path,
			unitId: new URL(req.url, 'http://127.0.0.1').searchParams.get('unitId'),
			input
		});
		res.writeHead(200, { 'Content-Type': 'application/pdf' });
		return res.end(previewPdf());
	}
	if (path.endsWith('/check-in')) {
		if (input.revision !== row.revision)
			return send(res, { message: 'Înscriere modificată. Verifică din nou.' }, 409);
		if (input.undo) {
			if (input.confirm !== true) return send(res, { message: 'Confirmă corecția.' }, 400);
			if (input.undo === 'paper')
				row.consentState = row.documents.some((d) => d.kind === 'signed') ? 'uploaded' : 'awaiting';
			else if (input.undo === 'cash') {
				for (const entry of row.entries.filter((entry) => input.entryIds.includes(entry.id))) {
					row.entries.push({
						...entry,
						id: randomUUID(),
						amountBani: -entry.amountBani,
						reversedEntryId: entry.id
					});
					const installment = row.cashInstallments.find(
						(item) => item.key === entry.installmentKey
					);
					installment.remainingBani += entry.amountBani;
					row.cashBani -= entry.amountBani;
					row.remainingBani += entry.amountBani;
				}
				row.cashRemainingBani = row.cashInstallments.reduce(
					(sum, item) => sum + item.remainingBani,
					0
				);
			}
			row.revision++;
			return send(res, { success: true });
		}
		if (input.paper) row.consentState = 'paper_received';
		for (const item of row.cashInstallments ?? [])
			if (input.cashKeys.includes(item.key)) {
				row.entries.push({
					id: randomUUID(),
					method: 'cash',
					amountBani: item.remainingBani,
					installmentKey: item.key,
					receivedOn: '2026-11-12',
					note: 'Cash la predare'
				});
				row.remainingBani -= item.remainingBani;
				row.cashBani += item.remainingBani;
				item.remainingBani = 0;
			}
		row.cashRemainingBani = (row.cashInstallments ?? []).reduce(
			(sum, i) => sum + i.remainingBani,
			0
		);
		row.revision++;
		return send(res, { success: true });
	}
	if (path === '/test/created') return send(res, created);
	if (path === '/test/settings') return send(res, savedSettings);
	if (path === '/test/current-settings')
		return send(res, { revision: settingsRevision, data: settings });
	if (path === '/test/concurrent-next-save') {
		concurrentAfterSave = true;
		return send(res, {});
	}
	if (path === '/api/activity-registrations/1/settings' && req.method === 'POST') {
		if (input.revision !== settingsRevision)
			return send(res, { message: 'Setările au fost modificate. Reîncarcă pagina.' }, 409);
		if (input.data.published && input.data.consent) {
			const missing = Object.keys(schema.fixedConsentLabels).filter(
				(key) =>
					!input.data.consent[key]?.trim() && !schema.fixedConsentOptionalFields.includes(key)
			);
			if (missing.length)
				return send(
					res,
					{
						message: 'Completează informațiile obligatorii ale acordului de participare.',
						issues: missing.map((key) => ({
							field: `consent.${key}`,
							label: schema.fixedConsentLabels[key],
							message: 'Acest câmp este obligatoriu pentru publicare.'
						}))
					},
					400
				);
		}
		savedSettings = input;
		Object.assign(settings, structuredClone(input.data));
		const saved = { revision: ++settingsRevision, data: structuredClone(settings) };
		if (concurrentAfterSave) {
			concurrentAfterSave = false;
			settingsRevision++;
			settings.terms = 'Condiții schimbate de alt organizator';
		}
		return send(res, saved);
	}
	if (path === '/api/activity-registrations/1/publication') {
		if (req.method === 'POST') {
			if (input.revision !== settingsRevision)
				return send(res, { message: 'Setările au fost modificate. Reîncarcă pagina.' }, 409);
			settings.published = input.published;
			settingsRevision++;
			return send(res, { ok: true, revision: settingsRevision });
		}
		return send(res, {
			revision: settingsRevision,
			published: settings.published,
			public: settings.published,
			state: settings.published ? 'published' : 'draft'
		});
	}
	if (path === '/api/activities/team-options')
		return send(res, [
			{ id: 1, displayName: 'Coordonator de test' },
			{ id: 2, displayName: 'Organizator delegat' }
		]);
	if (path === '/api/activity-registrations/setup-options')
		return send(res, {
			settings: { ...settings, published: false, consent: null },
			fee: { percentageBasisPoints: 119, fixedBani: 30 },
			lists
		});
	if (path === '/api/activities' && req.method === 'POST') {
		created = input;
		Object.assign(activity, {
			title: input.title,
			coordinatorId: input.coordinatorId,
			administratorIds: input.administratorIds,
			departments: input.departments
		});
		return send(res, activity);
	}
	if (path === '/api/auth/me')
		return authenticated
			? send(res, {
					id: memberMode ? 2 : 1,
					displayName: 'Coordonator de test',
					email: 'coordinator@example.test',
					roles: memberMode ? [] : ['super_admin'],
					orgoConnection: { orgoUserId: 36805 }
				})
			: send(res, { message: 'Autentificare necesară' }, 401);
	if (path === '/api/activities') return send(res, designMode ? designActivityList() : [activity]);
	if (path === '/api/activities/1') return send(res, activity);
	if (path === '/api/activity-registrations/1/access')
		return send(res, {
			manage: authenticated && !memberMode,
			finance: authenticated && !memberMode,
			sensitive: authenticated && !memberMode,
			consent: authenticated && !memberMode
		});
	if (path.startsWith('/api/audit')) return send(res, designMode ? designAudit : []);
	if (path === '/api/activity-registrations') return send(res, [activity]);
	if (path === '/api/activity-registrations/eligible') return send(res, [activity]);
	if (path === '/api/activity-registrations/1')
		return send(res, {
			activity,
			settings,
			eligibleBranches:
				eligibleBranchesOverride ??
				(settings.unitIds.length || settings.structureIds.length
					? ['temerari']
					: ['lupisori', 'temerari', 'exploratori', 'seniori']),
			fields: participationFields.filter((f) => f.type !== 'signature'),
			information: informationOverride ?? createRepresentativeOrganizerDraft(),
			counts: { beneficiaries: 1, staff: 0 },
			canManage: authenticated
		});
	if (path.endsWith('/overview'))
		return send(res, {
			revision: settingsRevision,
			settings,
			capabilities: settings.testCapabilities ?? {
				manage: true,
				finance: true,
				sensitive: true,
				consent: true
			},
			rows: row ? (designMode ? designRows() : [row]) : [],
			lists,
			priceAdvice: {
				recommendedBani: 51000,
				estimatedFeeBani: 637,
				estimatedNetBani: 50363,
				fee: { percentageBasisPoints: 119, fixedBani: 30 }
			}
		});
	if (designMode) {
		if (path === '/api/activities/1/kitchen') return send(res, designKitchen);
		if (path === '/api/activities/1/kitchen/ingredients') return send(res, designIngredients);
		if (path === '/api/activities/1/kitchen/recipes') return send(res, designRecipes);
		if (path === '/api/activities/1/kitchen/procurement') return send(res, designProcurement);
		if (path.startsWith('/api/finance/documents?') || path === '/api/finance/documents')
			return send(res, designDocuments);
		if (path === '/api/finance/documents/handoff-guidance')
			return send(res, { keezHandoffMode: 'review_first' });
		if (path === '/api/finance/settings')
			return send(res, {
				keezHandoffMode: 'review_first',
				keezConfigured: true,
				keezEnvironment: 'test',
				keezDocumentUploadAvailable: true,
				keezEmailHandoffAvailable: false
			});
	}
	if (path.includes('/documents/') && req.method === 'GET') {
		if (!authenticated) return send(res, {}, 403);
		res.writeHead(200, {
			'Content-Type': 'application/pdf',
			'Content-Disposition': 'attachment; filename="acord-semnat.pdf"'
		});
		return res.end(previewPdf());
	}
	if (path.endsWith('/drafts')) {
		if (!authenticated) return send(res, {}, 401);
		const ownerId = memberMode ? 2 : 1;
		if (req.method === 'GET')
			return send(
				res,
				drafts.filter((d) => d.ownerId === ownerId)
			);
		let draft = input.id ? drafts.find((d) => d.id === input.id && d.ownerId === ownerId) : null;
		if (input.id && !draft && input.revision !== 0) return send(res, {}, 404);
		if (
			draft?.revision === 1 &&
			input.revision === 0 &&
			JSON.stringify(draft.data) === JSON.stringify(input.data)
		)
			return send(res, draft);
		if ((draft?.revision ?? 0) !== input.revision)
			return send(res, { message: 'Înscrierea în curs a fost modificată.' }, 409);
		if (!draft) {
			draft = { id: input.id ?? randomUUID(), revision: 0, ownerId };
			drafts.push(draft);
		}
		draft.revision++;
		draft.data = input.data;
		draft.updatedAt = new Date().toISOString();
		return send(res, draft);
	}
	if (/\/drafts\/[^/]+\/discard$/.test(path)) {
		if (!authenticated) return send(res, {}, 401);
		const draftId = path.split('/').at(-2),
			ownerId = memberMode ? 2 : 1;
		if (!drafts.some((d) => d.id === draftId && d.ownerId === ownerId)) return send(res, {}, 404);
		drafts = drafts.filter((d) => d.id !== draftId || d.ownerId !== ownerId);
		return send(res, { success: true });
	}
	if (path.endsWith('/mine')) return send(res, [row]);
	if (path.endsWith('/prefill'))
		return authenticated
			? send(res, {
					answers: row.answers,
					email: row.email,
					branch: row.branch,
					canSeeMedical: true
				})
			: send(res, {}, 401);
	if (
		path.includes('/personal/') ||
		(path.endsWith(`/registrations/${id}`) && req.method === 'GET')
	)
		return send(res, row);
	if (path.endsWith('/register')) {
		if (authenticated && input.draftId)
			drafts = drafts.filter((d) => d.id !== input.draftId || d.ownerId !== (memberMode ? 2 : 1));
		row.answers = input.answers ?? {};
		row.role = input.role;
		return send(res, {
			id,
			managementToken: token,
			managePath: `/activitati/1/inscriere/${token}`,
			state: row.state
		});
	}
	if (path.endsWith('/lookup'))
		return input.identifier === '999'
			? send(res, { message: 'Înscrie mai întâi participantul la această activitate.' }, 400)
			: send(res, {
					memberName: 'Participant T.',
					remainingBani: row.remainingBani,
					installment: row.installment,
					payable: true,
					state: row.state,
					paymentState: row.paymentState
				});
	if (path.endsWith('/generate')) {
		row.documents = [
			{
				id,
				publicationId: 1,
				answerRevision: 1,
				kind: 'generated',
				filename: 'acord-test.pdf',
				createdAt: new Date().toISOString()
			}
		];
		return send(res, { id });
	}
	if (path.endsWith('/checkout'))
		return send(
			res,
			{ message: 'Plățile către procesator sunt dezactivate în verificarea locală.' },
			503
		);
	if (req.method === 'PATCH' && path.endsWith(`/registrations/${id}`)) {
		if (input.action === 'delete') {
			if (input.revision !== row.revision)
				return send(res, { message: 'Înscriere modificată. Reîncarcă.' }, 409);
			if (row.cashBani || row.supportBani || row.entries.length || row.payments.length)
				return send(
					res,
					{
						message:
							'Înscrierea are înregistrări financiare sau încercări de plată și nu poate fi ștearsă. Folosește retragerea pentru a păstra evidența.'
					},
					409
				);
			row = null;
			return send(res, { success: true });
		}
		if (input.action === 'signed_accepted') row.consentState = 'signed_accepted';
		if (input.action === 'receipt') {
			row.cashBani += input.amountBani;
			row.remainingBani -= input.amountBani;
		}
		return send(res, { success: true });
	}
	return send(res, {});
}).listen(3019, '127.0.0.1', () => console.log('Synthetic activity registration API ready'));
