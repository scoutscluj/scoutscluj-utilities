import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page, request }) => {
	await request.post('http://127.0.0.1:3019/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
});
test('eligible units and groups follow selected structures without ambiguous unit names', async ({
	page
}) => {
	await page.goto('/activities/1/settings/registrations');
	const structures = page.getByRole('listbox', { name: 'Structuri', exact: true }),
		units = page.getByRole('listbox', { name: 'Unități', exact: true }),
		groups = page.getByRole('listbox', { name: 'Subunități', exact: true });
	await structures.selectOption('cluj');
	await expect(units.locator('option')).toHaveText(['Temerari']);
	await expect(groups.locator('option')).toHaveText(['Patrula Cluj']);
	await groups.selectOption('cluj-group');
	await structures.selectOption('floresti');
	await expect(groups).toHaveValues([]);
	await structures.selectOption(['cluj', 'floresti']);
	await expect(units.locator('option')).toHaveText(['Cluj · Temerari', 'Florești · Temerari']);
});
test('dates show Romanian order even in an English browser and save canonical dates', async ({
	page,
	request
}) => {
	await page.goto('/activities/1/settings/payments');
	const due = page.getByLabel('Termen de plată', { exact: true });
	await expect(due).toHaveValue('01.08.2027');
	await due.fill('13.11.2027');
	await page.getByRole('button', { name: 'Salvează setările de plată', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Setările de plată au fost salvate');
	expect(
		(await (await request.get('http://127.0.0.1:3019/test/settings')).json()).data.paymentDue
	).toBe('2027-11-13');
});
test('publication is available at the top of activity administration', async ({ page }) => {
	await page.goto('/activities/1/settings/payments');
	await expect(page.getByRole('region', { name: 'Publicarea activității' })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Retrage pagina publică', exact: true })
	).toBeVisible();
	await page.getByLabel('Taxă de participare, în lei').fill('100');
	await expect(
		page.getByRole('button', { name: 'Retrage pagina publică', exact: true })
	).toBeDisabled();
	await page.getByRole('button', { name: 'Salvează setările de plată', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Retrage pagina publică', exact: true })
	).toBeEnabled();
	await page.getByRole('button', { name: 'Retrage pagina publică', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Publică activitatea', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Publică activitatea', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Publicarea activității' })).toContainText(
		'Activitate publică'
	);
});

test('Romanian calendar works with keyboard focus, invalid dates and native form submission', async ({
	page
}) => {
	await page.goto('/activities/1/settings/payments');
	const due = page.getByLabel('Termen de plată', { exact: true });
	await due.fill('31.02.2027');
	expect(await due.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
	await due.fill('13.11.2027');
	await due.locator('..').getByRole('button', { name: 'Alege data din calendar' }).click();
	await expect(page.getByRole('combobox', { name: 'Luna', exact: true })).toHaveValue('11');
	await expect(
		page.getByRole('combobox', { name: 'Luna', exact: true }).locator('option:checked')
	).toHaveText('noiembrie');
	await page.locator('.date-day[data-value="2027-11-14"]').click();
	await expect(due).toHaveValue('14.11.2027');
	await page.goto('/activities/1/settings');
	await expect(page.getByLabel('Început', { exact: true })).toHaveValue('24.08.2027');
	await page.getByLabel('Început', { exact: true }).fill('13.11.2027');
	expect(
		await page
			.locator('form.details-form')
			.evaluate((form: HTMLFormElement) => new FormData(form).get('startDate'))
	).toBe('2027-11-13');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: '../../tmp/activity-publication-mobile.png', fullPage: true });
});
