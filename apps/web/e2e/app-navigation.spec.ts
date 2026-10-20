import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
	await request.post('http://127.0.0.1:3015/test/reset');
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-finance-session',
			url: 'http://127.0.0.1:5182'
		}
	]);
});
test('desktop menu stays in the viewport and scrolls independently without moving the page', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 1280, height: 600 });
	await page.goto('/admin/finance/membership');
	const sidebar = page.getByRole('complementary', { name: 'Meniu principal' });
	const nav = sidebar.locator('nav');
	await expect(sidebar).toBeVisible();
	await expect.poll(() => nav.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
	await page.mouse.move(1000, 500);
	await page.mouse.wheel(0, 700);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	expect((await sidebar.boundingBox())?.y).toBe(0);
	expect((await sidebar.boundingBox())?.height).toBe(600);
	const pageScroll = await page.evaluate(() => window.scrollY);
	await nav.evaluate((el) => {
		el.scrollTop = 0;
	});
	await page.mouse.move(120, 280);
	await page.mouse.wheel(0, 400);
	await expect.poll(() => nav.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
	await nav.evaluate((el) => {
		el.scrollTop = el.scrollHeight;
	});
	await page.mouse.wheel(0, 700);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageScroll);
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
	await page.screenshot({ path: testInfo.outputPath('desktop-independent-menu.png') });
});
test('mobile menu locks background scrolling, contains keyboard focus and closes with Escape', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/admin/finance/membership');
	const sidebar = page.getByRole('complementary', { name: 'Meniu principal', includeHidden: true });
	const open = page.getByRole('button', { name: 'Deschide meniul', exact: true });
	await expect(sidebar).toHaveAttribute('inert', '');
	await open.click();
	const close = sidebar.getByRole('button', { name: 'Închide meniul' });
	await expect(close).toBeFocused();
	await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
	await page.keyboard.press('Shift+Tab');
	expect(await sidebar.evaluate((el) => el.contains(document.activeElement))).toBe(true);
	await page.screenshot({ path: testInfo.outputPath('mobile-menu.png') });
	await page.keyboard.press('Escape');
	await expect(open).toBeFocused();
	await expect(open).toHaveAttribute('aria-expanded', 'false');
	await expect(sidebar).toHaveAttribute('inert', '');
	await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
	await open.click();
	await close.click();
	await expect(open).toHaveAttribute('aria-expanded', 'false');
});
test('member registry keeps occasional actions collapsed and offers only groups in the chosen unit', async ({
	page
}) => {
	await page.goto('/units');
	await expect(page.getByRole('heading', { name: 'Unități și membri', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ana Popescu' })).toBeVisible();
	await expect(page.getByLabel('Nume complet')).not.toBeVisible();
	await expect(
		page.getByRole('complementary').getByText('Micro-stagii', { exact: true })
	).toHaveCount(0);
	await page.locator('summary').filter({ hasText: 'Adaugă membru' }).click();
	await expect(page.getByLabel('Nume complet')).toBeVisible();
	const group = page.getByRole('combobox', { name: 'Grupă', exact: true });
	await expect(group).toBeDisabled();
	await page.getByRole('combobox', { name: 'Unitate', exact: true }).selectOption('u1');
	await expect(group).toBeEnabled();
	await expect(group.locator('option')).toHaveText([
		'Colectiv comun / nerepartizat',
		'Temerari / Grupa temerari'
	]);
	await page.getByRole('combobox', { name: 'Unitate', exact: true }).selectOption('u2');
	await expect(group.locator('option')).toHaveText([
		'Colectiv comun / nerepartizat',
		'Lupișori / Grupa lupișori'
	]);
});

test('inactive Orgo history stays separate and supports paging and search', async ({ page }) => {
	await page.goto('/units');
	await page.getByLabel('Status', { exact: true }).selectOption('');
	await expect(page.getByRole('link', { name: 'Istoric 01', exact: true })).toHaveCount(0);
	await page.locator('summary').filter({ hasText: 'Membri inactivi din Orgo (52)' }).click();
	const history = page.getByRole('region', { name: 'Membri inactivi din Orgo' });
	await expect(history.getByRole('link')).toHaveCount(25);
	await expect(history.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
	await history.getByRole('button', { name: 'Înainte', exact: true }).click();
	await expect(history.getByRole('link', { name: 'Istoric 26', exact: true })).toBeVisible();
	await history.getByLabel('Caută membru inactiv').fill('Istoric 01');
	await expect(history.getByRole('link')).toHaveCount(1);
	await expect(history.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
});
