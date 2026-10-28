import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page, request }) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
});
async function responsibilities(page: import('@playwright/test').Page) {
	await page.goto('/units');
	await page.getByRole('button', { name: 'Acțiuni pentru Lider adult test', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Responsabilități', exact: true }).click();
	return page.getByRole('dialog');
}
test('hides subgroup selection for a common collective and clears an earlier subgroup', async ({
	page,
	request
}) => {
	const dialog = await responsibilities(page);
	await dialog
		.getByRole('combobox', { name: 'Responsabilitate', exact: true })
		.selectOption('leader');
	await expect(dialog.getByLabel('Data promisiunii de lider (opțional)')).not.toHaveAttribute(
		'required'
	);
	const unit = dialog.getByRole('combobox', { name: 'Unitate', exact: true });
	await unit.selectOption('cluj-exploratori');
	const group = dialog.getByRole('combobox', { name: 'Subunitate', exact: true });
	await expect(group).toHaveAttribute('required', '');
	await group.selectOption('cluj-exploratori-grup');
	await unit.selectOption('cluj-temerari');
	await expect(dialog.getByRole('combobox', { name: 'Subunitate', exact: true })).toHaveCount(0);
	await dialog.getByRole('button', { name: 'Salvează responsabilitatea', exact: true }).click();
	await expect(page.getByRole('status').first()).toContainText(
		'Responsabilitatea și drepturile de acces au fost salvate.'
	);
	const saved = await (await request.get('http://127.0.0.1:3020/test/assignment')).json();
	expect(saved.unitId).toBe('cluj-temerari');
	expect(saved.groupId ?? null).toBeNull();
	expect(saved.promiseDate).toBe('');
});

test('individual profile keeps unit choices local and hides empty subgroup selectors', async ({
	page
}) => {
	await page.goto('/units/11111111-1111-4111-8111-111111111111');
	const transfer = page.locator('form').filter({ has: page.locator('input[value="transfer"]') });
	await expect(
		transfer
			.getByRole('combobox', { name: 'Unitate', exact: true })
			.locator('option[value^="floresti-"]')
	).toHaveCount(0);
	await expect(transfer.getByRole('combobox', { name: 'Grupă', exact: true })).toHaveCount(0);
	const assignment = page
		.locator('form')
		.filter({ has: page.locator('input[value="assignment"]') });
	const unit = assignment.getByRole('combobox', { name: 'Unitate', exact: true });
	await expect(unit.locator('option[value^="floresti-"]')).toHaveCount(0);
	await unit.selectOption('cluj-exploratori');
	await expect(assignment.getByRole('combobox', { name: 'Grupă', exact: true })).toBeVisible();
	await unit.selectOption('cluj-temerari');
	await expect(assignment.getByRole('combobox', { name: 'Grupă', exact: true })).toHaveCount(0);
});

test('responsibility dialog remains compact on desktop and mobile', async ({ page }) => {
	const dialog = await responsibilities(page);
	await dialog
		.getByRole('combobox', { name: 'Unitate', exact: true })
		.selectOption('cluj-temerari');
	await page.screenshot({ path: '../../tmp/member-responsibilities-desktop.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(dialog).toBeVisible();
	expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
	await page.screenshot({ path: '../../tmp/member-responsibilities-mobile.png', fullPage: true });
});
test('responsibility destinations stay in the edited member structure even for central admins', async ({
	page
}) => {
	const dialog = await responsibilities(page);
	await expect(
		dialog
			.getByRole('combobox', { name: 'Unitate', exact: true })
			.locator('option[value^="floresti-"]')
	).toHaveCount(0);
});
test('unit transfers show each destination from the current structure once', async ({ page }) => {
	await page.goto('/units');
	await page.getByRole('button', { name: 'Acțiuni pentru Beneficiar test', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Mută în unitate / grupă', exact: true }).click();
	const units = page.getByRole('dialog').getByRole('combobox', { name: 'Unitate', exact: true });
	await expect(units.locator('option[value^="floresti-"]')).toHaveCount(0);
	await expect(units.locator('option').filter({ hasText: 'Temerari' })).toHaveCount(1);
});
test('adult leader placement comes from responsibilities and has no school grade action or field', async ({
	page
}) => {
	await page.goto('/units');
	const row = page.getByRole('row').filter({ hasText: 'Lider adult test' });
	await expect(row.getByRole('cell').nth(2)).toHaveText('Temerari');
	await expect(row.getByRole('cell').nth(3)).toHaveText('—');
	await row.getByRole('button', { name: 'Acțiuni pentru Lider adult test', exact: true }).click();
	await expect(page.getByRole('menuitem', { name: 'Schimbă clasa', exact: true })).toHaveCount(0);
	await page.goto('/units/11111111-1111-4111-8111-111111111111');
	await expect(page.getByLabel('Clasa', { exact: true })).toHaveCount(0);
});
