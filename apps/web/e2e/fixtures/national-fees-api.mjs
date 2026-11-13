// Synthetic data; this fixture never connects to Orgo or a database.
import { createServer } from 'node:http';
const id = '11111111-1111-4111-8111-111111111111';
const access = {
	read: true,
	detail: true,
	fees: true,
	edit: true,
	identity: false,
	transfer: false,
	sensitive: false,
	own: false,
	notes: false
};
const fee = {
	current: true,
	period: '2026–2027',
	totalBani: 30000,
	nationalBani: 15000,
	nationalDirectBani: 0,
	localPaidBani: 0,
	paidBani: 0,
	remainingBani: 30000,
	collectible: true
};
const member = {
	id,
	orgoId: 49643,
	name: 'Membru test rapid',
	structureId: 'cluj',
	status: 'active',
	grade: 6,
	category: 'temerari',
	branch: 'temerari',
	unitId: null,
	groupId: null,
	adultKind: null,
	revision: 1,
	access,
	feeSummary: fee
};
const registry = {
	structures: [{ id: 'cluj', name: 'Cluj' }],
	delegableRoles: [],
	admin: false,
	canManage: false,
	canFinance: false,
	manageableStructureIds: [],
	chiefUnitIds: [],
	units: [],
	members: [member],
	notices: [],
	progressionEnabled: false,
	sync: [],
	transitions: [],
	ownMemberId: null
};
let blockingRequests = 0;
const send = (res, body, status = 200) => {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
};
createServer(async (req, res) => {
	const path = new URL(req.url, 'http://localhost').pathname;
	if (path === '/api/auth/me') return send(res, { id: 1, displayName: 'Lider test', roles: [] });
	if (path === '/api/activities' || path === '/api/activity-registrations/eligible')
		return send(res, []);
	if (path === '/api/adult-documents/access') return send(res, { admin: false });
	if (path === '/api/member-applications/pending-count') return send(res, { count: 0 });
	if (path.startsWith('/api/members/orgo/'))
		return send(res, { state: 'idle', message: null, lastSucceededAt: null });
	if (path === '/api/members' || path === `/api/members/${id}/context`) return send(res, registry);
	if (path === `/api/members/${id}/fees`) return send(res, [fee]);
	if (path === `/api/members/${id}`)
		return send(res, {
			member: {
				...member,
				birthDate: '2013-03-01',
				profile: {},
				promiseDate: null,
				skipProgressionYear: null
			},
			access,
			notes: [],
			assignments: [],
			fees: [fee],
			sync: []
		});
	if (path === '/api/membership/national-status/batch') return send(res, { results: [] });
	if (path.endsWith('/national-status')) {
		blockingRequests++;
		await new Promise((resolve) => setTimeout(resolve, 20000));
		return send(res, { state: 'synced' });
	}
	if (path === '/test/stats') return send(res, { blockingRequests });
	return send(res, {}, 404);
}).listen(3037, '127.0.0.1');
