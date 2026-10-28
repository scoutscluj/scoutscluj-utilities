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
	await expect
		.poll(() => page.locator('#app-navigation').evaluate((e) => e.getBoundingClientRect().right))
		.toBeLessThanOrEqual(0);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/activity-publication-mobile.png', fullPage: true });
});

test('agreement editor adapts to eligible units, previews unsaved text and saves an equipment list', async ({
	page,
	request
}) => {
	const consent = Object.fromEntries(
		[
			'representative',
			'coordinators',
			'communication',
			'commonActivities',
			'specificActivities',
			'activityNotes',
			'outboundTransport',
			'returnTransport',
			'equipment',
			'equipmentNotes',
			'firstAidPeople',
			'medicalFacilities'
		].map((key) => [
			key,
			['communication', 'specificActivities', 'activityNotes', 'equipmentNotes'].includes(key)
				? ''
				: key === 'equipment'
					? 'Bocanci'
					: 'Text de test'
		])
	);
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { settings: { consent, unitActivities: {}, unitIds: ['cluj-temerari'] } }
	});
	await page.goto('/activities/1/settings/consent');
	await expect(
		page.getByRole('group', { name: 'Activități specifice unităților · opțional' })
	).toHaveCount(0);
	await expect(page.getByLabel('Verifică acordul pentru unitatea')).toHaveCount(0);
	await page.locator('#consent-commonActivities').fill('Program actualizat fără salvare');
	await page.getByRole('button', { name: '+ Adaugă echipament' }).click();
	await page.getByRole('textbox', { name: 'Echipament 2', exact: true }).fill('Pelerină');
	await expect(
		page.getByRole('region', { name: 'Acord de participare fără date de participant' })
	).toBeVisible();
	await expect
		.poll(async () => {
			const previews = await (await request.get('http://127.0.0.1:3019/test/previews')).json();
			return previews.at(-1)?.input?.consent?.commonActivities;
		})
		.toBe('Program actualizat fără salvare');
	await page.getByRole('button', { name: 'Salvează acordul', exact: true }).click();
	await expect(page.getByRole('status')).toContainText('Datele acordului au fost salvate');
	await expect(
		page.getByRole('link', { name: '↓ Descarcă acord de verificare fără date de participant' })
	).toBeVisible();
	expect(
		(await (await request.get('http://127.0.0.1:3019/test/settings')).json()).data.consent.equipment
	).toBe('Bocanci\nPelerină');
	await page.locator('#consent-equipment').scrollIntoViewIfNeeded();
	await expect
		.poll(async () => {
			const preview = await page
				.getByRole('complementary', { name: 'Previzualizarea acordului' })
				.boundingBox();
			const topbar = await page.locator('.topbar').boundingBox();
			return (preview?.y ?? 0) - (topbar?.height ?? 0);
		})
		.toBeGreaterThanOrEqual(0);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/agreement-editor-desktop.png', fullPage: true });
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { settings: { unitIds: ['cluj-temerari', 'floresti-temerari'] } }
	});
	await page.reload();
	await expect(
		page.getByRole('group', { name: 'Activități specifice unităților · opțional' })
	).toBeVisible();
	await page.locator('#unit-activities-cluj-temerari').fill('Activitate doar Cluj');
	await page.locator('#unit-activities-floresti-temerari').fill('Activitate doar Florești');
	await page.getByLabel('Verifică acordul pentru unitatea').selectOption('floresti-temerari');
	await expect
		.poll(async () => {
			const previews = await (await request.get('http://127.0.0.1:3019/test/previews')).json();
			return previews.at(-1)?.unitId;
		})
		.toBe('floresti-temerari');
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() => page.locator('#app-navigation').evaluate((e) => e.getBoundingClientRect().right))
		.toBeLessThanOrEqual(0);
	await page.evaluate(() => window.scrollTo(0, 0));
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: '../../tmp/agreement-editor-mobile.png', fullPage: true });
});

test('agreement validation is prominent and links focus the missing field', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			settings: {
				consent: Object.fromEntries(
					[
						'representative',
						'coordinators',
						'communication',
						'commonActivities',
						'specificActivities',
						'activityNotes',
						'outboundTransport',
						'returnTransport',
						'equipment',
						'equipmentNotes',
						'firstAidPeople',
						'medicalFacilities'
					].map((key) => [key, ''])
				),
				unitActivities: {}
			}
		}
	});
	await page.goto('/activities/1/settings/consent');
	await page.getByRole('button', { name: 'Salvează acordul', exact: true }).click();
	const alert = page.getByRole('alert');
	await expect(alert).toBeVisible();
	await expect(alert).toContainText('Completează informațiile obligatorii');
	await alert.getByRole('button', { name: 'Activități', exact: true }).click();
	await expect(page.locator('#consent-commonActivities')).toBeFocused();
	await expect(page.locator('#consent-commonActivities')).toHaveAttribute('aria-invalid', 'true');
});

test('handoff confirms paper and cash with one explicit action and displays the completed state', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				handoffPaperReady: true,
				cashRemainingBani: 15000,
				cardRemainingBani: 20000,
				cashInstallments: [
					{ key: 'cash', amountBani: 15000, remainingBani: 15000, due: '2027-08-24' }
				]
			}
		}
	});
	await page.goto('/activities/1/check-in');
	await page.getByRole('button', { name: /Confirmă acord \+ cash/ }).click();
	await expect(page.getByRole('status')).toContainText('acord fizic primit și numerar încasat');
	const row = await (await request.get('http://127.0.0.1:3019/test/row')).json();
	expect(row.consentState).toBe('paper_received');
	expect(row.cashRemainingBani).toBe(0);
	expect(row.remainingBani).toBe(20000);
	await page.getByLabel('Doar cu documente sau cash de primit').uncheck();
	await expect(page.getByText('Nimic de încasat cash')).toBeVisible();
	await expect(page.getByRole('button', { name: /Cash .* primit/ })).toHaveCount(0);
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() => page.locator('#app-navigation').evaluate((e) => e.getBoundingClientRect().right))
		.toBeLessThanOrEqual(0);
	await page.evaluate(() => window.scrollTo(0, 0));
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: '../../tmp/activity-handoff-mobile.png', fullPage: true });
});
