// Synthetic API for UI checks. It never reads real members or connects to a payment provider.
import { createServer } from 'node:http';
import schema from '../../../../packages/parental-consent-schema/dist/index.js';
const { participationFields, createRepresentativeOrganizerDraft } = schema;
const id = '11111111-1111-4111-8111-111111111111';
const token = 'a'.repeat(43);
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
let row;
let created = null;
let savedSettings = null;
let settingsRevision = 1;
let concurrentAfterSave = false;
const originalSettings = structuredClone(settings);
const originalActivity = structuredClone(activity);
function reset() {
	Object.assign(activity, originalActivity);
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
	if (path === '/api/activities/team-options')
		return send(res, [
			{ id: 1, displayName: 'Coordonator de test' },
			{ id: 2, displayName: 'Organizator delegat' }
		]);
	if (path === '/api/activity-registrations/setup-options')
		return send(res, {
			settings: { ...settings, published: false, consent: null },
			fee: { percentageBasisPoints: 119, fixedBani: 30 },
			lists: { structures: [{ id: 'cluj', name: 'Cluj' }], units: [], groups: [] }
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
	if (path.startsWith('/api/audit')) return send(res, []);
	if (path === '/api/activity-registrations') return send(res, [activity]);
	if (path === '/api/activity-registrations/eligible') return send(res, [activity]);
	if (path === '/api/activity-registrations/1')
		return send(res, {
			activity,
			settings,
			fields: participationFields.filter((f) => f.type !== 'signature'),
			information: createRepresentativeOrganizerDraft(),
			counts: { beneficiaries: 1, staff: 0 },
			canManage: authenticated
		});
	if (path.endsWith('/overview'))
		return send(res, {
			revision: settingsRevision,
			settings,
			capabilities: { manage: true, finance: true, sensitive: true, consent: true },
			rows: [row],
			lists: { structures: [{ id: 'cluj', name: 'Cluj' }], units: [], groups: [] },
			priceAdvice: {
				recommendedBani: 51000,
				estimatedFeeBani: 637,
				estimatedNetBani: 50363,
				fee: { percentageBasisPoints: 119, fixedBani: 30 }
			}
		});
	if (path.endsWith('/mine')) return send(res, [row]);
	if (path.endsWith('/prefill'))
		return authenticated
			? send(res, {
					answers: row.answers,
					email: row.email,
					branch: 'lupisori',
					canSeeMedical: true
				})
			: send(res, {}, 401);
	if (
		path.includes('/personal/') ||
		(path.endsWith(`/registrations/${id}`) && req.method === 'GET')
	)
		return send(res, row);
	if (path.endsWith('/register')) {
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
		if (input.action === 'receipt') {
			row.cashBani += input.amountBani;
			row.remainingBani -= input.amountBani;
		}
		return send(res, { success: true });
	}
	return send(res, {});
}).listen(3019, '127.0.0.1', () => console.log('Synthetic activity registration API ready'));
