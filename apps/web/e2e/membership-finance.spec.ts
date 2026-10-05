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
