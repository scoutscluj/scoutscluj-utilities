import { expect, test } from '@playwright/test';
const id = '11111111-1111-4111-8111-111111111111';
const fees = [
	{
		current: true,
		period: '2026–2027',
		totalBani: 30000,
		nationalBani: 15000,
		nationalDirectBani: 15000,
		localPaidBani: 0,
		paidBani: 15000,
		remainingBani: 15000,
		collectible: true
	}
];
test.beforeEach(async ({ context }) => {
	await context.addCookies([
		{ name: 'scoutscluj_session', value: 'synthetic', url: 'http://127.0.0.1:5237' }
	]);
});

test('member page renders while Orgo is held, then updates fees without resetting an edited form', async ({
	page,
	request
}) => {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	let checks = 0;
	await page.route('**/units/fees', async (route) => {
		checks++;
		await gate;
		await route.fulfill({ json: { results: [{ id, state: 'synced', fees }] } });
	});
	const start = performance.now();
	await page.goto(`/units/${id}`);
	await expect(page.getByRole('heading', { name: 'Membru test rapid' })).toBeVisible();
	expect(performance.now() - start).toBeLessThan(3000);
	await expect(page.getByText('Se verifică cotizațiile în Orgo…')).toBeVisible();
	await page.getByText('Contacte personale', { exact: true }).click();
	await page.locator('input[name="profile.phone"]').fill('0712345678');
	release();
	await expect(page.getByText('achitat direct în Orgo', { exact: false })).toBeVisible();
	await expect(page.locator('input[name="profile.phone"]')).toHaveValue('0712345678');
	expect(checks).toBe(1);
	expect(await (await request.get('http://127.0.0.1:3037/test/stats')).json()).toEqual({
		blockingRequests: 0
	});
});

test('each list opening checks Orgo and updates fee rows while keeping the list usable', async ({
	page
}) => {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	let checks = 0;
	await page.route('**/units/fees', async (route) => {
		checks++;
		await gate;
		try {
			await route.fulfill({ json: { results: [{ id, state: 'synced', fees }] } });
		} catch {
			/* Navigation may cancel the previous load. */
		}
	});
	await page.goto('/units');
	await expect(page.getByRole('link', { name: 'Membru test rapid', exact: true })).toBeVisible();
	release();
	await expect(
		page.getByRole('button', { name: 'Cotizații pentru Membru test rapid' })
	).toContainText('Parțial achitată');
	const before = checks;
	await page.reload();
	await expect.poll(() => checks).toBeGreaterThan(before);
});

test('fee dialog opens with saved fees even while national verification is unavailable', async ({
	page
}) => {
	await page.route('**/units/fees', (route) => route.fulfill({ status: 503, body: '{}' }));
	await page.goto('/units');
	await page.getByRole('button', { name: 'Acțiuni pentru Membru test rapid' }).click();
	await page.getByRole('menuitem', { name: 'Cotizații', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Cotizații · Membru test rapid' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Total', { exact: false })).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Reîncearcă verificarea' })).toBeVisible();
});
