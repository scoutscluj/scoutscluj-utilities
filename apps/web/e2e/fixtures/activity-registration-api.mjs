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
		if (input.paper) row.consentState = 'paper_received';
		for (const item of row.cashInstallments ?? [])
			if (input.cashKeys.includes(item.key)) {
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
	if (path === '/api/activities') return send(res, [activity]);
	if (path === '/api/activities/1') return send(res, activity);
	if (path === '/api/activity-registrations/1/access')
		return send(res, {
			manage: authenticated && !memberMode,
			finance: authenticated && !memberMode,
			sensitive: authenticated && !memberMode,
			consent: authenticated && !memberMode
		});
	if (path.startsWith('/api/audit')) return send(res, []);
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
			rows: [row],
			lists,
			priceAdvice: {
				recommendedBani: 51000,
				estimatedFeeBani: 637,
				estimatedNetBani: 50363,
				fee: { percentageBasisPoints: 119, fixedBani: 30 }
			}
		});
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
		if (input.action === 'signed_accepted') row.consentState = 'signed_accepted';
		if (input.action === 'receipt') {
			row.cashBani += input.amountBani;
			row.remainingBani -= input.amountBani;
		}
		return send(res, { success: true });
	}
	return send(res, {});
}).listen(3019, '127.0.0.1', () => console.log('Synthetic activity registration API ready'));
