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
	if (path === '/api/members') return send(res, registry);
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
	if (path === '/api/members/' + leader.id) {
		return send(res, {
			member: {
				...leader,
				birthDate: '1990-01-01',
				promiseDate: null,
				profile: {},
				orgoFields: {},
				orgoProfile: {},
				orgoReadonly: [],
				photoData: null
			},
			access,
			assignments: [],
			notes: [],
			history: [],
			sync: [],
			fees: []
		});
	}
	return send(res, {});
}).listen(3020, '127.0.0.1', () => console.log('Synthetic member responsibility API ready'));
