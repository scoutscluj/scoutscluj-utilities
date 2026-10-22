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
	await page.goto('/admin/members');
	await expect(page.getByRole('heading', { name: 'Membri și unități', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ana Popescu' })).toBeVisible();
	await expect(page.getByLabel('Nume complet')).not.toBeVisible();
	await expect(
		page.getByRole('complementary').getByText('Micro-stagii', { exact: true })
	).toHaveCount(0);
	await page.getByRole('button', { name: 'Adaugă membru', exact: true }).click();
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
	await page.goto('/admin/members');
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
	await page.goto('/admin/members');
	await page
		.getByRole('combobox', { name: 'Structură', exact: true })
		.first()
		.selectOption('floresti');
	await expect(page.getByRole('link', { name: 'Copil Florești', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).not.toBeVisible();
	await page.getByRole('button', { name: 'Adaugă membru', exact: true }).click();
	const create = page
		.locator('form')
		.filter({ has: page.locator('input[name="action"][value="create"]') });
	await create.getByLabel('Structură').selectOption('floresti');
	await expect(
		create.getByRole('combobox', { name: 'Unitate', exact: true }).locator('option')
	).toHaveText(['Alege unitatea', 'Temerari Florești']);
	await page.goto('/admin/members/structures');
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
	await page.goto('/admin/members');
	await page.getByLabel('Caută membru', { exact: true }).fill('floresti');
	await expect(page.getByRole('link', { name: 'Copil Florești', exact: true })).toBeVisible();
	await page
		.getByRole('region', { name: 'Registrul membrilor', exact: true })
		.getByRole('checkbox', { name: 'Selectează pagina curentă' })
		.check();
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
	await page.goto('/admin/members');
	const history = page.locator('section').filter({
		has: page.locator('summary').filter({ hasText: 'Istoric Orgo: membri inactivi (52)' })
	});
	await history.locator('summary').first().click();
	await history.getByRole('combobox', { name: 'Rânduri pe pagină' }).selectOption('0');
	await history.getByRole('checkbox', { name: 'Selectează pagina curentă' }).check();
	await history.getByRole('button', { name: 'Modifică selecția', exact: true }).click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: 'Previzualizează modificarea', exact: true })
		.click();
	await expect(
		page.getByRole('dialog').getByRole('button', { name: 'Aplică pentru 52 persoane' })
	).toBeVisible();
});

test('opens fee details from the member menu and confirms only a local bank contribution', async ({
	page,
	request
}) => {
	await page.goto('/admin/members');
	const row = page
		.getByRole('row')
		.filter({ has: page.getByRole('link', { name: 'Ana Popescu', exact: true }) });
	await row.getByRole('button', { name: 'Acțiuni pentru Ana Popescu' }).click();
	await page.getByRole('menuitem', { name: 'Cotizații', exact: true }).click();
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

test('member actions open a focused modal without expanding the row and return keyboard focus', async ({
	page
}, testInfo) => {
	await page.goto('/admin/members');
	const trigger = page.getByRole('button', { name: 'Acțiuni pentru Ana Popescu', exact: true });
	const row = page.getByRole('row').filter({ has: trigger });
	const height = (await row.boundingBox())!.height;
	await trigger.click();
	await page.getByRole('menuitem', { name: 'Schimbă clasa', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Schimbă clasa · Ana Popescu' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('combobox', { name: 'Modificare', exact: true })).toHaveCount(0);
	await expect(dialog.getByRole('spinbutton', { name: 'Clasa', exact: true })).toHaveValue('5');
	expect((await row.boundingBox())!.height).toBe(height);
	await page.screenshot({ path: testInfo.outputPath('member-action-dialog.png') });
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
});

test('registry supports sorting, column visibility, page sizes and scoped selection', async ({
	page
}, testInfo) => {
	await page.goto('/admin/members');
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	const nameHeader = registry
		.getByRole('columnheader')
		.filter({ has: page.getByRole('button', { name: /^Membru/ }) });
	await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
	await nameHeader.getByRole('button').click();
	await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
	await registry.getByRole('combobox', { name: 'Rânduri pe pagină' }).selectOption('10');
	await registry.locator('summary').filter({ hasText: 'Coloane' }).click();
	await registry.getByRole('checkbox', { name: 'Clasa', exact: true }).uncheck();
	await expect(registry.getByRole('columnheader').filter({ hasText: 'Clasa' })).toHaveCount(0);
	await registry.getByRole('checkbox', { name: 'Selectează pagina curentă' }).check();
	await expect(
		registry.getByRole('button', { name: 'Modifică selecția', exact: true })
	).toBeVisible();
	await page.getByLabel('Caută membru', { exact: true }).fill('Nobody-matches');
	await expect(
		registry.getByRole('button', { name: 'Modifică selecția', exact: true })
	).toHaveCount(0);
	await expect(registry.getByText('Nu există membri pentru filtrele alese.')).toBeVisible();
	await page.getByLabel('Caută membru', { exact: true }).fill('');
	await registry.locator('summary').filter({ hasText: 'Coloane' }).click();
	await page.screenshot({ path: testInfo.outputPath('registry-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			page
				.getByRole('complementary', { includeHidden: true })
				.evaluate((el) => el.getBoundingClientRect().right)
		)
		.toBeLessThanOrEqual(0);
	await page.screenshot({ path: testInfo.outputPath('registry-mobile.png'), fullPage: true });
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('users table filters roles, searches identities, pages and opens role dialogs', async ({
	page
}, testInfo) => {
	await page.goto('/admin/users');
	await expect(page.getByRole('heading', { name: 'Voluntar 01', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Următor', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Voluntar 26', exact: true })).toBeVisible();
	await page.getByRole('combobox', { name: 'Rol', exact: true }).selectOption('finance_manager');
	await expect(page.getByRole('heading', { name: 'Voluntar 01', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Voluntar 02', exact: true })).toHaveCount(0);
	await page.getByLabel('Caută utilizator').fill('voluntar3@example.test');
	await expect(page.getByRole('heading', { name: 'Voluntar 03', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Acțiuni pentru Voluntar 03' }).click();
	await page.getByRole('menuitem', { name: 'Schimbă rolurile' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await page.getByLabel('Caută utilizator').fill('');
	await page.screenshot({ path: testInfo.outputPath('users-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			page
				.getByRole('complementary', { includeHidden: true })
				.evaluate((el) => el.getBoundingClientRect().right)
		)
		.toBeLessThanOrEqual(0);
	await page.screenshot({ path: testInfo.outputPath('users-mobile.png'), fullPage: true });
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('unit archiving requires a separate confirmation and cancellation keeps the unit', async ({
	page,
	request
}) => {
	await page.goto('/admin/members');
	await page.getByRole('button', { name: 'Unități și grupe', exact: true }).click();
	await page.getByRole('button', { name: 'Acțiuni pentru Temerari', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Arhivează', exact: true }).click();
	const confirmation = page.getByRole('dialog', { name: 'Arhivează Temerari', exact: true });
	await expect(confirmation).toBeVisible();
	await confirmation.getByRole('button', { name: 'Anulează', exact: true }).click();
	await expect(confirmation).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: 'Acțiuni pentru Temerari', exact: true })
	).toBeVisible();
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions).toHaveLength(0);
});

test('browsing stays compact and management lives in Admin', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/units');
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await expect(page.getByText('CENTRUL LOCAL CLUJ', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Registru', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Selectează toate rezultatele/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Adaugă membru', exact: true })).toHaveCount(0);
	const filters = registry.getByRole('combobox');
	const boxes = await filters.evaluateAll((nodes) =>
		nodes.map((node) => node.getBoundingClientRect().bottom)
	);
	expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThanOrEqual(1);
	await expect(registry.getByRole('navigation')).toContainText('1–2 din 2');
	await expect(registry.getByRole('option', { name: '500', exact: true })).toHaveCount(1);
	await expect(registry.getByRole('option', { name: 'Toate (2)', exact: true })).toHaveCount(1);
	await page.screenshot({
		path: testInfo.outputPath('compact-directory-desktop.png'),
		fullPage: true
	});
	await page.getByRole('link', { name: 'Administrare', exact: true }).last().click();
	await expect(page).toHaveURL(/\/admin\/members$/);
	await page.getByRole('button', { name: 'Adaugă membru', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Adaugă membru', exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			page
				.getByRole('complementary', { includeHidden: true })
				.evaluate((el) => el.getBoundingClientRect().right)
		)
		.toBeLessThanOrEqual(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
	await page.screenshot({
		path: testInfo.outputPath('compact-management-mobile.png'),
		fullPage: true
	});
});

test('read-only members can browse but cannot open member administration', async ({ page }) => {
	await page
		.context()
		.addCookies([{ name: 'scoutscluj_session', value: 'read-only', url: 'http://127.0.0.1:5182' }]);
	await page.goto('/units');
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Administrare', exact: true })).toHaveCount(0);
	const response = await page.goto('/admin/members');
	expect(response?.status()).toBe(403);
});
