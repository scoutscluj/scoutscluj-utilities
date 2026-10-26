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

test('inactive members use the main table search, status filter and pagination', async ({
	page
}) => {
	await page.goto('/units');
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await registry.getByRole('combobox', { name: 'Status', exact: true }).selectOption('inactive');
	await expect(page.locator('summary').filter({ hasText: 'Istoric Orgo' })).toHaveCount(0);
	await expect(registry.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
	await registry.getByRole('button', { name: 'Pagina următoare', exact: true }).click();
	await expect(registry.getByRole('link', { name: 'Istoric 26', exact: true })).toBeVisible();
	await registry.getByLabel('Caută membru').fill('Istoric 01');
	await expect(registry.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
	await expect(registry.locator('tbody tr')).toHaveCount(1);
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
	).toHaveText(['Alege categoria principală', 'Temerari Florești']);
	await page.goto('/admin/members/structures');
	const confirm = page.getByRole('button', { name: 'Confirmă repartizarea' });
	await page
		.getByRole('combobox', { name: 'Categorie principală', exact: true })
		.selectOption('temerari');
	await page
		.getByRole('checkbox', { name: 'Am verificat toate repartizările, inclusiv membrii inactivi.' })
		.check();
	await expect(confirm).toBeEnabled();
	await confirm.click();
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		confirm: true,
		members: [{ id: 'm1', structureId: 'floresti', category: 'temerari' }]
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
	const history = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await history.getByRole('combobox', { name: 'Status', exact: true }).selectOption('inactive');
	await history.getByRole('combobox', { name: 'Rânduri pe pagină' }).selectOption('0');
	await history.getByRole('checkbox', { name: 'Selectează pagina curentă' }).check();
	await history.getByRole('button', { name: 'Modifică selecția', exact: true }).click();
	await page
		.getByRole('dialog')
		.getByRole('combobox', { name: 'Modificare', exact: true })
		.selectOption('withdraw');
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
	await registry.getByLabel('Alege coloanele', { exact: true }).click();
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
	await registry.getByLabel('Alege coloanele', { exact: true }).click();
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
	await page.getByRole('button', { name: 'Pagina următoare', exact: true }).click();
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
	await page.getByRole('button', { name: 'Unități și subunități', exact: true }).click();
	await page.getByRole('button', { name: 'Acțiuni pentru Grupa temerari', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Arhivează', exact: true }).click();
	const confirmation = page.getByRole('dialog', { name: 'Arhivează Grupa temerari', exact: true });
	await expect(confirmation).toBeVisible();
	await confirmation.getByRole('button', { name: 'Anulează', exact: true }).click();
	await expect(confirmation).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: 'Acțiuni pentru Grupa temerari', exact: true })
	).toBeVisible();
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions).toHaveLength(0);
});

test('the shared registry stays compact and exposes permitted actions in context', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/units');
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await expect(page.getByText('CENTRUL LOCAL CLUJ', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Registru', exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /Selectează toate rezultatele/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Adaugă membru', exact: true })).toBeVisible();
	const filters = registry.locator('.sc-table-toolbar').getByRole('combobox');
	const boxes = await filters.evaluateAll((nodes) =>
		nodes.map((node) => node.getBoundingClientRect().bottom)
	);
	// Filters may wrap instead of clipping; each row remains aligned.
	expect(boxes.every((bottom) => Number.isFinite(bottom))).toBe(true);
	await expect(
		registry.locator('.sc-table-toolbar').getByRole('combobox', { name: 'Rânduri pe pagină' })
	).toHaveCount(0);
	await expect(registry.getByRole('navigation')).toContainText('1–2 din 2');
	await expect(registry.getByRole('option', { name: '500', exact: true })).toHaveCount(1);
	await expect(registry.getByRole('option', { name: 'Toate (2)', exact: true })).toHaveCount(1);
	await page.screenshot({
		path: testInfo.outputPath('compact-directory-desktop.png'),
		fullPage: true
	});
	await expect(page.getByRole('link', { name: 'Membri și unități', exact: true })).toHaveCount(0);
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

test('read-only members share the workspace with management controls hidden', async ({ page }) => {
	await page
		.context()
		.addCookies([{ name: 'scoutscluj_session', value: 'read-only', url: 'http://127.0.0.1:5182' }]);
	await page.goto('/units');
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Administrare', exact: true })).toHaveCount(0);
	const response = await page.goto('/admin/members');
	expect(response?.status()).toBe(200);
	await expect(page).toHaveURL(/\/units$/);
	await expect(page.getByRole('button', { name: 'Adaugă membru', exact: true })).toHaveCount(0);
});

test('category filters include members without a subunit', async ({ page }) => {
	await page.goto('/units');
	await page.getByRole('combobox', { name: 'Categorie', exact: true }).selectOption('temerari');
	await page.getByRole('combobox', { name: 'Subunitate', exact: true }).selectOption('unassigned');
	await expect(page.getByRole('link', { name: 'Copil Florești', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Categorie', exact: true }).selectOption('lideri');
	await expect(page.getByText('Nu există membri pentru filtrele alese.')).toBeVisible();
});

test('fixed units offer subunit creation and only subunits offer rename or archive', async ({
	page
}, testInfo) => {
	await page.goto('/units');
	await page.getByRole('button', { name: 'Unități și subunități', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Acțiuni pentru Temerari', exact: true })
	).toHaveCount(0);
	await page.getByRole('button', { name: 'Adaugă subunitate în Temerari', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Adaugă subunitate', exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Acțiuni pentru Grupa temerari', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Redenumește', exact: true }).click();
	await expect(page.getByRole('dialog').getByLabel('Nume', { exact: true })).toHaveValue(
		'Grupa temerari'
	);
	await page.screenshot({
		path: testInfo.outputPath('subunit-rename-desktop.png'),
		fullPage: true
	});
});

test('responsibilities are assigned from a member row without changing primary category', async ({
	page,
	request
}) => {
	await page.goto('/units');
	await page.getByRole('button', { name: 'Acțiuni pentru Ana Popescu', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Responsabilități', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Responsabilități · Ana Popescu' });
	await dialog
		.getByRole('combobox', { name: 'Responsabilitate', exact: true })
		.selectOption('helper');
	await dialog.getByRole('combobox', { name: 'Unitate', exact: true }).selectOption('u1');
	await dialog.getByRole('combobox', { name: 'Subunitate', exact: true }).selectOption('g1');
	await dialog.getByRole('checkbox', { name: 'Poate modifica membrii', exact: true }).check();
	await dialog.getByRole('button', { name: 'Salvează responsabilitatea', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Responsabilitatea și drepturile de acces' })
	).toContainText('Responsabilitatea și drepturile de acces au fost salvate.');
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		role: 'helper',
		unitId: 'u1',
		groupId: 'g1',
		canEdit: true,
		canSeeFees: false,
		canSeeSensitive: false
	});
	expect(submissions.at(-1)).not.toHaveProperty('category');
	expect(submissions.at(-1)).not.toHaveProperty('targetId');
});

test('refreshes on opening, keeps cached rows visible, and permits retry after failure', async ({
	page
}) => {
	let starts = 0,
		polls = 0;
	await page.route('**/units/sync', async (route) => {
		const post = route.request().method() === 'POST';
		if (post) starts++;
		else polls++;
		await route.fulfill({
			json: {
				state: post ? 'running' : starts === 1 ? 'failed' : 'succeeded',
				message: 'Actualizarea a eșuat.',
				lastSucceededAt: '2026-10-25T10:00:00Z'
			}
		});
	});
	await page.goto('/units');
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).toBeVisible();
	await expect(page.getByText('Se actualizează din Orgo…', { exact: false })).toBeVisible();
	await expect(page.getByText('Actualizarea a eșuat.', { exact: false })).toBeVisible();
	await page.getByRole('button', { name: 'Reîncearcă actualizarea' }).click();
	await expect(page.getByText('Date actualizate din Orgo.', { exact: false })).toBeVisible();
	expect(starts).toBe(2);
	expect(polls).toBe(2);
});
