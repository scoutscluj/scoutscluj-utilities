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

test('review dialog accepts Fam 1 and updates the member without another receipt', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3015/test/review/plan');
	await page.goto('/admin/finance/membership');
	await page.getByRole('button', { name: 'Rezolvă verificarea pentru Ana Popescu' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toContainText('Fam 1');
	await expect(dialog).toContainText('După confirmare: Plătit');
	const confirm = dialog.getByRole('button', { name: 'Confirmă planul și recalculează' });
	await expect(confirm).toBeDisabled();
	await dialog.getByLabel('Motivul confirmării').fill('Fam 1 și încasarea verificate.');
	await confirm.click();
	await expect(dialog).not.toBeVisible();
	const row = page.getByRole('row').filter({ hasText: 'Ana Popescu' });
	await expect(row).toContainText('Fam 1');
	await expect(row).toContainText('Plătit');
	await expect(row).not.toContainText('De verificat');
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		version: 'synthetic-review-version',
		note: 'Fam 1 și încasarea verificate.'
	});
});

test('stale review requires a refreshed preview and retains the explanation', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3015/test/review/stale');
	await page.goto('/admin/finance/membership');
	await page.getByRole('button', { name: 'Rezolvă verificarea pentru Ana Popescu' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Motivul confirmării').fill('Verificat');
	await dialog.getByRole('button', { name: 'Confirmă planul și recalculează' }).click();
	await expect(dialog.getByRole('alert')).toContainText('Datele s-au schimbat');
	await expect(
		dialog.getByRole('button', { name: 'Confirmă planul și recalculează' })
	).not.toBeVisible();
	await dialog.getByRole('button', { name: 'Reîncarcă verificarea' }).click();
	await expect(dialog.getByLabel('Motivul confirmării')).toHaveValue('Verificat');
	await dialog.getByRole('button', { name: 'Confirmă planul și recalculează' }).click();
	await expect(dialog).not.toBeVisible();
});

test('review dialog shows reason-specific blockers on mobile', async ({
	page,
	request
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	for (const reason of ['surplus', 'missing']) {
		await request.post('http://127.0.0.1:3015/test/reset');
		await request.post(`http://127.0.0.1:3015/test/review/${reason}`);
		await page.goto('/admin/finance/membership');
		await page.getByRole('button', { name: 'Rezolvă verificarea pentru Ana Popescu' }).click();
		const dialog = page.getByRole('dialog');
		await expect(
			dialog.getByRole('link', {
				name: reason === 'surplus' ? 'Încasări și alocări' : 'Setări și sincronizare ORGO'
			})
		).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: 'Confirmă planul și recalculează' })
		).not.toBeVisible();
		expect(
			await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({ path: testInfo.outputPath(`review-${reason}-mobile.png`) });
		await page.keyboard.press('Escape');
	}
});

test('period progress survives filtering and payment tooltips open with keyboard or click', async ({
	page
}) => {
	await page.goto('/admin/finance/membership');
	await expect(
		page.getByRole('button', { name: 'Adaugă plată pentru Andrei Ionescu' })
	).toBeEnabled({ timeout: 60000 });
	const progress = page.getByRole('progressbar');
	await expect(progress).toHaveAttribute('value', '53');
	await page.getByRole('searchbox', { name: 'Caută nume sau ID' }).fill('Ana');
	await expect(page.getByRole('cell', { name: /^Ana Popescu ID Orgo/ })).toBeVisible();
	await expect(page.getByRole('cell', { name: /^Andrei Ionescu ID Orgo/ })).not.toBeVisible();
	await expect(progress).toHaveAttribute('value', '53');
	await page.keyboard.press('Tab');
	await expect(
		page.getByRole('button', { name: 'Detalii plată pentru Ana Popescu' })
	).toBeFocused();
	await expect(page.getByRole('tooltip')).toContainText('BT-100');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('tooltip')).not.toBeVisible();
	await page.getByRole('searchbox', { name: 'Caută nume sau ID' }).fill('');
	await page.getByRole('button', { name: 'Detalii plată pentru Andrei Ionescu' }).click();
	await expect(page.getByRole('tooltip')).toContainText('Numerar');
	await page.keyboard.press('Escape');
	await page
		.getByRole('combobox', { name: /^Perioadă/ })
		.selectOption('22222222-2222-4222-8222-222222222222');
	await expect(progress).toHaveAttribute('value', '0');
});

test('member modal saves cash with automatic allocation and retains fields after duplicate rejection', async ({
	page,
	request
}) => {
	await page.goto('/admin/finance/membership');
	await page.getByRole('button', { name: 'Adaugă plată pentru Andrei Ionescu' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toContainText('Andrei Ionescu');
	await expect(dialog.getByLabel('Sumă (RON)')).toHaveValue('205.00');
	await dialog.getByRole('radio', { name: 'Numerar' }).check();
	await dialog.getByLabel('Sumă (RON)').fill('50');
	await dialog.getByLabel('Referință unică a chitanței / documentului').fill('CH-101');
	await dialog.getByLabel('Detalii plată').fill('Plată parțială verificată');
	await dialog.getByRole('button', { name: 'Înregistrează și alocă' }).click();
	await expect(dialog.getByRole('alert')).toContainText('deja înregistrată');
	await expect(dialog.getByLabel('Detalii plată')).toHaveValue('Plată parțială verificată');
	await dialog.getByLabel('Referință unică a chitanței / documentului').fill('CH-102');
	await dialog.getByRole('button', { name: 'Înregistrează și alocă' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByRole('progressbar')).toHaveAttribute('value', '59');
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		method: 'cash',
		amountBani: 5000,
		obligationId: '44444444-4444-4444-8444-444444444444',
		periodId: '11111111-1111-4111-8111-111111111111'
	});
	await page.getByRole('button', { name: 'Detalii plată pentru Andrei Ionescu' }).click();
	await expect(page.getByRole('tooltip')).toContainText('CH-102');
});

test('receipts modal accepts cash and displays it as unallocated', async ({ page }) => {
	await page.goto('/admin/finance/receipts');
	await page.getByRole('button', { name: 'Adaugă încasare' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('radio', { name: 'Numerar' }).check();
	await dialog.getByLabel('Sumă (RON)').fill('80');
	await dialog.getByLabel('Referință unică a chitanței / documentului').fill('CH-103');
	await dialog.getByLabel('Detalii plată').fill('Încasare de alocat');
	await dialog.getByRole('button', { name: 'Înregistrează încasarea' }).click();
	await expect(dialog).not.toBeVisible();
	await page.getByRole('searchbox', { name: 'Caută încasare' }).fill('CH-103');
	await expect(page.getByRole('row').filter({ hasText: 'CH-103' })).toContainText('Numerar');
	await expect(page.getByRole('row').filter({ hasText: 'CH-103' })).toContainText('De alocat');
});

test('finance pages fit desktop and mobile layouts', async ({ page }, testInfo) => {
	for (const width of [1440, 390]) {
		await page.setViewportSize({ width, height: 1000 });
		for (const route of ['membership', 'payments', 'receipts', 'membership-settings']) {
			await page.goto(`/admin/finance/${route}`);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - window.innerWidth
			);
			expect(overflow).toBeLessThanOrEqual(1);
			await page.screenshot({ path: testInfo.outputPath(`${route}-${width}.png`), fullPage: true });
		}
		await page.goto('/admin/finance/membership');
		await page.getByRole('button', { name: 'Adaugă plată pentru Andrei Ionescu' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath(`manual-payment-${width}.png`),
			fullPage: true
		});
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).not.toBeVisible();
	}
});

test('admission link keeps the 55 lei flow after lookup and checkout rejection', async ({
	page,
	request
}) => {
	await page.goto('/cotizatie');
	await page.getByRole('link', { name: 'Plătește adeziunea aici' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('adeziune');
	await expect(page.getByText(/ultimele 6 luni/)).toBeVisible();
	await page.getByLabel('ID ORGO sau ID Card').fill('at36801');
	await page.getByRole('button', { name: 'Verifică ID-ul' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('adeziune');
	await expect(page.locator('input[name="amountBani"]')).toHaveValue('5500');
	await page.locator('input[name="acceptTerms"]').check();
	await page.getByRole('button', { name: 'Continuă la plata cu cardul' }).click();
	await expect(page.getByRole('alert')).toContainText('Eroare de test');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('adeziune');
	await expect(page.locator('input[name="amountBani"]')).toHaveValue('5500');
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.find((item: { attemptToken?: string }) => item.attemptToken)).toMatchObject({
		purpose: 'admission',
		identifier: 'AT36801',
		amountBani: 5500,
		acceptTerms: true
	});
	await request.post('http://127.0.0.1:3015/test/admission-confirm');
	await page.goto('/admin/finance/membership');
	await expect(page.getByText('Adeziune achitată', { exact: true })).toBeVisible();
	await expect(page.getByRole('progressbar')).toHaveAttribute('value', '53');
	await page
		.getByRole('combobox', { name: /^Perioadă/ })
		.selectOption('22222222-2222-4222-8222-222222222222');
	await expect(page.getByText('Adeziune achitată', { exact: true })).not.toBeVisible();
});

test('bank admission can share one transfer with membership and leaves membership totals distinct', async ({
	page,
	request
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 1000 });
	await page.goto('/admin/finance/membership');
	await page.locator('summary').filter({ hasText: 'Adeziuni și plăți din extras' }).click();
	const panel = page
		.locator('details')
		.filter({ has: page.locator('summary').filter({ hasText: 'Adeziuni și plăți din extras' }) })
		.first();
	const memberChoices = panel.getByRole('combobox', { name: 'Membru', exact: true });
	await expect(memberChoices.locator('option[value="99999"]')).toHaveCount(0);
	await panel.locator('summary').filter({ hasText: 'Membri inactivi din istoric' }).click();
	await panel.getByLabel('Selectez un membru din istoricul inactiv').check();
	await expect(memberChoices.locator('option[value="99999"]')).toHaveCount(1);
	await expect(memberChoices.locator('option[value="36802"]')).toHaveCount(0);
	await panel.getByLabel('Selectez un membru din istoricul inactiv').uncheck();
	await panel.getByLabel('Data din extras').fill('2026-10-20');
	await panel.getByLabel('Referința unică din extras').fill('BT-ADEZIUNE-200');
	await panel
		.getByLabel('Detalii din extras')
		.fill('Extras verificat pentru adeziune și cotizație');
	const admission = panel.locator('fieldset').first();
	await admission.getByRole('combobox', { name: 'Membru', exact: true }).selectOption('36802');
	await admission.getByLabel('Observații').fill('Adeziune Florești');
	await expect(admission.getByLabel('Sumă alocată (RON)')).toHaveValue('105.00');
	await panel.getByRole('button', { name: 'Adaugă alt membru sau altă destinație' }).click();
	const fee = panel.locator('fieldset').nth(1);
	await fee.getByLabel('Destinație').selectOption('membership');
	await fee.getByLabel('Membru și cotizație').selectOption('44444444-4444-4444-8444-444444444444');
	await fee.getByLabel('Sumă alocată (RON)').fill('50');
	await fee.getByLabel('Observații').fill('Cotizație parțială');
	await expect(panel.getByLabel('Suma totală primită (RON)')).toHaveValue('155.00');
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
	).toBeLessThanOrEqual(1);
	await page.screenshot({ path: testInfo.outputPath('bank-admission-mobile.png'), fullPage: true });
	await panel.getByRole('button', { name: 'Înregistrează transferul și alocările' }).click();
	await expect(page.getByRole('row').filter({ hasText: 'Andrei Ionescu' })).toContainText(
		'Adeziune achitată'
	);
	const submissions = await (await request.get('http://127.0.0.1:3015/test/submissions')).json();
	expect(submissions.at(-1)).toMatchObject({
		amountBani: 15500,
		allocations: [
			{ purpose: 'admission', orgoUserId: '36802', amountBani: 10500 },
			{ purpose: 'membership', amountBani: 5000 }
		]
	});
	await expect(page.getByRole('progressbar')).toHaveAttribute('value', '59');
	await page.goto('/admin/finance/receipts');
	await page.getByRole('searchbox', { name: 'Caută încasare' }).fill('BT-ADEZIUNE-200');
	await expect(page.getByRole('row').filter({ hasText: 'BT-ADEZIUNE-200' })).toContainText(
		'Alocat integral'
	);
});
