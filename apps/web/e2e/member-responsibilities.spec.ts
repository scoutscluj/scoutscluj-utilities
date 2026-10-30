import { setMultiSelect } from './multi-select';
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

async function editGrade(page: import('@playwright/test').Page) {
	await page.goto('/units');
	await page.getByRole('button', { name: 'Acțiuni pentru Beneficiar test', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Schimbă clasa', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Schimbă clasa · Beneficiar test' });
	await dialog.getByRole('spinbutton', { name: 'Clasa', exact: true }).fill('7');
	return dialog;
}

test('saves a member edit once and announces the change in a snackbar without a confirmation step', async ({
	page,
	request
}) => {
	const dialog = await editGrade(page);
	await expect(
		dialog.getByRole('checkbox', { name: 'Am verificat selecția și modificarea.' })
	).toHaveCount(0);
	await dialog.getByRole('button', { name: 'Salvează modificarea', exact: true }).click();
	await expect(dialog).not.toBeVisible();
	await expect(
		page
			.locator('[data-sonner-toast]')
			.filter({ hasText: 'Beneficiar test: clasa a fost schimbată în 7.' })
	).toBeVisible();
	await expect(
		page
			.getByRole('row')
			.filter({ hasText: 'Beneficiar test' })
			.getByRole('cell', { name: '7', exact: true })
	).toBeVisible();
	const calls = await (await request.get('http://127.0.0.1:3020/test/bulk')).json();
	expect(calls).toHaveLength(2);
	expect(calls.filter((call: { confirm: boolean }) => call.confirm)).toHaveLength(1);
	await page.screenshot({ path: '../../tmp/member-update-snackbar-desktop.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: '../../tmp/member-update-snackbar-mobile.png', fullPage: true });
});

test('keeps member edit values and reports a rejected save without a success snackbar', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/configure', { data: { bulkError: true } });
	const dialog = await editGrade(page);
	await dialog.getByRole('button', { name: 'Salvează modificarea', exact: true }).click();
	await expect(dialog.getByRole('alert')).toContainText(
		'Selecția s-a schimbat. Reîncarcă registrul.'
	);
	await expect(dialog.getByRole('spinbutton', { name: 'Clasa', exact: true })).toHaveValue('7');
	await expect(
		dialog.getByRole('button', { name: 'Salvează modificarea', exact: true })
	).toBeEnabled();
	await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
});

for (const action of ['Schimbă clasa', 'Mută în unitate / grupă', 'Schimbă structura']) {
	test(`applies ${action} to every selected member in one save`, async ({ page, request }) => {
		await page.goto('/units');
		await page.getByRole('checkbox', { name: 'Selectează Beneficiar test', exact: true }).check();
		await page
			.getByRole('checkbox', { name: 'Selectează Beneficiar secundar test', exact: true })
			.check();
		const toolbar = page.getByRole('group', {
			name: 'Acțiuni pentru 2 membri selectați',
			exact: true
		});
		await toolbar.getByRole('button', { name: action, exact: true }).click();
		const dialog = page.getByRole('dialog', { name: `${action} · 2 membri`, exact: true });
		if (action === 'Schimbă clasa') {
			await dialog.getByRole('spinbutton', { name: 'Clasa', exact: true }).fill('8');
			await page.screenshot({ path: '../../tmp/member-bulk-edit-desktop.png', fullPage: true });
			await page.setViewportSize({ width: 390, height: 844 });
			expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
			await page.screenshot({ path: '../../tmp/member-bulk-edit-mobile.png', fullPage: true });
		} else if (action === 'Mută în unitate / grupă') {
			await dialog
				.getByRole('combobox', { name: 'Unitate', exact: true })
				.selectOption('cluj-exploratori');
			await dialog
				.getByRole('combobox', { name: 'Grupă', exact: true })
				.selectOption('cluj-exploratori-grup');
		} else {
			await dialog
				.getByRole('combobox', { name: 'Structură destinație', exact: true })
				.selectOption('floresti');
		}
		await dialog.getByRole('button', { name: 'Salvează modificarea', exact: true }).click();
		await expect(dialog).not.toBeVisible();
		await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText(
			'2 membri:'
		);
		const calls = await (await request.get('http://127.0.0.1:3020/test/bulk')).json();
		expect(calls).toHaveLength(2);
		expect(calls[1].members.map((m: { id: string }) => m.id).sort()).toEqual([
			'22222222-2222-4222-8222-222222222222',
			'33333333-3333-4333-8333-333333333333'
		]);
		const saved = await (await request.get('http://127.0.0.1:3020/test/members')).json();
		for (const member of saved.filter(
			(m: { id: string }) => m.id !== '11111111-1111-4111-8111-111111111111'
		)) {
			if (action === 'Schimbă clasa') expect(member.grade).toBe(8);
			if (action === 'Mută în unitate / grupă')
				expect(member.groupId).toBe('cluj-exploratori-grup');
			if (action === 'Schimbă structura') expect(member.structureId).toBe('floresti');
		}
		expect(saved.find((m: { name: string }) => m.name === 'Lider adult test').revision).toBe(1);
	});
}

test('limits selection actions by school category, structure and administration rights', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/configure', {
		data: { mixedStructures: true, admin: false }
	});
	await page.goto('/units');
	await page.getByRole('checkbox', { name: 'Selectează Lider adult test', exact: true }).check();
	let toolbar = page.getByRole('group', { name: 'Acțiuni pentru 1 membru selectat', exact: true });
	await expect(toolbar.getByRole('button', { name: 'Schimbă clasa', exact: true })).toBeDisabled();
	await expect(toolbar.getByRole('button', { name: 'Schimbă structura', exact: true })).toHaveCount(
		0
	);
	await page.getByRole('checkbox', { name: 'Selectează Lider adult test', exact: true }).uncheck();
	await setMultiSelect(page, 'Structură', []);
	await page.getByRole('checkbox', { name: 'Selectează Beneficiar test', exact: true }).check();
	await page
		.getByRole('checkbox', { name: 'Selectează Beneficiar secundar test', exact: true })
		.check();
	toolbar = page.getByRole('group', { name: 'Acțiuni pentru 2 membri selectați', exact: true });
	await expect(
		toolbar.getByRole('button', { name: 'Mută în unitate / grupă', exact: true })
	).toBeDisabled();
});
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

test('responsibility save shows pending feedback and does not reload the workspace', async ({
	page
}) => {
	const dialog = await responsibilities(page);
	await dialog
		.getByRole('combobox', { name: 'Unitate', exact: true })
		.selectOption('cluj-temerari');
	await page.evaluate(() => (document.documentElement.dataset.saveProbe = 'preserved'));
	await page.route('**/units', async (route) => {
		if (route.request().method() === 'POST')
			await new Promise((resolve) => setTimeout(resolve, 1200));
		await route.continue();
	});
	await dialog
		.getByRole('button', { name: 'Salvează responsabilitatea', exact: true })
		.click({ noWaitAfter: true });
	await expect(dialog.getByRole('button', { name: 'Se salvează…', exact: true })).toBeDisabled({
		timeout: 600
	});
	await expect(dialog).not.toBeVisible();
	expect(await page.evaluate(() => document.documentElement.dataset.saveProbe)).toBe('preserved');
});

test('unit management opens a centered dialog instead of a panel below the members', async ({
	page
}) => {
	await page.goto('/units');
	await page.getByRole('button', { name: 'Unități și subunități', exact: true }).click();
	await expect(
		page.getByRole('dialog', { name: 'Unități și subunități', exact: true })
	).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('responsibility failure keeps entered choices in the dialog', async ({ page, request }) => {
	await request.post('http://127.0.0.1:3020/test/configure', { data: { assignmentError: true } });
	const dialog = await responsibilities(page);
	await dialog
		.getByRole('combobox', { name: 'Unitate', exact: true })
		.selectOption('cluj-temerari');
	await dialog.getByRole('checkbox', { name: 'Poate vedea cotizațiile', exact: true }).check();
	await dialog.getByRole('button', { name: 'Salvează responsabilitatea', exact: true }).click();
	await expect(dialog.getByRole('alert')).toContainText('Responsabilitatea nu a putut fi salvată');
	await expect(dialog.getByRole('combobox', { name: 'Unitate', exact: true })).toHaveValue(
		'cluj-temerari'
	);
	await expect(
		dialog.getByRole('checkbox', { name: 'Poate vedea cotizațiile', exact: true })
	).toBeChecked();
	await expect(
		dialog.getByRole('button', { name: 'Salvează responsabilitatea', exact: true })
	).toBeEnabled();
});

test('transfer history is optional information and Orgo tools open in a dialog', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/configure', {
		data: {
			notices: [
				{
					id: 'notice1',
					memberId: '11111111-1111-4111-8111-111111111111',
					unitId: 'cluj-temerari',
					createdAt: '2026-10-29T10:00:00Z'
				}
			]
		}
	});
	await page.goto('/units');
	await expect(page.getByRole('heading', { name: 'Membri și unități', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Membri primiți în unitate' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Istoric transferuri (1)', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Istoric transferuri' })).toContainText(
		'nu necesită confirmare'
	);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Mai multe acțiuni pentru registru' }).click();
	await page.getByRole('menuitem', { name: 'Legătura cu Orgo', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Legătura cu Orgo', exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Mai multe acțiuni pentru registru' }).click();
	await page
		.getByRole('menuitem', { name: 'Actualizarea anuală a membrilor', exact: true })
		.click();
	await expect(
		page.getByRole('dialog', { name: 'Actualizarea anuală a membrilor', exact: true })
	).toBeVisible();
});
