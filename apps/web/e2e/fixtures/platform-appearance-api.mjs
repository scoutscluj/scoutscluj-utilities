// Synthetic remaining-platform overlay. Unknown calls forward to the isolated membership fixture.
import { createServer } from 'node:http';
const upstream = 'http://127.0.0.1:3018';
const stamp = '2026-11-13T09:30:00Z';
let calls = [];
let inventoryFailure = false;
const items = [
	{
		id: 1,
		name: 'Cort de patrulă pentru 6 persoane',
		quantity: 4,
		category: 'camping',
		subcategory: 'corturi',
		owner: 'Cluj',
		locationDescription: 'Depozit · raftul 2',
		condition: 'Buna',
		isConsumable: false,
		notes: 'Verifică bețele și sacul de transport înainte de plecare.'
	},
	{
		id: 2,
		name: 'Trusă de prim ajutor',
		quantity: 2,
		category: 'sanatate',
		subcategory: 'truse',
		owner: 'Cluj',
		locationDescription: 'Dulapul de echipament',
		condition: 'De verificat',
		isConsumable: true,
		notes: 'Consumabile de completat după camp.'
	},
	{
		id: 3,
		name: 'Busolă de orientare',
		quantity: 12,
		category: 'orientare',
		subcategory: 'busole',
		owner: 'Floresti',
		locationDescription: 'Camera de activități',
		condition: 'Buna',
		isConsumable: false,
		notes: 'Set pentru exercițiile de orientare.'
	}
].map((item) => ({
	...item,
	createdByUserId: 1,
	createdByDisplayName: 'Ana Popescu',
	createdAt: stamp,
	updatedAt: stamp
}));
const option = (value) => ({ value, label: value });
const inventoryOptions = {
	categories: [
		{ value: 'camping', label: 'Camping', subcategories: [{ value: 'corturi', label: 'Corturi' }] },
		{ value: 'sanatate', label: 'Sănătate', subcategories: [{ value: 'truse', label: 'Truse' }] },
		{
			value: 'orientare',
			label: 'Orientare',
			subcategories: [{ value: 'busole', label: 'Busole' }]
		}
	],
	owners: ['Cluj', 'Floresti'].map(option),
	locations: ['Depozit · raftul 2', 'Dulapul de echipament', 'Camera de activități'].map(option),
	conditions: ['Buna', 'De verificat', 'De reparat'].map(option)
};
const documents = ['uploaded', 'needs_clarification', 'sent'].map((status, index) => ({
	id: index + 1,
	uploaderId: 1,
	uploaderName: 'Ana Popescu',
	status,
	originalFilename: [
		'Bon echipament camp.pdf',
		'Factură transport.pdf',
		'Consumabile activități.pdf'
	][index],
	contentType: 'application/pdf',
	fileSize: 48240 + index * 1500,
	checksumSha256: `synthetic-document-${index}`,
	notes: 'Document sintetic pentru verificarea interfeței.',
	...(index === 1
		? {
				reviewerNotes: 'Completează explicația cheltuielii și destinația transportului.',
				activityId: 1,
				activityTitle: 'Camp de toamnă'
			}
		: {}),
	createdAt: stamp,
	updatedAt: stamp
}));
const financeSettings = {
	keezHandoffMode: 'review_first',
	keezConfigured: true,
	keezEnvironment: 'test',
	keezDocumentUploadAvailable: true,
	keezEmailHandoffAvailable: true,
	keezEmailSender: 'contabilitate@example.test',
	keezEmailRecipient: 'arhiva@example.test'
};
const audit = [
	{
		id: 1,
		actorId: 1,
		actorName: 'Ana Popescu',
		action: 'financial_document.status_updated',
		entityType: 'financial_document',
		entityId: '2',
		metadata: {
			fromStatus: 'uploaded',
			toStatus: 'needs_clarification',
			notes: 'Explicație de completat'
		},
		createdAt: stamp
	},
	{
		id: 2,
		actorId: 2,
		actorName: 'Mihai Ionescu',
		action: 'registration.paper_received',
		entityType: 'activity_registration',
		entityId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		activityId: 1,
		metadata: { memberName: 'Maria Popescu' },
		createdAt: '2026-11-13T08:15:00Z'
	}
];
// A complete one-page PDF: byte-accurate object offsets, xref and trailer for PDF.js.
const previewPdf = (() => {
	const stream = 'BT /F1 16 Tf 24 150 Td (Synthetic finance document) Tj ET';
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
		`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
	];
	let output = '%PDF-1.4\n';
	const offsets = [0];
	for (const [index, object] of objects.entries()) {
		offsets.push(Buffer.byteLength(output));
		output += `${index + 1} 0 obj\n${object}\nendobj\n`;
	}
	const xref = Buffer.byteLength(output);
	output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	output += offsets
		.slice(1)
		.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
		.join('');
	output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
	return Buffer.from(output);
})();
const respond = (res, value, status = 200) => {
	res.writeHead(status, {
		'content-type': 'application/json',
		'cache-control': 'private, no-store'
	});
	res.end(JSON.stringify(value));
};
createServer(async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5190');
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Headers', 'content-type');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		return res.end();
	}
	const url = new URL(req.url, 'http://127.0.0.1:3030');
	const path = url.pathname;
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	const body = Buffer.concat(chunks);
	const input = () => (body.length ? JSON.parse(body.toString()) : {});
	if (path === '/test/platform/reset') {
		calls = [];
		inventoryFailure = false;
		return respond(res, {});
	}
	if (path === '/test/platform/state') return respond(res, { calls });
	if (path === '/test/platform/configure') {
		inventoryFailure = input().inventoryFailure ?? false;
		return respond(res, {});
	}
	calls.push({ method: req.method, path: req.url });
	if (path === '/api/inventory/options') return respond(res, inventoryOptions);
	if (path === '/api/inventory/items' && req.method === 'GET') {
		let filtered = items.filter(
			(item) =>
				!url.searchParams.get('search') ||
				item.name
					.toLocaleLowerCase('ro')
					.includes(url.searchParams.get('search').toLocaleLowerCase('ro'))
		);
		for (const field of ['category', 'subcategory', 'owner', 'condition', 'locationDescription'])
			if (url.searchParams.get(field))
				filtered = filtered.filter((item) => item[field] === url.searchParams.get(field));
		const page = Number(url.searchParams.get('page') || 1),
			pageSize = Number(url.searchParams.get('pageSize') || 100);
		return respond(res, {
			items: filtered.slice((page - 1) * pageSize, page * pageSize),
			total: filtered.length,
			page,
			pageSize
		});
	}
	if (path.startsWith('/api/inventory/items') && req.method !== 'GET') {
		if (inventoryFailure)
			return respond(
				res,
				{ message: 'Salvarea sintetică nu este disponibilă. Datele au fost păstrate.' },
				503
			);
		return respond(res, { ...items[0], ...input() });
	}
	if (path === '/api/member-applications' && req.method === 'GET')
		return respond(res, {
			admin: true,
			units: [
				{ id: 'cluj-lupisori', name: 'Lupișori Cluj', structureId: 'cluj', branch: 'lupisori' },
				{ id: 'cluj-temerari', name: 'Temerari Cluj', structureId: 'cluj', branch: 'temerari' }
			],
			applications: [
				{
					id: '11111111-aaaa-4111-8111-111111111111',
					unitId: 'cluj-temerari',
					state: 'pending',
					revision: 2,
					reason: '',
					createdAt: stamp,
					memberId: null,
					family: {
						version: 'synthetic-family-v1',
						plan: 'fam1',
						position: 1,
						count: 2,
						ambiguous: false,
						canSelect: false,
						members: [
							{ name: 'Maria Popescu', active: false, reserved: true },
							{ name: 'Alexandru Popescu', active: true, reserved: false }
						]
					},
					sync: null,
					data: {
						registrationFor: 'other',
						structureId: 'cluj',
						firstName: 'Maria',
						lastName: 'Popescu',
						gender: 'F',
						birthDate: '2014-05-12',
						schooling: 'grade',
						grade: 6,
						email: 'maria@example.test',
						phone: '0700000001',
						forChild: true,
						guardianName: 'Ioana Popescu',
						guardianEmail: 'ioana@example.test',
						guardianPhone: '0700000002',
						guardianRelation: 'Părinte',
						submitterName: 'Ioana Popescu',
						submitterEmail: 'ioana@example.test'
					}
				},
				{
					id: '22222222-aaaa-4222-8222-222222222222',
					unitId: 'cluj-lupisori',
					state: 'needs-information',
					revision: 1,
					reason: 'Completează datele de contact ale părintelui.',
					createdAt: stamp,
					memberId: null,
					family: null,
					sync: null,
					data: {
						registrationFor: 'other',
						structureId: 'cluj',
						firstName: 'Andrei',
						lastName: 'Ionescu',
						gender: 'M',
						birthDate: '2016-03-20',
						schooling: 'grade',
						grade: 4,
						email: 'andrei@example.test',
						phone: '',
						forChild: true,
						guardianName: 'Mihai Ionescu',
						guardianEmail: 'mihai@example.test',
						guardianPhone: '',
						guardianRelation: 'Părinte'
					}
				},
				{
					id: '33333333-aaaa-4333-8333-333333333333',
					unitId: 'cluj-temerari',
					state: 'approved',
					revision: 3,
					reason: '',
					createdAt: stamp,
					memberId: '33333333-3333-4333-8333-333333333333',
					family: null,
					sync: {
						id: 'synthetic-approved-sync',
						state: 'synced',
						message: 'Contul este confirmat în Orgo.'
					},
					data: {
						registrationFor: 'other',
						structureId: 'cluj',
						firstName: 'Elena',
						lastName: 'Stan',
						gender: 'F',
						birthDate: '2012-08-20',
						schooling: 'grade',
						grade: 8,
						email: 'elena@example.test',
						phone: '0700000003',
						forChild: true,
						guardianName: 'Ana Stan',
						guardianEmail: 'ana.stan@example.test',
						guardianPhone: '0700000004',
						guardianRelation: 'Părinte'
					}
				}
			]
		});
	if (path === '/api/member-applications/options')
		return respond(res, {
			units: [
				{ id: 'cluj-lupisori', name: 'Lupișori Cluj', structureId: 'cluj', branch: 'lupisori' },
				{ id: 'cluj-temerari', name: 'Temerari Cluj', structureId: 'cluj', branch: 'temerari' }
			]
		});
	if (path === '/api/activity-registrations')
		return respond(res, [
			{
				id: 1,
				title: 'Camp de primăvară',
				description: 'Ateliere, drumeții și viață de patrulă pentru temerari.',
				location: 'Muntele Băișorii',
				startDate: '2027-04-15T08:00:00Z'
			},
			{
				id: 2,
				title: 'Drumeție de orientare',
				description: 'O zi pe traseu cu harta și busola, alături de echipa de lideri.',
				location: 'Făget, Cluj-Napoca',
				startDate: '2027-03-20T08:00:00Z'
			}
		]);
	if (path === '/api/activities')
		return respond(res, [
			{
				id: 1,
				title: 'Camp de toamnă',
				type: 'camp',
				status: 'planned',
				coordinatorId: 1,
				coordinatorName: 'Ana Popescu',
				startDate: '2026-12-01T08:00:00Z',
				endDate: '2026-12-04T16:00:00Z',
				departments: ['finance']
			}
		]);
	if (path === '/api/audit') return respond(res, audit);
	if (path === '/api/finance/summary')
		return respond(res, {
			totalDocuments: 3,
			generalDocuments: 2,
			activityDocuments: 1,
			openDocuments: 2,
			needsClarification: 1,
			sentDocuments: 1
		});
	if (path === '/api/finance/settings' || path === '/api/finance/documents/handoff-guidance')
		return respond(res, financeSettings);
	if (path === '/api/finance/documents' && req.method === 'GET') return respond(res, documents);
	if (/^\/api\/finance\/documents\/\d+\/file$/.test(path) && req.method === 'GET') {
		res.writeHead(200, {
			'content-type': 'application/pdf',
			'content-length': previewPdf.length,
			'cache-control': 'private, no-store',
			'content-disposition': 'inline; filename="synthetic-finance.pdf"'
		});
		return res.end(previewPdf);
	}
	if (path.startsWith('/api/finance/documents') && req.method !== 'GET')
		return respond(res, { ...documents[0], ...input() }, 201);
	if (path === '/api/members/orgo/outbox')
		return respond(res, {
			members: [
				{
					id: 'synthetic-outbox-1',
					kind: 'roles',
					state: 'review-required',
					name: 'Ana Popescu',
					message: 'Verifică responsabilitatea înainte de a relua sincronizarea.',
					subjectId: '11111111-1111-4111-8111-111111111111',
					createdAt: stamp
				}
			],
			objects: [
				{
					id: 'synthetic-object-1',
					kind: 'subunit',
					state: 'pending',
					name: 'Patrula Lupilor',
					message: 'În așteptarea confirmării structurii.',
					createdAt: stamp
				}
			]
		});
	if (path.endsWith('/preview') && path.startsWith('/api/members/orgo/retry/'))
		return respond(res, {
			id: 'synthetic-outbox-1',
			name: 'Ana Popescu',
			kind: 'roles',
			version: 'synthetic-v1',
			roleCreateStarted: false,
			remoteStatus: 'Activ',
			remoteRoles: [{ name: 'Lider', unitName: 'Temerari Cluj' }],
			changes: [{ label: 'Responsabilitate', local: 'Ajutor de lider', remote: 'Lider' }],
			message: 'Date sintetice pentru verificare. Nicio operație nu este transmisă către Orgo.'
		});
	if (path === '/api/notifications/broadcast/summary')
		return respond(res, { users: 24, devices: 31 });
	if (path === '/api/notifications/broadcast')
		return respond(res, {
			success: true,
			message: 'Trimitere exclusiv sintetică.',
			totalDevices: 31,
			successCount: 30,
			failureCount: 1,
			skippedCount: 0
		});
	const headers = { ...req.headers };
	delete headers.host;
	delete headers.connection;
	delete headers['content-length'];
	try {
		const response = await fetch(`${upstream}${req.url}`, {
			method: req.method,
			headers,
			...(body.length && req.method !== 'GET' && req.method !== 'HEAD' ? { body } : {})
		});
		for (const [name, value] of response.headers)
			if (
				![
					'transfer-encoding',
					'content-length',
					'connection',
					'access-control-allow-origin'
				].includes(name)
			)
				res.setHeader(name, value);
		res.statusCode = response.status;
		res.end(Buffer.from(await response.arrayBuffer()));
	} catch {
		respond(res, { message: 'Fixture membership indisponibil.' }, 503);
	}
}).listen(3030, '127.0.0.1', () => console.log('Synthetic remaining-platform overlay ready'));
