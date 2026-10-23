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
	return reply(res, page);
}).listen(3016, '127.0.0.1');
