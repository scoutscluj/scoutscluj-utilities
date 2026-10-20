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
	await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('');
	await expect(page.getByRole('link', { name: 'Istoric 01', exact: true })).toHaveCount(0);
	await page.locator('summary').filter({ hasText: 'Istoric Orgo: membri inactivi (52)' }).click();
	const history = page.locator('section').filter({
		has: page.locator('summary').filter({ hasText: 'Istoric Orgo: membri inactivi (52)' })
	});
	await expect(history.locator('td > a')).toHaveCount(25);
	await expect(history.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
	await history.getByRole('button', { name: 'Următor', exact: true }).click();
	await expect(history.getByRole('link', { name: 'Istoric 26', exact: true })).toBeVisible();
	await history.getByLabel('Caută în istoricul Orgo').fill('Istoric 01');
	await expect(history.getByRole('link')).toHaveCount(1);
	await expect(history.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
});

test('structure filtering and initial classification keep unit choices consistent', async ({
	page,
	request
}) => {
	await page.goto('/units');
	await page
		.getByRole('combobox', { name: 'Structură', exact: true })
		.first()
		.selectOption('floresti');
	await expect(page.getByRole('link', { name: 'Copil Florești', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).not.toBeVisible();
	await page.locator('summary').filter({ hasText: 'Adaugă membru' }).click();
	const create = page
		.locator('form')
		.filter({ has: page.locator('input[name="action"][value="create"]') });
	await create.getByLabel('Structură').selectOption('floresti');
	await expect(
		create.getByRole('combobox', { name: 'Unitate', exact: true }).locator('option')
	).toHaveText(['Alege unitatea', 'Temerari Florești']);
	await page.goto('/units/structures');
	const confirm = page.getByRole('button', { name: 'Confirmă repartizarea' });
	await expect(confirm).toBeDisabled();
	await page.getByRole('combobox', { name: 'Unitate', exact: true }).selectOption('u3');
	await page
		.getByRole('checkbox', { name: 'Am verificat toate repartizările, inclusiv membrii inactivi.' })
		.check();
	await expect(confirm).toBeEnabled();
	await confirm.click();
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		confirm: true,
		members: [{ id: 'm1', structureId: 'floresti', unitId: 'u3' }]
	});
});

test('selects filtered Floresti members and confirms the bulk change after preview', async ({
	page,
	request
}) => {
	await page.goto('/units');
	await page.getByLabel('Caută membru', { exact: true }).fill('floresti');
	await expect(page.getByRole('link', { name: 'Copil Florești', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Selectează toate rezultatele (1)', exact: true }).click();
	await page.getByRole('button', { name: 'Modifică selecția', exact: true }).click();
	await page.getByRole('combobox', { name: 'Modificare', exact: true }).selectOption('structure');
	await page.getByRole('button', { name: 'Previzualizează modificarea', exact: true }).click();
	await page.getByRole('checkbox', { name: 'Am verificat selecția și modificarea.' }).check();
	await page.getByRole('button', { name: 'Aplică pentru 1 persoane', exact: true }).click();
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		members: [{ id: 'm2', revision: 1 }],
		changes: { kind: 'structure', structureId: 'floresti' },
		confirm: true,
		version: 'preview-version'
	});
});

test('selects all inactive results across pages and opens the withdrawal preview', async ({
	page
}) => {
	await page.goto('/units');
	const history = page.locator('section').filter({
		has: page.locator('summary').filter({ hasText: 'Istoric Orgo: membri inactivi (52)' })
	});
	await history.locator('summary').first().click();
	await history.getByRole('button', { name: 'Selectează toate rezultatele (52)' }).click();
	await history.getByRole('button', { name: 'Modifică selecția', exact: true }).click();
	await history.getByRole('button', { name: 'Previzualizează modificarea', exact: true }).click();
	await expect(history.getByRole('button', { name: 'Aplică pentru 52 persoane' })).toBeVisible();
});

test('opens fee details from the member menu and confirms only a local bank contribution', async ({
	page,
	request
}) => {
	await page.goto('/units');
	const row = page
		.getByRole('row')
		.filter({ has: page.getByRole('link', { name: 'Ana Popescu', exact: true }) });
	await row.locator('summary').click();
	await row
		.getByRole('button', { name: 'Național achitat în Orgo / partea locală', exact: true })
		.click();
	await page
		.locator('summary')
		.filter({ hasText: 'Național achitat în Orgo — confirmă partea locală' })
		.click();
	await page.getByLabel('Referință transfer bancar').fill('BT-local');
	await page.getByLabel('Data încasării').fill('2026-10-20');
	await page
		.getByRole('button', { name: 'Verifică naționalul și confirmă partea locală', exact: true })
		.click();
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		obligationId: '33333333-3333-4333-8333-333333333333',
		reference: 'BT-local',
		receivedOn: '2026-10-20'
	});
});
