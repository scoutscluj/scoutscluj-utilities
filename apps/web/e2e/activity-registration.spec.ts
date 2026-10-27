import { expect, test } from '@playwright/test';
test.beforeEach(async ({ request }) => {
	await request.post('http://127.0.0.1:3019/test/reset');
});
test('guest starts with empty answers and can only pay after registration', async ({ page }) => {
	await page.goto('/activitati/1');
	await expect(page.getByRole('heading', { name: 'Camp de test — Cântul Vâlvelor' })).toBeVisible();
	await page.getByRole('button', { name: 'Deschide formularul de înscriere' }).click();
	await expect(
		page.getByText('Autentifică-te pentru a completa automat informațiile cunoscute.', {
			exact: false
		})
	).toBeVisible();
	await expect(page.getByLabel('Nume participant *')).toHaveValue('');
	await page
		.getByRole('region', { name: 'Plata participării' })
		.getByLabel('ID Orgo sau ID card')
		.fill('999');
	await page.getByRole('button', { name: 'Verifică înscrierea' }).click();
	await expect(page.getByRole('alert')).toContainText('Înscrie mai întâi');
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-public-desktop.png', fullPage: true });
});
test('authenticated organizer sees separate money, support and agreement states and can record a receipt', async ({
	page
}) => {
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activities/1/registrations');
	await expect(page.getByRole('heading', { name: 'Înscrieri', exact: true })).toBeVisible();
	await expect(page.getByText('Susținere din centrul local', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Înregistrează sumă' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Suma în lei').fill('50');
	await dialog.getByLabel('Referință și explicație').fill('Transfer de test, extras 1');
	await dialog.getByRole('button', { name: 'Confirmă modificarea' }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByRole('main').getByText('Modificările au fost salvate.')).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-organizer-desktop.png', fullPage: true });
	await page.getByRole('button', { name: 'Setări înscrieri' }).click();
	await expect(page.getByText('Comision configurat:', { exact: false })).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-settings-desktop.png', fullPage: true });
});
test('authenticated prefill works for another identifier and the personal agreement stays separate from payment', async ({
	page
}) => {
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activitati/1');
	await page.getByRole('button', { name: 'Deschide formularul de înscriere' }).click();
	await page.locator('#registration').getByLabel('ID Orgo sau ID card').fill('36805');
	await page.getByRole('button', { name: 'Completează datele cunoscute pentru acest ID' }).click();
	await expect(page.getByLabel('Nume participant *')).toHaveValue('Participant de test');
	await page.goto(`/activitati/1/inscriere/${'a'.repeat(43)}`);
	await expect(page.getByText('Acord de predat', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Pregătește PDF-ul completat' }).click();
	await expect(page.getByRole('link', { name: /Descarcă acordul completat/ })).toBeVisible();
	await expect(page.getByText('Acoperită parțial', { exact: true })).toBeVisible();
});
test('mobile public form and organizer fit the viewport', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activitati/1');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-public-mobile.png', fullPage: true });
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activities/1/registrations');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-organizer-mobile.png', fullPage: true });
});
