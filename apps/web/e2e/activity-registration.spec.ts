import { expect, test } from '@playwright/test';
test.beforeEach(async ({ request }) => {
	await request.post('http://127.0.0.1:3019/test/reset');
});
test('guest starts with empty answers and can only pay after registration', async ({ page }) => {
	await page.goto('/activitati/1');
	await expect(page.getByRole('heading', { name: 'Camp de test — Cântul Vâlvelor' })).toBeVisible();
	await page.getByRole('button', { name: 'Înscrie folosind ID-ul unui membru' }).click();
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
	await page.getByRole('link', { name: 'Setări înscrieri', exact: true }).click();
	await expect(page.getByText('Comision configurat:', { exact: false })).toBeVisible();
	await page.getByRole('button', { name: 'Pregătește acordul acestei activități' }).click();
	await expect(page.getByLabel('Activități comune')).toBeVisible();
	await expect(page.getByLabel('Transport la plecare')).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-settings-desktop.png', fullPage: true });
});
test('new activity wizard configures a different organizer, departments and participation payment', async ({
	page,
	request
}) => {
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activities/new');
	await page.getByLabel('Nume', { exact: true }).fill('Activitate pregătită prin wizard');
	await page.getByLabel('Început', { exact: true }).fill('2027-08-24');
	await page.getByLabel('Final', { exact: true }).fill('2027-08-28');
	await page.getByLabel('Locație', { exact: true }).fill('Locație de test');
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await page.getByRole('combobox', { name: 'Organizator', exact: true }).selectOption('2');
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await expect(page.getByRole('heading', { name: '3. Înscrieri' })).toBeVisible();
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await expect(page.getByRole('heading', { name: '4. Acord de participare' })).toBeVisible();
	await page.getByRole('button', { name: 'Pregătește acordul acestei activități' }).click();
	await page.getByLabel('Activități comune').fill('Drumeții și ateliere pentru participanți.');
	await expect(page.getByRole('link', { name: /Descarcă un acord de verificare/ })).toHaveCount(0);
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await expect(page.getByRole('heading', { name: '5. Taxă și plată' })).toBeVisible();
	await page.getByLabel('Taxa finală, în lei', { exact: true }).fill('525');
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await page.getByRole('button', { name: 'Creează activitatea', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Setările activității', exact: true })
	).toBeVisible();
	const values = await (await request.get('http://127.0.0.1:3019/test/created')).json();
	expect(values.coordinatorId).toBe(2);
	expect(values.administratorIds).toContain(1);
	expect(values.registrationSettings.published).toBe(false);
	expect(values.registrationSettings.feeBani).toBe(52500);
	expect(values.registrationSettings.consent.commonActivities).toContain('Drumeții');
	await page.goto('/activities/1/registrations');
	await expect(page.getByRole('link', { name: 'Setări înscrieri', exact: true })).toHaveAttribute(
		'href',
		'/activities/1/settings#inscrieri'
	);
	await expect(page.getByRole('link', { name: 'Înscrieri', exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Plăți participare', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Plăți participare', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Setări plată', exact: true })).toHaveAttribute(
		'href',
		'/activities/1/settings#plati'
	);
	await page.screenshot({ path: '../../tmp/activity-wizard-payments.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/new');
	await expect(page.getByRole('heading', { name: 'Pregătește o activitate nouă' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: '../../tmp/activity-wizard-mobile.png', fullPage: true });
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
	await page.getByRole('button', { name: 'Înscrie folosind ID-ul unui membru' }).click();
	await page.locator('#registration').getByLabel('ID Orgo sau ID card').fill('36805');
	await page.getByRole('button', { name: 'Completează datele cunoscute pentru acest ID' }).click();
	await expect(page.getByLabel('Nume participant *')).toHaveValue('Participant de test');
	await page.goto(`/activitati/1/inscriere/${'a'.repeat(43)}`);
	await expect(page.getByText('Acord de predat', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Pregătește PDF-ul completat' }).click();
	await expect(page.getByRole('link', { name: /Descarcă acordul completat/ })).toBeVisible();
	await expect(page.getByText('Acoperită parțial', { exact: true })).toBeVisible();
	const [sameOriginRequest] = await Promise.all([
		page.waitForRequest((request) => new URL(request.url()).pathname === '/health'),
		page.evaluate(() => fetch('/health').then((response) => response.status))
	]);
	expect(sameOriginRequest.headers()['referer'] ?? '').toBe('');
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
test('eligible activities appear inside Activities and the global editor is visibly paused', async ({
	page
}) => {
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activitati/1');
	await expect(
		page.getByRole('link', { name: 'Camp de test — Cântul Vâlvelor', exact: true })
	).toHaveAttribute('href', '/activitati/1');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/admin/parental-consent');
	await expect(page.getByText('Editor de șabloane · suspendat temporar')).toBeVisible();
	await expect(page.getByRole('button', { name: /Creează/ })).toHaveCount(0);
});
