// Synthetic member data only; no Orgo calls or real account mutations.
import { createServer } from 'node:http';
const categories = {
	lupisori: 'Lupișori',
	temerari: 'Temerari',
	exploratori: 'Exploratori',
	seniori: 'Seniori',
	lideri: 'Lideri',
	voluntari: 'Voluntari adulți',
	scouteri: 'Scouteri'
};
const units = ['cluj', 'floresti'].flatMap((structureId) =>
	Object.entries(categories).map(([branch, name]) => ({
		id: structureId + '-' + branch,
		structureId,
		branch,
		name,
		parentId: null,
		grades: [],
		archived: false,
		fixed: true,
		canManage: true,
		canCreateMember: true,
		delegateRoles: ['helper', 'leader', 'chief']
	}))
);
units.push({
	id: 'cluj-exploratori-grup',
	structureId: 'cluj',
	branch: 'exploratori',
	name: 'Patrula test',
	parentId: 'cluj-exploratori',
	grades: [],
	archived: false,
	canManage: true
});
const access = {
	delegate: true,
	detail: true,
	fees: false,
	edit: true,
	transfer: true,
	withdraw: true,
	identity: true,
	read: true,
	sensitive: false,
	own: false
};
const leader = {
	id: '11111111-1111-4111-8111-111111111111',
	name: 'Lider adult test',
	revision: 1,
	structureId: 'cluj',
	category: 'lideri',
	branch: 'lideri',
	adultKind: 'leader',
	unitId: 'cluj-lideri',
	groupId: null,
	status: 'active',
	grade: 9,
	roles: ['leader'],
	responsibilityUnitIds: ['cluj-temerari'],
	responsibilityGroupIds: [],
	responsibilities: [],
	access
};
const child = {
	id: '22222222-2222-4222-8222-222222222222',
	name: 'Beneficiar test',
	revision: 1,
	structureId: 'cluj',
	category: 'temerari',
	branch: 'temerari',
	adultKind: null,
	unitId: 'cluj-temerari',
	groupId: null,
	status: 'active',
	grade: 6,
	roles: ['beneficiary'],
	access: { ...access, delegate: false }
};
const secondChild = {
	...child,
	id: '33333333-3333-4333-8333-333333333333',
	name: 'Beneficiar secundar test',
	grade: 5
};
const initialChildren = structuredClone([child, secondChild]);
const registry = {
	admin: true,
	canManage: true,
	canFinance: false,
	homeStructureId: 'cluj',
	manageableStructureIds: ['cluj', 'floresti'],
	structures: [
		{ id: 'cluj', name: 'Cluj' },
		{ id: 'floresti', name: 'Florești' }
	],
	delegableRoles: ['helper', 'leader', 'chief'],
	chiefUnitIds: [],
	units,
	members: [leader, child, secondChild],
	notices: [],
	progressionEnabled: false,
	sync: [],
	transitions: [],
	ownMemberId: null
};
let designMode = false;
let pendingApplications = 0;
let assignment = null;
let assignmentError = false;
let bulkError = false;
let bulkRequests = [];
const send = (res, body, status = 200) => {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
};
createServer(async (req, res) => {
	const path = new URL(req.url, 'http://localhost').pathname;
	let input = {};
	if (req.method === 'POST') {
		let data = '';
		for await (const chunk of req) data += chunk;
		if (data) input = JSON.parse(data);
	}
	if (path === '/test/reset') {
		designMode = false;
		pendingApplications = 0;
		assignment = null;
		assignmentError = false;
		bulkError = false;
		bulkRequests = [];
		Object.assign(child, structuredClone(initialChildren[0]));
		Object.assign(secondChild, structuredClone(initialChildren[1]));
		registry.admin = true;
		registry.notices = [];
		return send(res, {});
	}
	if (path === '/test/configure') {
		if (typeof input.designMode === 'boolean') designMode = input.designMode;
		if (typeof input.pendingApplications === 'number')
			pendingApplications = input.pendingApplications;
		assignmentError = !!input.assignmentError;
		bulkError = !!input.bulkError;
		if (input.mixedStructures) secondChild.structureId = 'floresti';
		if (input.admin === false) registry.admin = false;
		if (input.notices) registry.notices = input.notices;
		return send(res, {});
	}
	if (path === '/test/assignment') return send(res, assignment);
	if (path === '/test/bulk') return send(res, bulkRequests);
	if (path === '/test/members') return send(res, registry.members);
	if (path === '/api/auth/me')
		return send(res, {
			id: 1,
			displayName: 'Administrator test',
			roles: ['super_admin'],
			orgoConnection: { orgoUserId: 1 }
		});
	if (path === '/api/activities' || path === '/api/activity-registrations/eligible')
		return send(res, []);
	if (path === '/api/members/orgo/refresh' || path === '/api/members/orgo/refresh-status')
		return send(res, { state: 'idle', message: null, lastSucceededAt: new Date().toISOString() });
	if (path === '/api/member-applications/pending-count')
		return send(res, { count: pendingApplications });
	if (path === '/api/members/orgo')
		return send(res, {
			message: 'Registru sintetic pregătit pentru verificare.',
			version: 'synthetic-orgo-v1',
			serverToken: true,
			writesEnabled: false,
			importedUnitIds: [8001],
			units: [{ id: 8001, name: 'Temerari Cluj', parent: null, type: 'TEMERARI' }],
			members: [
				{ id: 90002, name: 'Beneficiar test', status: 'ACTIVE', type: 'Temerar', roles: [] }
			],
			inactiveMembers: [{ id: 90003, name: 'Membru retras de test' }]
		});
	if (path === '/api/members/structures/preview')
		return send(res, {
			structures: registry.structures,
			units: [
				{
					id: 'legacy-temerari',
					name: 'Patrula de test Cluj',
					structureId: 'cluj',
					branch: 'temerari',
					convert: false,
					parentId: 'cluj-temerari'
				}
			],
			members: registry.members
				.filter((member) => member.id !== leader.id)
				.map((member) => ({
					id: member.id,
					name: member.name,
					revision: member.revision,
					unitId: member.unitId,
					inactive: false,
					category: member.category,
					structureId: member.structureId
				}))
		});
	if (path === '/api/members' || /^\/api\/members\/[^/]+\/context$/.test(path))
		return send(res, registry);
	if (path === '/api/members/bulk') {
		bulkRequests.push(input);
		if (bulkError)
			return send(res, { message: 'Selecția s-a schimbat. Reîncarcă registrul.' }, 409);
		if (!input.confirm) return send(res, { applied: false, version: 'synthetic-version' });
		if (input.version !== 'synthetic-version')
			return send(res, { message: 'Versiune invalidă.' }, 409);
		for (const selected of input.members) {
			const member = registry.members.find((m) => m.id === selected.id);
			if (input.changes.kind === 'grade') member.grade = Number(input.changes.grade);
			if (input.changes.kind === 'transfer') {
				member.unitId = input.changes.unitId;
				member.groupId = input.changes.groupId || null;
			}
			if (input.changes.kind === 'structure') {
				member.structureId = input.changes.structureId;
				member.unitId = member.structureId + '-' + member.category;
				member.groupId = null;
			}
			member.revision += 1;
		}
		return send(res, { applied: true });
	}
	if (path.endsWith('/assignments')) {
		if (assignmentError)
			return send(
				res,
				{ message: 'Responsabilitatea nu a putut fi salvată în verificarea locală.' },
				400
			);
		assignment = input;
		return send(res, { ok: true });
	}
	const detailMember =
		req.method === 'GET'
			? registry.members.find((member) => path === '/api/members/' + member.id)
			: undefined;
	if (detailMember) {
		const isLeader = detailMember.id === leader.id;
		return send(res, {
			member: {
				...detailMember,
				birthDate: isLeader ? '1990-01-01' : '2013-05-12',
				promiseDate: null,
				skipProgressionYear: null,
				profile: {
					email: isLeader ? 'lider@example.test' : 'beneficiar@example.test',
					phone: '0700000000',
					parentName: isLeader ? '' : 'Părinte de test',
					parentPhone: isLeader ? '' : '0700000001',
					parentEmail: isLeader ? '' : 'parinte@example.test',
					emergencyName: 'Contact de test',
					emergencyPhone: '0700000002',
					...(designMode
						? {
								medical: 'Fără afecțiuni declarate',
								allergies: 'Alune',
								medication: 'Fără tratament permanent',
								dietary: 'Vegetarian',
								needs: 'Preferă instrucțiuni scrise pentru activități.'
							}
						: {})
				},
				orgoFields: {},
				orgoProfile: {
					id: isLeader ? 90001 : 90002,
					firstName: isLeader ? 'Lider' : 'Beneficiar',
					lastName: 'Test',
					email: isLeader ? 'lider@example.test' : 'beneficiar@example.test',
					status: 'ACTIVE',
					localCenter: { id: 8, name: 'Centrul Local Cluj' }
				},
				orgoReadonly: [],
				conflicts: {},
				photoData: null
			},
			access: {
				...detailMember.access,
				notes: true,
				...(designMode ? { fees: true, recordFees: true, sensitive: true } : {})
			},
			admission: null,
			assignments: [],
			notes: [],
			history: [],
			sync: [],
			fees: designMode
				? [
						{
							period: '2026–2027',
							current: true,
							periodId: 'synthetic-period',
							obligationId: 'synthetic-obligation',
							totalBani: 45500,
							nationalBani: 15000,
							nationalDirectBani: 15000,
							localPaidBani: 10000,
							paidBani: 25000,
							remainingBani: 20500,
							collectible: true
						}
					]
				: []
		});
	}
	return send(res, {});
}).listen(3020, '127.0.0.1', () => console.log('Synthetic member responsibility API ready'));
