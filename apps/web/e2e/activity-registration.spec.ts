import { expect, test } from '@playwright/test';
test.beforeEach(async ({ request }) => {
	await request.post('http://127.0.0.1:3019/test/reset');
});
test('guest starts with empty answers and can only pay after registration', async ({ page }) => {
	await page.goto('/activitati/1');
	await expect(page.getByRole('heading', { name: 'Camp de test — Cântul Vâlvelor' })).toBeVisible();
	await page.getByRole('button', { name: 'Înscrie folosind ID-ul unui membru' }).click();
	await expect(
		page.getByText('Fără autentificare, completezi formularul de la zero.', {
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
	await expect(page.getByRole('group', { name: 'Locuri', exact: true })).toBeVisible();
	await expect(page.getByLabel('Taxă de participare, în lei')).not.toBeVisible();
	await page
		.getByRole('navigation', { name: 'Setările activității', exact: true })
		.getByRole('link', { name: 'Acord de participare', exact: true })
		.click();
	await page.getByRole('button', { name: 'Pregătește acordul acestei activități' }).click();
	await expect(page.locator('#consent-commonActivities')).toBeVisible();
	await expect(page.getByLabel('Transport la plecare')).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/registration-settings-desktop.png', fullPage: true });
});
test('activity settings use separate submenus and one fee field with dismissible advice', async ({
	page,
	request
}) => {
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activities');
	await page.screenshot({ path: '../../tmp/activities-list-compact-desktop.png', fullPage: true });
	await expect(page.getByRole('link', { name: '＋ Activitate nouă', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Activitate nouă', exact: true })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Toate activitățile', exact: true })).toHaveCount(0);
	await expect(
		page.getByRole('link', { name: 'Activități publice și înscriere', exact: true })
	).toHaveCount(0);
	await page.goto('/activities/1/settings/payments');
	const fee = page.getByLabel('Taxă de participare, în lei', { exact: true });
	const advice = page.getByRole('complementary', { name: 'Comisionul plății cu cardul' });
	await expect(fee).toHaveCount(1);
	await expect(page.getByLabel('Suma netă dorită, în lei')).toHaveCount(0);
	await expect(page.getByLabel('Nume', { exact: true })).toHaveCount(0);
	await expect(advice).toHaveCount(0);
	await fee.fill('300');
	await expect(advice).toContainText('305,00');
	await advice.getByRole('button', { name: 'Ascunde', exact: true }).click();
	await expect(advice).toHaveCount(0);
	await expect(fee).toHaveValue('300');
	await page.getByRole('button', { name: 'Informații despre comision', exact: true }).click();
	await advice.getByRole('button', { name: 'Aplică prețul recomandat', exact: true }).click();
	await expect(fee).toHaveValue('305');
	await expect(advice).toHaveCount(0);
	await page.getByRole('button', { name: 'Informații despre comision', exact: true }).click();
	await expect(advice).toContainText('305,00');
	await expect(advice).not.toContainText('310,00');
	await advice.getByRole('button', { name: 'Ascunde', exact: true }).click();
	await page.getByRole('button', { name: 'Salvează setările de plată', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Setările de plată au fost salvate.');
	const saved = await (await request.get('http://127.0.0.1:3019/test/settings')).json();
	expect(saved.data.feeBani).toBe(30500);
	expect(saved.data.published).toBe(true);
	expect(saved.data.familyFees).toEqual([50000, 40000, 30000]);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({
		path: '../../tmp/activity-settings-payments-desktop.png',
		fullPage: true
	});
	const settingsNav = page.getByRole('navigation', { name: 'Setările activității', exact: true });
	await settingsNav.getByRole('link', { name: 'Echipă', exact: true }).click();
	await expect(page.getByRole('combobox', { name: 'Organizator', exact: true })).toBeVisible();
	await expect(fee).toHaveCount(0);
	await page.getByRole('button', { name: 'Salvează echipa', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Echipa activității a fost salvată.');
	await settingsNav.getByRole('link', { name: 'General', exact: true }).click();
	await expect(page.getByLabel('Nume', { exact: true })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Organizator', exact: true })).toHaveCount(0);
	await page
		.getByRole('complementary', { name: 'Meniu principal' })
		.getByRole('link', { name: 'Activități', exact: true })
		.click();
	await expect(page).toHaveURL(/\/activities$/);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/settings/payments');
	await fee.fill('300');
	await expect(advice).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({
		path: '../../tmp/activity-settings-payments-mobile.png',
		fullPage: true
	});
});

test('settings keep the edited revision when another organizer changes configuration during revalidation', async ({
	page,
	request
}) => {
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activities/1/settings/payments');
	await request.post('http://127.0.0.1:3019/test/concurrent-next-save');
	const fee = page.getByLabel('Taxă de participare, în lei', { exact: true });
	await fee.fill('300');
	await page.getByRole('button', { name: 'Salvează setările de plată', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Setările de plată au fost salvate.');
	await fee.fill('310');
	await page.getByRole('button', { name: 'Salvează setările de plată', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText(
		'Setările au fost modificate. Reîncarcă pagina.'
	);
	const current = await (await request.get('http://127.0.0.1:3019/test/current-settings')).json();
	expect(current.data.feeBani).toBe(30000);
	expect(current.data.terms).toBe('Condiții schimbate de alt organizator');
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
	await page.getByLabel('Început', { exact: true }).fill('24.08.2027');
	await page.getByLabel('Final', { exact: true }).fill('28.08.2027');
	await page.getByLabel('Locație', { exact: true }).fill('Locație de test');
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await page.getByRole('combobox', { name: 'Organizator', exact: true }).selectOption('2');
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await expect(page.getByRole('heading', { name: '3. Înscrieri' })).toBeVisible();
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await expect(page.getByRole('heading', { name: '4. Acord de participare' })).toBeVisible();
	await page.getByRole('button', { name: 'Pregătește acordul acestei activități' }).click();
	await page.locator('#consent-commonActivities').fill('Drumeții și ateliere pentru participanți.');
	await expect(page.getByRole('link', { name: /Descarcă un acord de verificare/ })).toHaveCount(0);
	await page.getByRole('button', { name: 'Continuă →' }).click();
	await expect(page.getByRole('heading', { name: '5. Taxă și plată' })).toBeVisible();
	await page.getByLabel('Taxă de participare, în lei', { exact: true }).fill('525');
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
		'/activities/1/settings/registrations'
	);
	await expect(page.getByRole('link', { name: 'Înscrieri', exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Plăți participare', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Plăți participare', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Setări plată', exact: true })).toHaveAttribute(
		'href',
		'/activities/1/settings/payments'
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

test('single eligible branch is locked and absent personal medication hides its dependent fields', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { settings: { unitIds: ['cluj-temerari'] } }
	});
	await page.goto('/activitati/1');
	await expect(page.getByRole('heading', { name: 'Continuă fără autentificare' })).toBeVisible();
	await page.getByRole('button', { name: 'Înscrie folosind ID-ul unui membru' }).click();
	const branch = page.getByRole('combobox', { name: 'Ramură', exact: true });
	await expect(branch).toBeDisabled();
	await expect(branch).toHaveValue('temerari');
	await expect(branch.locator('option')).toHaveText(['Temerari']);
	const medication = page.getByRole('textbox', { name: /^Medicație personală Scrie/ });
	await medication.fill('Nu există');
	await expect(
		page.getByRole('combobox', { name: 'Mod de administrare a medicației personale', exact: true })
	).toHaveCount(0);
	await expect(
		page.getByRole('textbox', { name: 'Medicație personală: doza și orarul', exact: true })
	).toHaveCount(0);
	await medication.fill('Medicament prescris');
	await expect(
		page.getByRole('combobox', { name: 'Mod de administrare a medicației personale', exact: true })
	).toBeVisible();
	await medication.fill('Nu exista.');
	await expect(
		page.getByRole('combobox', { name: 'Mod de administrare a medicației personale', exact: true })
	).toHaveCount(0);
});

test('adult prefill suggests the staff role and a different minor resets the form', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			settings: { unitIds: ['cluj-temerari'] },
			row: {
				branch: 'lideri',
				answers: { participant_name: 'Adult de test', birth_date: '2009-08-24' }
			}
		}
	});
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
	await page.goto('/activitati/1');
	await page.getByRole('button', { name: 'Înscriere pentru mine', exact: true }).click();
	const role = page.getByRole('combobox', { name: 'Particip în rol de' });
	await expect(role).toHaveValue('staff');
	await expect(page.getByLabel('Nume participant *')).toHaveCount(0);
	await expect(
		page.getByText('Certificatul de integritate comportamentală', { exact: false })
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Anunță participarea', exact: true })
	).toBeVisible();
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				branch: 'temerari',
				answers: { participant_name: 'Minor de test', birth_date: '2009-08-25' }
			}
		}
	});
	await page.locator('#registration').getByLabel('ID Orgo sau ID card').fill('36806');
	await page.getByRole('button', { name: 'Completează datele cunoscute pentru acest ID' }).click();
	await expect(role).toHaveValue('beneficiary');
	await expect(page.getByLabel('Nume participant *')).toHaveValue('Minor de test');
	await expect(
		page.getByLabel('Participantul va fi major la începutul activității')
	).not.toBeChecked();
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				branch: 'voluntari',
				answers: { participant_name: 'Alt adult de test', birth_date: '1997-03-23' }
			}
		}
	});
	await page.locator('#registration').getByLabel('ID Orgo sau ID card').fill('36807');
	await page.getByRole('button', { name: 'Completează datele cunoscute pentru acest ID' }).click();
	await expect(role).toHaveValue('staff');
	await page.getByRole('button', { name: 'Anunță participarea', exact: true }).click();
	await expect(page).toHaveURL(/\/inscriere\//);
	expect((await (await request.get('http://127.0.0.1:3019/test/row')).json()).role).toBe('staff');
});

for (const adultGroup of ['seniori', 'lideri', 'voluntari', 'scouteri']) {
	test(`adult remains a beneficiary when ${adultGroup} is eligible`, async ({ page, request }) => {
		await request.post('http://127.0.0.1:3019/test/configure', {
			data: {
				eligibleBranches: ['temerari', adultGroup],
				row: {
					branch: adultGroup,
					answers: { participant_name: 'Adult beneficiar de test', birth_date: '1997-03-23' }
				}
			}
		});
		await page
			.context()
			.addCookies([
				{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
			]);
		await page.goto('/activitati/1');
		await page.getByRole('button', { name: 'Înscriere pentru mine', exact: true }).click();
		const role = page.getByRole('combobox', { name: 'Particip în rol de' });
		await expect(
			page.getByLabel('Participantul va fi major la începutul activității')
		).toBeChecked();
		await expect(role).toHaveValue('beneficiary');
		await expect(page.getByRole('combobox', { name: 'Ramură', exact: true })).toHaveValue(
			adultGroup
		);
		await role.selectOption('staff');
		await expect(role).toHaveValue('staff');
	});
}

test('guest birth date suggests an adult role without prefilling member data', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { settings: { unitIds: ['cluj-temerari'] } }
	});
	await page.goto('/activitati/1');
	await page.getByRole('button', { name: 'Înscrie folosind ID-ul unui membru' }).click();
	await expect(page.getByLabel('Nume participant *')).toHaveValue('');
	const role = page.getByRole('combobox', { name: 'Particip în rol de' });
	const birth = page.getByRole('textbox', { name: /^Data nașterii/ });
	await birth.fill('25.08.2009');
	await expect(role).toHaveValue('beneficiary');
	await birth.fill('24.08.2009');
	await expect(role).toHaveValue('staff');
	await expect(
		page.getByRole('button', { name: 'Anunță participarea', exact: true })
	).toBeVisible();
	await role.selectOption('beneficiary');
	await expect(role).toHaveValue('beneficiary');
	await page.getByLabel('Participantul va fi major la începutul activității').uncheck();
	await page.getByLabel('Participantul va fi major la începutul activității').click();
	await expect(role).toHaveValue('staff');
});
