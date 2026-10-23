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
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
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

test('logout and the service worker cannot restore authenticated calendar snapshots offline', async ({
	page
}) => {
	await page.goto('/');
	await page.evaluate(async () => {
		await navigator.serviceWorker.register('/service-worker.js');
		await navigator.serviceWorker.ready;
	});
	await expect
		.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
		.toBe(true);
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Drumeție de toamnă' })).toBeVisible();
	await page.request.post('/auth/logout');
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
	const cachedCalendar = await page.evaluate(async () => {
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			for (const request of await cache.keys()) {
				const response = await cache.match(request);
				if (
					response?.headers.get('content-type')?.includes('text/html') &&
					(await response.text()).includes('Drumeție de toamnă')
				)
					return true;
			}
		}
		return false;
	});
	expect(cachedCalendar).toBe(false);
	await page.context().setOffline(true);
	await page.goto('/').catch(() => null);
	await expect(page.getByText('Drumeție de toamnă')).toHaveCount(0);
});
