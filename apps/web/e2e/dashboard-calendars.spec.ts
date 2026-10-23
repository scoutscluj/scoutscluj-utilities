import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3016';
test.beforeEach(async ({ page, request }) => {
	await request.post(`${api}/test/reset`);
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-calendar-session',
			url: 'http://127.0.0.1:5183'
		}
	]);
});

test('requires sign-in for both the dashboard and continuation endpoint', async ({ page }) => {
	await page.context().clearCookies();
	for (const path of ['/', '/info/calendar', '/sediu/orar']) {
		await page.goto(path);
		await expect(page).toHaveURL(/\/login/);
	}
	const response = await page.request.get(
		'/calendar-data/events?from=2026-10-23T00:00:00Z&to=2026-11-23T00:00:00Z'
	);
	expect(response.status()).toBe(401);
	expect(response.headers()['cache-control']).toContain('no-store');
});

test('paginates the agenda, retries the same cursor, and advances beyond empty windows', async ({
	page,
	request
}) => {
	const response = await page.goto('/');
	expect(response!.headers()['cache-control']).toContain('no-store');
	const agenda = page.getByRole('region', { name: 'Următoarele evenimente' });
	await expect(agenda.getByRole('heading', { name: 'Drumeție de toamnă' })).toHaveCount(1);
	await expect(agenda.getByText('În desfășurare')).toBeVisible();
	const details = agenda.getByRole('button', { name: /^Detalii pentru / });
	await expect(details).toHaveAttribute('aria-expanded', 'false');
	await details.click();
	await expect(agenda.getByText('Pregătim traseul împreună.')).toBeVisible();
	await request.post(`${api}/test/settings`, { data: { eventsFailure: true } });
	await agenda.getByRole('button', { name: 'Încarcă mai multe' }).click();
	await expect(agenda.getByRole('alert')).toBeVisible();
	await expect(agenda.getByRole('heading', { name: 'Drumeție de toamnă' })).toHaveCount(1);
	await request.post(`${api}/test/settings`, { data: { eventsFailure: false } });
	await agenda.getByRole('button', { name: 'Reîncearcă', exact: true }).click();
	await expect(agenda.getByRole('heading', { name: 'Atelier de orientare' })).toBeVisible();
	await expect(agenda.getByRole('heading', { name: 'Drumeție de toamnă' })).toHaveCount(1);
	await agenda.getByRole('button', { name: 'Încarcă mai multe' }).click();
	await expect(agenda.getByRole('button', { name: 'Încarcă mai multe' })).toBeEnabled();
	await request.post(`${api}/test/settings`, { data: { laterEvent: true } });
	await agenda.getByRole('button', { name: 'Încarcă mai multe' }).click();
	await expect(
		agenda.getByRole('heading', { name: 'Eveniment din perioada următoare' })
	).toBeVisible();
	const state = await (await request.get(`${api}/test/state`)).json();
	const calls = state.calls.filter((call: { source: string }) => call.source === 'events');
	expect(calls[1].query.cursor).toBe(calls[2].query.cursor);
	expect(calls[3].query.from).toBe(calls[2].query.to);
	expect(calls[4].query.from).toBe(calls[3].query.to);
});

test('shows clear event indicators without repeated titles at responsive sizes', async ({
	page,
	request
}, info) => {
	await request.post(`${api}/test/settings`, { data: { showcase: true } });
	for (const width of [1440, 1024, 768, 375]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		const agenda = page.getByRole('region', { name: 'Următoarele evenimente' });
		await expect(agenda.getByRole('heading', { name: 'AG Vest Cluj', exact: true })).toBeVisible();
		await expect(agenda.getByRole('button', { name: /^Detalii pentru / })).toHaveCount(1);
		await expect(agenda.getByRole('button', { name: /^Detalii pentru / })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		await expect(agenda.locator('.event-time svg')).toHaveCount(3);
		for (const card of await agenda.locator('.has-details').all()) {
			const time = (await card.locator('.event-time svg').boundingBox())!;
			const info = (await card.locator('.details-toggle > svg').first().boundingBox())!;
			expect(Math.abs(info.y + info.height / 2 - (time.y + time.height / 2))).toBeLessThan(1);
		}
		const range = agenda.locator('.agenda-day').filter({ hasText: 'Roverhood' });
		const endpoints = range.locator('.date-badge');
		await expect(endpoints).toHaveCount(2);
		await expect(range.locator('.date-connector')).toBeVisible();
		await expect(range.locator('.end-date')).toHaveCount(0);
		const expected = await page.evaluate(() => {
			const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(
				new Date()
			);
			return [35, 39].map((offset) => {
				const date = new Date(`${today}T12:00:00Z`);
				date.setUTCDate(date.getUTCDate() + offset);
				return String(date.getUTCDate());
			});
		});
		await expect(endpoints.locator('strong')).toHaveText(expected);
		const firstDate = (await endpoints.first().boundingBox())!;
		const lastDate = (await endpoints.last().boundingBox())!;
		const connector = (await range.locator('.date-connector').boundingBox())!;
		expect(firstDate.width).toBe(44);
		expect(lastDate.x).toBe(firstDate.x);
		expect(lastDate.y).toBeGreaterThan(firstDate.y + firstDate.height);
		expect(connector.y).toBeCloseTo(firstDate.y + firstDate.height, 0);
		expect(connector.y + connector.height).toBeCloseTo(lastDate.y, 0);
		const rangeCard = (await range.locator('.event-card').boundingBox())!;
		expect(rangeCard.y).toBeCloseTo(firstDate.y, 0);
		expect(rangeCard.y + rangeCard.height).toBeCloseTo(lastDate.y + lastDate.height, 0);
		await expect(agenda.locator('.agenda-day').first().locator('.date-badge')).toHaveCount(1);
		if (width === 1440) {
			const card = agenda.locator('.event-card').first();
			const title = await card.locator('h4').boundingBox();
			const time = await card.locator('.event-meta').boundingBox();
			expect(time!.x).toBeGreaterThan(title!.x + title!.width);
			expect(Math.abs(time!.y - title!.y)).toBeLessThan(18);
			expect((await card.boundingBox())!.height).toBeLessThan(90);
			const booking = page.locator('.week-agenda .event-card').first();
			expect((await booking.boundingBox())!.height).toBeLessThan(65);
		}
		await expect(page.getByRole('region', { name: 'Calendar Sediu', exact: true })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			width
		);
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({
			path: info.outputPath(`calendar-redesign-${width}.png`),
			fullPage: true
		});
	}
	await request.post(`${api}/test/settings`, { data: { dense: true } });
	await page.setViewportSize({ width: 1653, height: 1000 });
	await page.goto('/');
	const withDetails = page.getByRole('region', { name: 'Următoarele evenimente' });
	await expect(withDetails.getByRole('button', { name: /^Detalii pentru / })).toHaveCount(3);
	for (const row of await withDetails.locator('.agenda-day').all()) {
		const time = (await row.locator('.event-time svg').boundingBox())!;
		const info = (await row.locator('.details-toggle > svg').first().boundingBox())!;
		expect(Math.abs(info.y + info.height / 2 - (time.y + time.height / 2))).toBeLessThan(1);
		const card = (await row.locator('.event-card').boundingBox())!;
		const dateRail = (await row.locator('.date-rail').boundingBox())!;
		if ((await row.locator('.date-badge').count()) === 1) expect(card.height).toBeLessThan(95);
		else {
			expect(card.y).toBeCloseTo(dateRail.y, 0);
			expect(card.height).toBeCloseTo(dateRail.height, 0);
		}
	}
	await page.screenshot({ path: info.outputPath('calendar-compact-1653.png'), fullPage: true });
});

test('reuses the matching calendar on each dedicated page without loading the other source', async ({
	page,
	request
}, info) => {
	for (const width of [1440, 375]) {
		await page.setViewportSize({ width, height: 1000 });
		await request.post(`${api}/test/reset`);
		const eventsResponse = await page.goto('/info/calendar');
		expect(eventsResponse!.headers()['cache-control']).toContain('no-store');
		await expect(page).toHaveTitle('Calendar Evenimente | Scouts Cluj Utilities');
		await expect(page.locator('.events-widget')).toBeVisible();
		await expect(page.locator('.headquarters-widget, iframe, .calendar-link')).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Drumeție de toamnă' })).toBeVisible();
		await page.getByRole('button', { name: 'Încarcă mai multe' }).click();
		await expect(page.getByRole('heading', { name: 'Atelier de orientare' })).toBeVisible();
		const eventsState = await (await request.get(`${api}/test/state`)).json();
		expect(eventsState.calls.length).toBeGreaterThanOrEqual(2);
		expect(new Set(eventsState.calls.map((call: { source: string }) => call.source))).toEqual(
			new Set(['events'])
		);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			width
		);
		await page.screenshot({ path: info.outputPath(`events-page-${width}.png`), fullPage: true });

		await request.post(`${api}/test/reset`);
		const headquartersResponse = await page.goto('/sediu/orar');
		expect(headquartersResponse!.headers()['cache-control']).toContain('no-store');
		await expect(page.locator('.headquarters-widget')).toBeVisible();
		await expect(page.locator('.events-widget, iframe, .calendar-link')).toHaveCount(0);
		await expect(page.locator('.week-agenda > section')).toHaveCount(7);
		await page.getByRole('button', { name: 'Lună', exact: true }).click();
		await expect(page.locator('.month-grid')).toBeVisible();
		await page.locator('.month-day.current').click();
		await expect(
			page.locator('.selected-day').getByRole('heading', { name: 'Atelier la sediu 4' })
		).toBeVisible();
		const headquartersState = await (await request.get(`${api}/test/state`)).json();
		expect(headquartersState.calls.length).toBeGreaterThanOrEqual(2);
		expect(new Set(headquartersState.calls.map((call: { source: string }) => call.source))).toEqual(
			new Set(['headquarters'])
		);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			width
		);
		await page.screenshot({
			path: info.outputPath(`headquarters-page-${width}.png`),
			fullPage: true
		});
	}
	await page.goto('/');
	await page.locator('.events-widget .calendar-link').click();
	await expect(page).toHaveURL(/\/info\/calendar$/);
	await expect(page.locator('.events-widget')).toBeVisible();
	await page.goto('/');
	await page.locator('.headquarters-widget .calendar-link').click();
	await expect(page).toHaveURL(/\/sediu\/orar$/);
	await expect(page.locator('.headquarters-widget')).toBeVisible();
});

test('clears dedicated calendars when their continuation session expires', async ({
	page,
	request
}) => {
	for (const source of ['events', 'headquarters']) {
		await request.post(`${api}/test/reset`);
		await page.context().addCookies([
			{
				name: 'scoutscluj_session',
				value: 'synthetic-calendar-session',
				url: 'http://127.0.0.1:5183'
			}
		]);
		await page.goto(source === 'events' ? '/info/calendar' : '/sediu/orar');
		await request.post(`${api}/test/settings`, { data: { expired: true } });
		await page
			.getByRole('button', {
				name: source === 'events' ? 'Încarcă mai multe' : 'Lună',
				exact: true
			})
			.click();
		await expect(page).toHaveURL(/\/login/);
		await expect(page.locator('.event-card')).toHaveCount(0);
	}
});

test('renders formatted calendar descriptions in both widgets', async ({ page, request }) => {
	await request.post(`${api}/test/settings`, {
		data: { showcase: true, formattedDescription: true }
	});
	await page.goto('/');
	for (const widget of [
		page.locator('.events-widget'),
		page.getByRole('region', { name: 'Calendar Sediu', exact: true })
	]) {
		const card = widget.locator('.event-card').first();
		const toggle = card.getByRole('button', { name: /^Detalii pentru / });
		await toggle.click();
		const description = card.locator('.description');
		await expect(description).toBeVisible();
		await expect(description.locator('strong')).toHaveText('Program');
		await expect(description.locator('em')).toHaveText('echipament');
		await expect(description.locator('ul > li')).toHaveText(['Bocanci', 'Apă']);
		await expect(description.locator('ol > li')).toHaveText(['Înscriere']);
		await expect(description.getByRole('link', { name: 'Formular' })).toHaveAttribute(
			'href',
			'https://example.test/inscriere'
		);
		await expect(description).not.toContainText('<p>');
		await toggle.click();
		await expect(description).toBeHidden();
	}
});

test('opens details from the whole card and keeps map links independent', async ({
	page,
	request,
	context
}) => {
	await request.post(`${api}/test/settings`, {
		data: { showcase: true, formattedDescription: true }
	});
	await context.route('https://www.google.com/maps/**', (route) =>
		route.fulfill({ body: 'Map preview' })
	);
	await context.route('https://example.test/**', (route) => route.fulfill({ body: 'Event link' }));
	for (const width of [1440, 375]) {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		for (const widget of [
			page.locator('.events-widget'),
			page.getByRole('region', { name: 'Calendar Sediu', exact: true })
		]) {
			const card = widget.locator('.event-card').first();
			const toggle = card.getByRole('button', { name: /^Detalii pentru / });
			await expect(card).toHaveCSS('cursor', 'pointer');
			await card.click({ position: { x: 12, y: 12 } });
			await expect(toggle).toHaveAttribute('aria-expanded', 'true');
			await expect(card.locator('.description')).toBeVisible();
			await card.click({ position: { x: 12, y: 12 } });
			await expect(toggle).toHaveAttribute('aria-expanded', 'false');
			await toggle.focus();
			await page.keyboard.press('Enter');
			await expect(toggle).toHaveAttribute('aria-expanded', 'true');
			await page.keyboard.press('Space');
			await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		}
		const card = page.locator('.events-widget .event-card').first();
		const toggle = card.getByRole('button', { name: /^Detalii pentru / });
		const location = card.getByRole('link', { name: /în Google Maps/ });
		await expect(location).toHaveCSS('cursor', 'pointer');
		await expect(location).toHaveAttribute('target', '_blank');
		await expect(location).toHaveAttribute('rel', 'noopener noreferrer');
		const mapOpened = page.waitForEvent('popup');
		await location.click();
		const map = await mapOpened;
		await map.waitForLoadState();
		expect(new URL(map.url()).searchParams.get('query')).toBe(
			'Scouts Cluj · Piața Mihai Viteazu 25, Cluj-Napoca'
		);
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await map.close();
		await toggle.click();
		const linkOpened = page.waitForEvent('popup');
		await card.getByRole('link', { name: 'Formular', exact: true }).click();
		const link = await linkOpened;
		await link.waitForLoadState();
		expect(link.url()).toBe('https://example.test/inscriere');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await link.close();
	}
});

test('shows a vertical week and month overflow, preserves date selection, and navigates periods', async ({
	page
}, info) => {
	await page.goto('/');
	const headquarters = page.getByRole('region', { name: 'Calendar Sediu', exact: true });
	await expect(headquarters.locator('.week-agenda > section')).toHaveCount(7);
	const boxes = await headquarters
		.locator('.week-agenda > section')
		.evaluateAll((elements) =>
			elements.map((el) => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y }))
		);
	expect(boxes[0].x).toBe(boxes[1].x);
	expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
	await expect(page.locator('iframe')).toHaveCount(0);
	await page.screenshot({ path: info.outputPath('dashboard-week-desktop.png'), fullPage: true });
	await headquarters.getByRole('button', { name: 'Lună', exact: true }).click();
	await expect(headquarters.locator('.month-grid')).toBeVisible();
	expect(await headquarters.locator('.month-day').count()).toBeGreaterThanOrEqual(28);
	expect((await headquarters.locator('.month-day').count()) % 7).toBe(0);
	await headquarters.locator('.month-day.current').click();
	await expect(headquarters.locator('.overflow')).toContainText('+3');
	const selected = headquarters.locator('.selected-day');
	await expect(selected.getByRole('heading', { name: 'Atelier la sediu 4' })).toBeVisible();
	await page.screenshot({ path: info.outputPath('dashboard-month-desktop.png'), fullPage: true });
	const previous = await headquarters.locator('.period').textContent();
	await headquarters.getByRole('button', { name: 'Perioada următoare' }).click();
	await expect(headquarters.locator('.period')).not.toHaveText(previous!);
	await headquarters.getByRole('button', { name: 'Astăzi', exact: true }).click();
	await expect(headquarters.locator('.period')).toHaveText(previous!);
	await headquarters.getByRole('button', { name: 'Săptămână', exact: true }).click();
	await expect(headquarters.locator('.week-agenda > section')).toHaveCount(7);
});

test('keeps both widgets usable on mobile, including month date keyboard selection', async ({
	page
}, info) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	const headquarters = page.getByRole('region', { name: 'Calendar Sediu', exact: true });
	await headquarters.scrollIntoViewIfNeeded();
	await expect(headquarters).toBeVisible();
	await headquarters.getByRole('button', { name: 'Lună', exact: true }).click();
	const day = headquarters.locator('.month-day.current');
	await day.focus();
	await page.keyboard.press('Enter');
	await expect(day).toHaveAttribute('aria-pressed', 'true');
	await expect(headquarters.locator('.selected-day')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.screenshot({ path: info.outputPath('dashboard-month-mobile.png'), fullPage: true });
});

test('handles independent errors, stale data and headquarters pagination', async ({
	page,
	request
}) => {
	await request.post(`${api}/test/settings`, {
		data: { eventsFailure: true, headquartersPagination: true, stale: true }
	});
	await page.goto('/');
	const agenda = page.getByRole('region', { name: 'Următoarele evenimente' });
	const headquarters = page.getByRole('region', { name: 'Calendar Sediu', exact: true });
	await expect(agenda.getByRole('alert')).toBeVisible();
	await expect(headquarters.getByText(/Date neactualizate/)).toBeVisible();
	await headquarters.getByRole('button', { name: 'Încarcă restul rezervărilor' }).click();
	await expect(headquarters.getByRole('heading', { name: 'Atelier la sediu 4' })).toBeVisible();
	await request.post(`${api}/test/settings`, { data: { eventsFailure: false } });
	await agenda.getByRole('button', { name: 'Reîncearcă', exact: true }).click();
	await expect(agenda.getByRole('heading', { name: 'Drumeție de toamnă' })).toBeVisible();
});

test('clears calendar content on session expiry', async ({ page, request }) => {
	await page.goto('/');
	await request.post(`${api}/test/settings`, { data: { expired: true } });
	await page.getByRole('button', { name: 'Încarcă mai multe' }).click();
	await expect(page).toHaveURL(/\/login/);
	await expect(page.getByText('Drumeție de toamnă')).toHaveCount(0);
	await page.context().clearCookies();
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
	await page.context().setOffline(true);
	await page.goBack().catch(() => null);
	await expect(page.getByText('Drumeție de toamnă')).toHaveCount(0);
});

for (const path of ['/', '/info/calendar', '/sediu/orar']) {
	test(`logout and the service worker cannot restore calendar snapshots offline at ${path}`, async ({
		page
	}) => {
		const privateTitle = path === '/sediu/orar' ? 'Atelier la sediu 1' : 'Drumeție de toamnă';
		await page.goto(path);
		await page.evaluate(async () => {
			await navigator.serviceWorker.register('/service-worker.js');
			await navigator.serviceWorker.ready;
		});
		await expect
			.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
			.toBe(true);
		await page.reload();
		await expect(page.getByRole('heading', { name: privateTitle })).toBeVisible();
		await page.request.post('/auth/logout');
		await page.goto(path);
		await expect(page).toHaveURL(/\/login/);
		const cachedCalendar = await page.evaluate(async (privateTitle) => {
			for (const name of await caches.keys()) {
				const cache = await caches.open(name);
				for (const request of await cache.keys()) {
					const response = await cache.match(request);
					if (
						response?.headers.get('content-type')?.includes('text/html') &&
						(await response.text()).includes(privateTitle)
					)
						return true;
				}
			}
			return false;
		}, privateTitle);
		expect(cachedCalendar).toBe(false);
		await page.context().setOffline(true);
		await page.goto(path).catch(() => null);
		await expect(page.getByText(privateTitle)).toHaveCount(0);
	});
}
