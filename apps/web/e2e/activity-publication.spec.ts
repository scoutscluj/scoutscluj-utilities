import { expect, test, type Page } from '@playwright/test';
import {
	emptyFixedConsent,
	createRepresentativeOrganizerDraft
} from '@scouts-cluj/parental-consent-schema';
async function themeColor(page: Page, token: string) {
	return page.evaluate((name) => {
		const probe = document.createElement('span');
		probe.style.color = `var(${name})`;
		document.body.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, token);
}
async function openPublicationActions(page: Page) {
	await page.getByRole('button', { name: 'Acțiuni de publicare', exact: true }).click();
}

test.beforeEach(async ({ page, request }) => {
	await request.post('http://127.0.0.1:3019/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
});

test('withdrawn participants stay out of the default list and can be shown explicitly', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { row: { state: 'withdrawn' } }
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/registrations');
	await expect(page.getByRole('combobox', { name: 'Filtrează' })).toHaveValue('current');
	await expect(page.locator('tbody > tr')).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Filtrează' }).selectOption('withdrawn');
	await expect(page.locator('tbody > tr')).toHaveCount(1);
	await page.getByRole('combobox', { name: 'Filtrează' }).selectOption('all');
	await expect(page.locator('tbody > tr')).toHaveCount(1);
	await page.getByRole('combobox', { name: 'Filtrează' }).selectOption('unpaid');
	await expect(page.locator('tbody > tr')).toHaveCount(0);
});

test('receipt toggles require confirmation and preserve correction history', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				handoffPaperReady: true,
				cashRemainingBani: 15000,
				cashInstallments: [
					{ key: 'cash', amountBani: 15000, remainingBani: 15000, due: '2027-08-24' }
				]
			}
		}
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/registrations');
	const line = page.locator('.mobile-participant');
	await line.getByRole('button', { name: /^Cash .* de primit/ }).click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: /Confirmă acord \+ cash/ })
		.click();
	await page.getByRole('dialog').getByRole('button', { name: 'Închide dialogul' }).click();
	await line.getByRole('button', { name: /^Acord pentru/ }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Păstrează confirmarea' }).click();
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await line.getByRole('button', { name: /^Acord pentru/ }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Confirmă: acord neprimit' }).click();
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	await line.getByRole('button', { name: /^Tranșe cash acoperite/ }).click();
	await expect(page.getByRole('dialog')).toContainText('150,00 RON');
	await page.getByRole('dialog').screenshot({ path: '../../tmp/receipt-toggle-confirm.png' });
	await page.getByRole('dialog').getByRole('button', { name: 'Păstrează confirmarea' }).click();
	await expect(line.getByRole('button', { name: /^Tranșe cash acoperite/ })).toBeVisible();
	await line.getByRole('button', { name: /^Tranșe cash acoperite/ }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Confirmă: cash neprimit' }).click();
	await expect(line.getByRole('button', { name: /^Cash .* de primit/ })).toHaveText('Cash 150 lei');
	await page.reload();
	const updated = await (await request.get('http://127.0.0.1:3019/test/row')).json();
	expect(updated.consentState).toBe('awaiting');
	expect(updated.cashRemainingBani).toBe(15000);
	expect(updated.remainingBani).toBe(35000);
	expect(updated.entries).toHaveLength(2);
	expect(updated.entries[1].reversedEntryId).toBe(updated.entries[0].id);
	await line.getByRole('button', { name: /^Acord pentru/ }).click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: 'Acord fizic primit', exact: true })
		.click();
	await page.getByRole('dialog').getByRole('button', { name: 'Închide dialogul' }).click();
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('a changed registration cannot be reverted from an old confirmation modal', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { row: { consentState: 'paper_received' } }
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/registrations');
	await page
		.locator('.mobile-participant')
		.getByRole('button', { name: /^Acord pentru/ })
		.click();
	await request.post('http://127.0.0.1:3019/test/configure', { data: { row: { revision: 2 } } });
	await page.getByRole('dialog').getByRole('button', { name: 'Confirmă: acord neprimit' }).click();
	await expect(page.getByRole('dialog')).toContainText('Înscriere modificată');
	await expect(
		page.getByRole('dialog').getByRole('button', { name: 'Confirmă: acord neprimit' })
	).toBeDisabled();
	expect((await (await request.get('http://127.0.0.1:3019/test/row')).json()).consentState).toBe(
		'paper_received'
	);
});

test('mobile participant lines disclose details and preserve explicit paper and cash handoff', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				grade: 5,
				handoffPaperReady: true,
				cashRemainingBani: 15000,
				cashInstallments: [
					{ key: 'cash', amountBani: 15000, remainingBani: 15000, due: '2027-08-24' }
				]
			}
		}
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/registrations');
	const line = page.locator('.mobile-participant');
	const toggle = line.getByRole('button', { name: /Participant de test Clasa 5/ });
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(line.getByText('Susținere CL', { exact: true })).toBeHidden();
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toBeVisible();
	await expect(line.getByRole('button', { name: /^Cash .* de primit/ })).toBeVisible();
	expect((await line.boundingBox())!.height).toBeLessThan(90);
	await line.screenshot({ path: '../../tmp/mobile-participant-line.png' });
	await page.setViewportSize({ width: 320, height: 740 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await line.screenshot({ path: '../../tmp/mobile-participant-narrow.png' });
	expect((await line.boundingBox())!.height).toBeLessThan(90);
	await page.setViewportSize({ width: 390, height: 844 });
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await expect(line.getByText('Susținere CL', { exact: true })).toBeVisible();
	await line.getByRole('checkbox', { name: /Include Participant de test/ }).check();
	await toggle.click();
	await line.getByRole('button', { name: 'Acțiuni pentru Participant de test' }).click();
	await page.getByRole('menuitem', { name: 'Înregistrează sumă', exact: true }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: 'Închide dialogul', exact: true })
		.click();
	await page.getByRole('searchbox', { name: 'Caută participantul sau ID-ul Orgo' }).fill('36805');
	await expect(toggle).toBeVisible();
	await page.getByRole('searchbox', { name: 'Caută participantul sau ID-ul Orgo' }).fill('absent');
	await expect(toggle).toBeHidden();
	await page.getByRole('searchbox', { name: 'Caută participantul sau ID-ul Orgo' }).fill('');
	await line.getByRole('button', { name: /^Cash .* de primit/ }).click();
	await page
		.getByRole('dialog')
		.getByRole('button', { name: /Confirmă acord \+ cash/ })
		.click();
	await expect(page.getByRole('dialog').getByRole('status')).toContainText(
		'acord fizic primit și numerar încasat'
	);
	await page
		.getByRole('dialog')
		.getByRole('button', { name: 'Închide dialogul', exact: true })
		.click();
	await expect(line.getByRole('button', { name: /^Cash .* de primit/ })).toHaveCount(0);
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toHaveText('AP ✓');
	await page.reload();
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toHaveCSS(
		'background-color',
		await themeColor(page, '--sc-success-control-bg')
	);
	await expect(line.getByRole('button', { name: /^Tranșe cash acoperite/ })).toHaveText('Cash ✓');
	await expect(line.getByRole('button', { name: /^Tranșe cash acoperite/ })).toHaveCSS(
		'background-color',
		await themeColor(page, '--sc-success-control-bg')
	);
	await line.screenshot({ path: '../../tmp/mobile-participant-received.png' });
	const updated = await (await request.get('http://127.0.0.1:3019/test/row')).json();
	expect(updated.cashRemainingBani).toBe(0);
	expect(updated.remainingBani).toBe(20000);
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(line).toBeHidden();
	await expect(page.getByRole('columnheader', { name: 'Participant', exact: true })).toBeVisible();
	await page.locator('.sc-table-view').screenshot({ path: '../../tmp/participants-desktop.png' });
});

test('narrow participant lines wrap names and respect missing cash permissions', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: { memberName: 'Alexandru Ștefan Popescu-Ionescu', grade: 0 },
			capabilities: { manage: false, finance: false, sensitive: true, consent: false }
		}
	});
	await page.setViewportSize({ width: 320, height: 740 });
	await page.goto('/activities/1/registrations');
	const line = page.locator('.mobile-participant');
	await expect(line.getByText('Pregătitoare', { exact: true })).toBeVisible();
	await expect(line.getByRole('button', { name: /^Cash/ })).toHaveCount(0);
	await expect(line.getByRole('button', { name: /^Acord pentru/ })).toBeVisible();
	await line.getByRole('button', { name: /Alexandru Ștefan.*Pregătitoare/ }).click();
	await expect(line.getByText('Sold', { exact: true })).toHaveCount(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await line.screenshot({ path: '../../tmp/mobile-participant-expanded.png' });
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
	await openPublicationActions(page);
	await expect(
		page.getByRole('menuitem', { name: 'Retrage pagina publică', exact: true })
	).toBeVisible();
	await page.keyboard.press('Escape');
	await page.getByLabel('Taxă de participare, în lei').fill('100');
	await openPublicationActions(page);
	await expect(
		page.getByRole('menuitem', { name: 'Retrage pagina publică', exact: true })
	).toBeDisabled();
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Salvează setările de plată', exact: true }).click();
	await openPublicationActions(page);
	await expect(
		page.getByRole('menuitem', { name: 'Retrage pagina publică', exact: true })
	).toBeEnabled();
	await page.getByRole('menuitem', { name: 'Retrage pagina publică', exact: true }).click();
	await openPublicationActions(page);
	await expect(
		page.getByRole('menuitem', { name: 'Publică activitatea', exact: true })
	).toBeVisible();
	await page.getByRole('menuitem', { name: 'Publică activitatea', exact: true }).click();
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
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/activities/1/settings/consent');
	const publication = await page
		.getByRole('region', { name: 'Publicarea activității' })
		.boundingBox();
	const editor = await page.locator('#acord').boundingBox();
	expect(publication).not.toBeNull();
	expect(editor).not.toBeNull();
	expect(
		Math.abs(publication!.x + publication!.width - (editor!.x + editor!.width))
	).toBeLessThanOrEqual(24);

	await expect(
		page.getByRole('group', { name: 'Activități specifice unităților · opțional' })
	).toHaveCount(0);
	await expect(page.getByLabel('Verifică acordul pentru unitatea')).toHaveCount(0);
	await page.locator('#consent-commonActivities').fill('Program actualizat fără salvare');
	await page.getByRole('button', { name: '+ Adaugă activitate', exact: true }).click();
	await page
		.getByRole('textbox', { name: 'Activitate 2', exact: true })
		.fill('Atelier de orientare');
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
		.toBe('Program actualizat fără salvare\nAtelier de orientare');
	await page.getByRole('button', { name: 'Salvează acordul', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Datele acordului au fost salvate' })
	).toBeVisible();
	await expect(
		page.getByRole('link', { name: '↓ Descarcă acord de verificare fără date de participant' })
	).toBeVisible();
	expect(
		(await (await request.get('http://127.0.0.1:3019/test/settings')).json()).data.consent
			.commonActivities
	).toBe('Program actualizat fără salvare\nAtelier de orientare');
	expect(
		(await (await request.get('http://127.0.0.1:3019/test/settings')).json()).data.consent.equipment
	).toBe('Bocanci\nPelerină');
	await page.locator('#consent-commonActivities').scrollIntoViewIfNeeded();
	await expect
		.poll(async () => {
			const preview = await page
				.getByRole('complementary', { name: 'Previzualizarea acordului' })
				.boundingBox();
			const topbar = await page.locator('.topbar').boundingBox();
			return (preview?.y ?? 0) - (topbar?.height ?? 0);
		})
		.toBeGreaterThanOrEqual(0);
	const preview = await page
		.getByRole('complementary', { name: 'Previzualizarea acordului' })
		.boundingBox();
	expect(preview).not.toBeNull();
	expect(preview!.y + preview!.height).toBeLessThanOrEqual(1080);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({ path: '../../tmp/agreement-editor-desktop.png', fullPage: true });
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { settings: { unitIds: ['cluj-temerari', 'floresti-temerari'] } }
	});
	await page.reload();
	await expect(
		page.getByRole('group', { name: 'Activități specifice unităților · opțional' })
	).toBeVisible();
	await expect(page.getByLabel('Verifică acordul pentru unitatea')).toHaveValue('cluj-temerari');
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
	await alert.getByRole('button', { name: 'Activități specifice', exact: true }).click();
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
	await page.getByRole('button', { name: /^Acord pentru Participant de test:/ }).click();
	const receipt = page.getByRole('dialog', { name: 'Primire · Participant de test' });
	await expect(receipt).toBeVisible();
	const confirmation = page.waitForRequest(
		(request) => request.url().endsWith('/check-in') && request.method() === 'POST'
	);
	await receipt.getByRole('button', { name: /Confirmă acord \+ cash/ }).click();
	expect((await confirmation).postDataJSON()).toMatchObject({
		paper: true,
		cashKeys: ['cash'],
		cashBani: 15000
	});
	await expect(page.getByRole('status')).toContainText('acord fizic primit și numerar încasat');
	const row = await (await request.get('http://127.0.0.1:3019/test/row')).json();
	expect(row.consentState).toBe('paper_received');
	expect(row.cashRemainingBani).toBe(0);
	expect(row.remainingBani).toBe(20000);
	await expect(page).toHaveURL(/\/activities\/1\/registrations$/);
	await receipt.getByRole('button', { name: 'Închide dialogul' }).click();
	const line = page.getByRole('button', {
		name: /^Tranșe cash acoperite pentru Participant de test/
	});
	await expect(line).toHaveText('Cash ✓');
	await expect(line).toHaveAttribute('aria-pressed', 'true');
	await expect(
		page.getByRole('button', { name: /^Cash .* de primit de la Participant de test/ })
	).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: /^Acord pentru Participant de test:/ })
	).toHaveAttribute('aria-pressed', 'true');
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

test.describe('live agreement date serialization', () => {
	test.use({ timezoneId: 'Europe/Bucharest' });
	test('agreement preview accepts configured registration dates', async ({ page, request }) => {
		await request.post('http://127.0.0.1:3019/test/configure', {
			data: {
				settings: {
					consent: emptyFixedConsent(),
					opensAt: '2027-06-01T08:00:00Z',
					closesAt: '2027-08-10T15:30:00Z',
					unitIds: ['cluj-temerari']
				}
			}
		});
		const responsePromise = page.waitForResponse(
			(response) =>
				response.url().includes('/api/consent-preview/') && response.request().method() === 'POST'
		);
		await page.goto('/activities/1/settings/consent');
		const response = await responsePromise;
		expect(response.status(), response.ok() ? '' : await response.text()).toBe(200);
		expect(response.request().postDataJSON()).toMatchObject({
			opensAt: '2027-06-01T08:00:00.000Z',
			closesAt: '2027-08-10T15:30:00.000Z',
			paymentDue: '2027-08-01'
		});
		await expect(
			page.getByRole('region', { name: 'Acord de participare fără date de participant' })
		).toBeVisible();
		await page.route(
			/\/activitati\/1\/api\/consent-preview\//,
			(route) =>
				route.fulfill({
					status: 503,
					json: { message: 'Previzualizarea este indisponibilă momentan.' }
				}),
			{ times: 1 }
		);
		await page.locator('#consent-commonActivities').fill('Activități păstrate după reîncercare');
		const retry = page.getByRole('button', { name: 'Reîncearcă previzualizarea' });
		await expect(retry).toBeVisible();
		const retried = page.waitForResponse(
			(response) =>
				response.url().includes('/api/consent-preview/') && response.request().method() === 'POST'
		);
		await retry.click();
		expect((await retried).status()).toBe(200);
		await expect(retry).toHaveCount(0);
		await expect(page.locator('#consent-commonActivities')).toHaveValue(
			'Activități păstrate după reîncercare'
		);
	});
	test('new activity wizard preview serializes entered local registration times', async ({
		page
	}) => {
		await page.goto('/activities/new');
		await page.getByLabel('Nume', { exact: true }).fill('Activitate de test');
		await page.getByLabel('Început', { exact: true }).fill('24.08.2027');
		await page.getByLabel('Final', { exact: true }).fill('28.08.2027');
		await page.getByLabel('Locație', { exact: true }).fill('Locație de test');
		await page.getByRole('button', { name: 'Continuă →' }).click();
		await page.getByRole('button', { name: 'Continuă →' }).click();
		await page.getByLabel('Deschidere', { exact: true }).fill('01.06.2027 11:00');
		await page.getByLabel('Închidere', { exact: true }).fill('10.08.2027 18:30');
		await page.getByRole('button', { name: 'Continuă →' }).click();
		const responsePromise = page.waitForResponse(
			(response) =>
				response.url().includes('/activities/new/consent-preview') &&
				response.request().method() === 'POST'
		);
		await page.getByRole('button', { name: 'Pregătește acordul acestei activități' }).click();
		const response = await responsePromise;
		expect(response.status(), response.ok() ? '' : await response.text()).toBe(200);
		expect(response.request().postDataJSON().settings).toMatchObject({
			opensAt: '2027-06-01T08:00:00.000Z',
			closesAt: '2027-08-10T15:30:00.000Z'
		});
		await expect(
			page.getByRole('region', { name: 'Acord de participare fără date de participant' })
		).toBeVisible();
	});
});

test('registration table opens signed agreements and keeps the public controls in one section', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				consentState: 'uploaded',
				cashInstallments: [],
				consentPublicationId: 1,
				answerRevision: 1,
				documents: [
					{
						id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
						kind: 'signed',
						filename: 'acord-semnat.pdf',
						publicationId: 1,
						answerRevision: 1,
						createdAt: '2026-10-29T10:00:00Z'
					}
				]
			}
		}
	});
	await page.goto('/activities/1/registrations');
	await expect(
		page.getByRole('link', { name: 'Deschide pagina publică', exact: true })
	).toHaveCount(1);
	await expect(page.getByText('Pagina pe care o distribui participanților')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Acord parental', exact: true })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Primire participanți', exact: true })).toHaveCount(
		0
	);
	const dialog = page.getByRole('dialog');
	for (const width of [390, 1280]) {
		await page.setViewportSize({ width, height: 844 });
		const pending = page.getByRole('button', {
			name: /^Acord pentru Participant de test:.*verifică PDF-ul/
		});
		await expect(pending).toHaveAttribute('aria-pressed', 'false');
		await expect(pending.locator('svg')).toHaveCount(1);
		await expect(pending.locator('svg')).toHaveAttribute('aria-hidden', 'true');
		await expect(pending).toHaveCSS(
			'background-color',
			await themeColor(page, '--sc-review-control-bg')
		);
		await expect(pending).toHaveCSS('color', await themeColor(page, '--sc-review-control-ink'));
		await expect(page.getByRole('button', { name: /^Cash |^Tranșe cash/ })).toHaveCount(0);
		await pending.click();
		await expect(
			dialog.getByText('Verifică PDF-ul înainte de acceptare', { exact: true })
		).toBeVisible();
		await expect(dialog).toContainText(
			'Pentru acordul încărcat online, semnătura trebuie să fie digitală, nu olografă (scrisă de mână).'
		);
		await expect(dialog).toContainText(
			'Deschide PDF-ul și verifică semnătura înainte de acceptare.'
		);
		if (width === 390) await dialog.getByRole('button', { name: 'Închide dialogul' }).click();
	}

	await expect(dialog.getByRole('link', { name: 'acord-semnat.pdf' })).toHaveAttribute(
		'href',
		/documente\/bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb$/
	);
	await expect(dialog.getByText('Versiunea curentă', { exact: false })).toBeVisible();
	await dialog
		.getByRole('button', { name: 'Am verificat PDF-ul — acceptă acordul digital' })
		.click();
	await expect(dialog).not.toBeVisible();
	await expect(
		page.getByRole('button', { name: /^Acord pentru Participant de test: Acord digital acceptat/ })
	).toHaveAttribute('aria-pressed', 'true');
	const accepted = page.getByRole('button', {
		name: /^Acord pentru Participant de test: Acord digital acceptat/
	});
	await expect(accepted).toHaveText('AP ✓');
	await expect(accepted.locator('svg')).toHaveCount(0);
	await expect(accepted).toHaveCSS(
		'background-color',
		await themeColor(page, '--sc-success-control-bg')
	);
	await expect(accepted).toHaveCSS('color', await themeColor(page, '--sc-success-control-ink'));
	expect((await (await request.get('http://127.0.0.1:3019/test/row')).json()).consentState).toBe(
		'signed_accepted'
	);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole('button', { name: /^Acord pentru/ }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Deschide acordul digital' }).click();
	await expect(page.getByRole('dialog', { name: /Acord digital/ })).toBeVisible();
	await page.getByRole('dialog').getByRole('button', { name: 'Închide dialogul' }).click();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: '../../tmp/registration-inline-receipt-mobile.png',
		fullPage: true
	});
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.screenshot({
		path: '../../tmp/registration-inline-receipt-desktop.png',
		fullPage: true
	});
});

for (const state of ['pending', 'waitlisted'] as const) {
	test(`digital agreement review preserves ${state} registration and financial eligibility`, async ({
		page,
		request
	}) => {
		await request.post('http://127.0.0.1:3019/test/configure', {
			data: {
				...(state === 'pending'
					? { capabilities: { manage: false, sensitive: false, consent: true, finance: true } }
					: {}),
				row: {
					state,
					consentState: 'uploaded',
					consentPublicationId: 1,
					answerRevision: 1,
					handoffPaperReady: true,
					cashInstallments: [
						{ key: 'cash', amountBani: 15000, remainingBani: 15000, due: '2027-08-24' }
					],
					documents: [
						{
							id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
							kind: 'signed',
							filename: 'acord-semnat.pdf',
							publicationId: 1,
							answerRevision: 1,
							createdAt: '2026-10-29T10:00:00Z'
						}
					]
				}
			}
		});
		const before = await (await request.get('http://127.0.0.1:3019/test/row')).json();
		const checkIns: string[] = [];
		page.on('request', (request) => {
			if (request.url().endsWith('/check-in') && request.method() === 'POST')
				checkIns.push(request.url());
		});
		await page.goto('/activities/1/registrations');
		const dialog = page.getByRole('dialog');
		for (const width of [390, 1280]) {
			await page.setViewportSize({ width, height: 844 });
			const pending = page.getByRole('button', {
				name: /^Acord pentru Participant de test:.*verifică PDF-ul/
			});
			await expect(pending.locator('svg')).toHaveCount(1);
			await expect(pending).toHaveCSS(
				'background-color',
				await themeColor(page, '--sc-review-control-bg')
			);
			await expect(page.getByRole('button', { name: /^Cash |^Tranșe cash/ })).toHaveCount(0);
			await pending.click();
			await expect(dialog.getByRole('link', { name: 'acord-semnat.pdf' })).toBeVisible();
			await expect(
				dialog.getByRole('button', { name: 'Acord fizic primit', exact: true })
			).toHaveCount(0);
			if (width === 390) await dialog.getByRole('button', { name: 'Închide dialogul' }).click();
		}
		const acceptance = page.waitForRequest(
			(request) =>
				request.method() === 'PATCH' && request.postDataJSON()?.action === 'signed_accepted'
		);
		await dialog
			.getByRole('button', { name: 'Am verificat PDF-ul — acceptă acordul digital' })
			.click();
		expect((await acceptance).postDataJSON()).toMatchObject({
			action: 'signed_accepted',
			revision: before.revision
		});
		await expect(dialog).not.toBeVisible();
		await page.reload();
		const accepted = page.getByRole('button', {
			name: /^Acord pentru Participant de test: Acord digital acceptat/
		});
		await expect(accepted).toHaveText('AP ✓');
		await expect(accepted).toHaveCSS(
			'background-color',
			await themeColor(page, '--sc-success-control-bg')
		);
		await accepted.click();
		await expect(
			page.getByRole('dialog', { name: 'Acord digital · Participant de test' })
		).toBeVisible();
		await expect(page.getByRole('dialog', { name: /Anulează primirea/ })).toHaveCount(0);
		const after = await (await request.get('http://127.0.0.1:3019/test/row')).json();
		expect(after.state).toBe(state);
		expect(after.consentState).toBe('signed_accepted');
		expect(after.cashBani).toBe(before.cashBani);
		expect(after.remainingBani).toBe(before.remainingBani);
		expect(after.cashInstallments).toEqual(before.cashInstallments);
		expect(after.entries).toEqual(before.entries);
		expect(checkIns).toEqual([]);
	});
}

test('receipt controls respect consent and financial capabilities', async ({ page, request }) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			capabilities: { manage: false, sensitive: false, consent: false, finance: true },
			row: {
				consentState: 'uploaded',
				handoffPaperReady: true,
				cashInstallments: [{ key: 'cash', remainingBani: 15000 }]
			}
		}
	});
	await page.goto('/activities/1/registrations');
	await expect(page.getByRole('button', { name: 'Deschide acordul digital' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^Acord pentru/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^Cash .* de primit/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Acord fizic primit|Confirmă acord/ })).toHaveCount(
		0
	);
});

test('authorized document readers can download without accepting agreements', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			capabilities: { manage: false, sensitive: true, consent: false, finance: false },
			row: {
				consentState: 'uploaded',
				documents: [
					{
						id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
						kind: 'signed',
						filename: 'acord-semnat.pdf',
						publicationId: 1,
						answerRevision: 1,
						createdAt: '2026-10-29T10:00:00Z'
					}
				]
			}
		}
	});
	await page.goto('/activities/1/registrations');
	await page.getByRole('button', { name: /^Acord pentru Participant de test:/ }).click();
	const dialog = page.getByRole('dialog');
	const downloadPromise = page.waitForEvent('download');
	await dialog.getByRole('link', { name: 'acord-semnat.pdf' }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe('acord-semnat.pdf');
	expect(await download.failure()).toBeNull();
	await expect(dialog.getByRole('button', { name: /acceptă acordul digital/ })).toHaveCount(0);
});

test('outdated signed agreements remain accessible without accepting an old version', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			row: {
				consentState: 'update_required',
				answerRevision: 2,
				documents: [
					{
						id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
						kind: 'signed',
						filename: 'acord-anterior.pdf',
						publicationId: 1,
						answerRevision: 1,
						createdAt: '2026-10-29T10:00:00Z'
					}
				]
			}
		}
	});
	await page.goto('/activities/1/registrations');
	await page.getByRole('button', { name: /^Acord pentru Participant de test:/ }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('link', { name: 'acord-anterior.pdf' })).toBeVisible();
	await expect(dialog.getByText('Versiune anterioară', { exact: false })).toBeVisible();
	await expect(dialog.getByRole('button', { name: /acceptă acordul digital/ })).toHaveCount(0);
});

test('public activity emphasizes the Romanian deadline and shows practical information without accordions', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: {
			eligibleBranches: ['temerari'],
			settings: { closesAt: '2027-08-10T15:30:00Z' },
			information: {
				...createRepresentativeOrganizerDraft(),
				fixedDetails: {
					...emptyFixedConsent(),
					communication: 'Părinții primesc informații de la coordonator.'
				}
			}
		}
	});
	await page.context().clearCookies();
	await page.goto('/activitati/1');
	const deadline = page.getByRole('complementary', { name: 'Termen de înscriere' });
	await expect(deadline).toContainText('10 august 2027');
	await expect(deadline).toContainText('18:30');
	expect(
		await deadline.locator('strong').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
	).toBeGreaterThanOrEqual(18);
	const practical = page.getByRole('region', { name: 'Informații practice' });
	await expect(practical.getByRole('heading', { name: 'Activități', exact: true })).toBeVisible();
	await expect(practical.getByText('Program specific Temerari', { exact: true })).toBeVisible();
	await expect(
		practical.getByText('Detaliile se comunică de coordonator.', { exact: true })
	).toBeVisible();
	await expect(practical.locator('details')).toHaveCount(0);
	await expect(practical.getByRole('combobox')).toHaveCount(0);
	const safety = page.getByRole('region', { name: 'Siguranță și acord', exact: true });
	await expect(safety).toBeVisible();
	expect((await safety.innerText()).length).toBeLessThan(600);
	await safety
		.getByRole('button', { name: 'Consultă regulile și protecția datelor', exact: true })
		.click();
	await expect(
		page.getByRole('dialog').getByRole('heading', { name: /Riscuri previzibile/ })
	).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(
		page.getByRole('link', { name: 'Autentifică-te cu Orgo', exact: true })
	).toBeVisible();
	await expect(page.getByText('Ai cont Orgo (membri.scout.ro)?', { exact: true })).toBeVisible();
	await page.screenshot({ path: '../../tmp/activity-practical-desktop.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: '../../tmp/activity-practical-mobile.png', fullPage: true });
});

test('public activity switches the visible program between eligible branches', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { eligibleBranches: ['lupisori', 'temerari'] }
	});
	await page.goto('/activitati/1');
	const practical = page.getByRole('region', { name: 'Informații practice' });
	const choice = practical.getByRole('combobox', { name: 'Program pentru ramura', exact: true });
	await expect(choice.locator('option')).toHaveText(['Lupișori', 'Temerari']);
	await choice.selectOption('temerari');
	await expect(practical.getByText('Program specific Temerari', { exact: true })).toBeVisible();
	await expect(practical.getByText('Program specific Lupișori', { exact: true })).toHaveCount(0);
});

test('fixed agreement communication is shown once beside the organizer contact', async ({
	page,
	request
}) => {
	const communication = 'Comunicare prin WhatsApp cu părinții.';
	const information = createRepresentativeOrganizerDraft();
	information.fixedDetails = { ...emptyFixedConsent(), communication };
	information.branches.temerari.pickupDetails = communication;
	await request.post('http://127.0.0.1:3019/test/configure', {
		data: { eligibleBranches: ['temerari'], information }
	});
	await page.goto('/activitati/1');
	await expect(
		page
			.getByRole('region', { name: 'Informații practice' })
			.getByText(communication, { exact: true })
	).toHaveCount(1);
});
