// Local synthetic calendar/auth API. No credentials or production connections.
import { createServer } from 'node:http';

let options = {};
let calls = [];
const today = () =>
	new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());
const addDays = (day, count) => {
	const date = new Date(`${day}T12:00Z`);
	date.setUTCDate(date.getUTCDate() + count);
	return date.toISOString().slice(0, 10);
};
const reply = (res, body, status = 200) => {
	res.writeHead(status, {
		'content-type': 'application/json',
		'cache-control': 'private, no-store'
	});
	res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
	const url = new URL(req.url, 'http://127.0.0.1:3016');
	if (url.pathname === '/test/reset') {
		options = {};
		calls = [];
		return reply(res, {});
	}
	if (url.pathname === '/test/settings') {
		let body = '';
		for await (const chunk of req) body += chunk;
		options = { ...options, ...JSON.parse(body) };
		return reply(res, {});
	}
	if (url.pathname === '/test/state') return reply(res, { calls });
	if (!req.headers.cookie?.includes('synthetic-calendar-session') || options.expired)
		return reply(res, {}, 401);
	if (url.pathname === '/api/auth/me')
		return reply(res, { id: 1, displayName: 'Membru cercetaș', roles: [] });
	if (url.pathname === '/api/auth/logout') {
		options.expired = true;
		return reply(res, {});
	}
	if (url.pathname === '/api/activities') return reply(res, []);
	if (!url.pathname.startsWith('/api/calendars/')) return reply(res, {}, 404);
	const source = url.pathname.split('/').at(-1);
	calls.push({ source, query: Object.fromEntries(url.searchParams) });
	if (options[`${source}Failure`]) return reply(res, { message: 'Synthetic provider outage' }, 503);
	const from = url.searchParams.get('from'),
		to = url.searchParams.get('to');
	const page = {
		range: { from, to },
		fetchedAt: new Date().toISOString(),
		stale: Boolean(options.stale),
		items: []
	};
	if (source === 'events') {
		const first = {
			id: 'event-1',
			title: 'Drumeție de toamnă',
			allDay: false,
			start: new Date(Date.now() - 120000).toISOString(),
			end: new Date(Date.now() + 3600000).toISOString(),
			location: 'Cluj-Napoca',
			description: 'Pregătim traseul împreună.'
		};
		if (Date.parse(from) <= Date.now()) {
			page.items = [first];
			if (url.searchParams.get('cursor'))
				page.items.push({
					...first,
					id: 'event-2',
					title: 'Atelier de orientare',
					start: new Date(Date.now() + 7200000).toISOString(),
					end: new Date(Date.now() + 10800000).toISOString()
				});
			else page.nextCursor = 'events-page-two';
		} else if (options.laterEvent)
			page.items = [
				{
					id: `later-${from}`,
					title: 'Eveniment din perioada următoare',
					allDay: true,
					start: from.slice(0, 10),
					end: addDays(from.slice(0, 10), 1)
				}
			];
	} else {
		const day = today();
		page.items = [1, 2, 3, 4].map((index) => ({
			id: `booking-${index}`,
			title: `Atelier la sediu ${index}`,
			allDay: true,
			start: day,
			end: addDays(day, 1),
			location: 'Sediul centrului local'
		}));
		page.items.push({
			id: 'spanning-booking',
			title: 'Pregătiri pentru tabără',
			allDay: true,
			start: addDays(day, -1),
			end: addDays(day, 1)
		});
		page.items = page.items.filter(
			(event) => event.start < to.slice(0, 10) && event.end > from.slice(0, 10)
		);
		if (options.headquartersPagination && !url.searchParams.get('cursor')) {
			page.items = page.items.slice(0, 1);
			page.nextCursor = 'headquarters-page-two';
		}
	}
	if (options.showcase && source === 'events') {
		const day = today();
		page.items = [
			{
				id: 'showcase-1',
				title: 'AG Vest Cluj',
				allDay: false,
				start: `${addDays(day, 8)}T10:30:00+02:00`,
				end: `${addDays(day, 8)}T15:00:00+02:00`,
				location: 'Scouts Cluj · Piața Mihai Viteazu 25, Cluj-Napoca',
				description: 'AG Vest Cluj'
			},
			{
				id: 'showcase-2',
				title: 'Microstagiu de Introducere în Cercetășie',
				allDay: false,
				start: `${addDays(day, 9)}T10:30:00+02:00`,
				end: `${addDays(day, 9)}T13:30:00+02:00`,
				description: 'Pregătim împreună activitățile noului an cercetășesc.'
			},
			{
				id: 'showcase-3',
				title: 'Roverhood (seniori) · Măguri Răcătău',
				allDay: true,
				start: addDays(day, 35),
				end: addDays(day, 40),
				description: 'Roverhood (seniori) · Măguri Răcătău'
			}
		];
		delete page.nextCursor;
	}
	if (options.showcase && source === 'headquarters') {
		const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(
			new Date(from)
		);
		page.items = [
			'Întâlnire lupișori Cluj Vest',
			'Întâlnire temerari · clasa a VII-a',
			'Explo Vest C1 & C2',
			'C3 Teme a VI-a Vest',
			'Întâlnire eXplo Nord',
			'Întâlnire teme Vest a V-a'
		].map((title, index) => {
			const date = addDays(day, Math.min(index, 4));
			return {
				id: `showcase-booking-${index}`,
				title,
				allDay: false,
				start: `${date}T18:30:00+03:00`,
				end: `${date}T20:00:00+03:00`,
				...(index === 1 ? { location: 'Camera 1' } : {})
			};
		});
	}
	if (options.dense && source === 'events') {
		page.items = page.items.map((event) => ({
			...event,
			description: 'Informații despre participare și programul activității.'
		}));
	}
	if (options.formattedDescription && page.items[0]) {
		page.items[0].description =
			'<p><strong>Program</strong> &amp; <em>echipament</em><br /><u>Important</u></p>' +
			'<ul><li>Bocanci</li><li>Apă</li></ul><ol><li>Înscriere</li></ol>' +
			'<p><a href="https://example.test/inscriere" target="_blank" rel="noopener noreferrer">Formular</a></p>';
	}
	return reply(res, page);
}).listen(3016, '127.0.0.1');
