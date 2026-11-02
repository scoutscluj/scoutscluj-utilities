// Synthetic UI fixture. No production credentials, emails or Orgo calls.
import { createServer } from 'node:http';
const unit = { id: '11111111-1111-4111-8111-111111111111', name: 'Temerari', structureId: 'cluj' };
let rows = [],
	starts = 0;
createServer(async (req, res) => {
	const path = new URL(req.url, 'http://localhost').pathname;
	let body = {};
	if (req.method === 'POST') {
		let text = '';
		for await (const part of req) text += part;
		body = JSON.parse(text || '{}');
	}
	const send = (value, status = 200) => {
		res.writeHead(status, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(value));
	};
	if (path === '/test/reset') {
		rows = [];
		starts = 0;
		return send({ ok: true });
	}
	if (path === '/test/state') return send({ rows, starts });
	if (path === '/api/auth/me')
		return send({ id: 1, displayName: 'Admin de test', roles: ['super_admin'] });
	if (['/api/activities', '/api/activity-registrations/eligible'].includes(path)) return send([]);
	if (path === '/api/adult-documents/access') return send({ admin: true });
	if (path === '/api/member-applications/options') return send({ units: [unit] });
	if (path === '/api/members/orgo/bootstrap') {
		if (req.method === 'POST') starts++;
		return send({ state: 'succeeded', lastSucceededAt: new Date().toISOString() });
	}
	if (path === '/api/members/orgo/outbox') return send({ members: [], objects: [] });
	if (path === '/api/member-applications' && req.method === 'GET')
		return send({ admin: true, units: [unit], applications: rows });
	if (
		['/api/member-applications', '/api/member-applications/create'].includes(path) &&
		req.method === 'POST'
	) {
		if (!rows.some((r) => r.requestKey === body.requestKey))
			rows.push({
				id: '22222222-2222-4222-8222-222222222222',
				requestKey: body.requestKey,
				unitId: body.unitId,
				state: 'pending',
				revision: 1,
				reason: '',
				createdAt: new Date().toISOString(),
				memberId: null,
				data: body,
				sync: null
			});
		return send({ received: true });
	}
	if (path.endsWith('/review')) {
		const row = rows[0];
		if (body.action === 'approve') {
			row.state = 'approved';
			row.revision++;
			row.sync = { state: 'pending', message: 'Înscriere aprobată. Se pregătește contul Orgo.' };
		}
		return send({ ok: true });
	}
	return send({ message: 'Fixture route missing' }, 404);
}).listen(3027, '127.0.0.1');
