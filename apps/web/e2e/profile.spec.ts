import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3015';
test.beforeEach(async ({ page, request }) => {
	await request.post(`${api}/test/reset`);
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-finance-session',
			url: 'http://127.0.0.1:5182'
		}
	]);
});

test('creates through a dialog and preserves the objective after reload', async ({
	page
}, testInfo) => {
	await page.goto('/profile');
	await expect(page.getByText('Nu ai adăugat încă niciun obiectiv personal.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Activează notificările' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Adaugă obiectiv', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await page.getByLabel('Titlu', { exact: true }).fill('Organizez o drumeție');
	await page
		.getByLabel('Descriere', { exact: true })
		.fill('Pregătesc traseul.\nVerific echipamentul.');
	await page.getByLabel('Termen limită').fill('2026-11-15');
	await page.screenshot({ path: testInfo.outputPath('desktop-objective-dialog.png') });
	await page.getByRole('button', { name: 'Salvează obiectiv' }).click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Organizez o drumeție' })).toBeVisible();
	await expect(page.locator('time')).toHaveAttribute('datetime', '2026-11-15');
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Organizez o drumeție' })).toBeVisible();
	await expect(page.getByText('Pregătesc traseul.\nVerific echipamentul.')).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('desktop-profile.png') });
});

test('cancel and Escape save nothing and restore keyboard focus', async ({ page }) => {
	await page.goto('/profile');
	const trigger = page.getByRole('button', { name: 'Adaugă obiectiv', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	for (let i = 0; i < 9; i++) {
		await page.keyboard.press('Tab');
		expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
	}
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
	await trigger.click();
	await page.getByLabel('Titlu', { exact: true }).fill('Nu se salvează');
	await page.getByRole('button', { name: 'Anulează', exact: true }).click();
	await expect(trigger).toBeFocused();
	await page.reload();
	await expect(page.getByText('Nu ai adăugat încă niciun obiectiv personal.')).toBeVisible();
});

test('validates required text and retains values on a failed save', async ({ page, request }) => {
	await page.goto('/profile');
	await page.getByRole('button', { name: 'Adaugă obiectiv', exact: true }).click();
	await page.getByRole('button', { name: 'Salvează obiectiv' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.getByLabel('Titlu', { exact: true }).fill('   ');
	await page.getByLabel('Descriere', { exact: true }).fill('Descrierea obiectivului');
	await page.getByLabel('Termen limită').fill('2026-11-15');
	await page.getByRole('button', { name: 'Salvează obiectiv' }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: 'Completează titlul și descrierea.' })
	).toBeVisible();
	await page.getByLabel('Titlu', { exact: true }).fill('Un obiectiv');
	await request.post(`${api}/test/profile`, { data: { failSave: true } });
	await page.getByRole('button', { name: 'Salvează obiectiv' }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: 'Salvarea nu este disponibilă momentan.' })
	).toBeVisible();
	await expect(page.getByLabel('Titlu', { exact: true })).toHaveValue('Un obiectiv');
	await expect(page.getByLabel('Descriere', { exact: true })).toHaveValue(
		'Descrierea obiectivului'
	);
	await request.post(`${api}/test/profile`, { data: { failSave: false, saveDelay: 700 } });
	await page.getByRole('button', { name: 'Salvează obiectiv' }).click();
	await expect(page.getByRole('button', { name: 'Se salvează…' })).toBeDisabled();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Un obiectiv', exact: true })).toBeVisible();
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('list failures offer retry without showing an empty state', async ({ page, request }) => {
	await request.post(`${api}/test/profile`, { data: { failList: true } });
	await page.goto('/profile');
	await expect(
		page.getByText('Obiectivele nu au putut fi încărcate. Încearcă din nou.')
	).toBeVisible();
	await expect(page.getByText('Nu ai adăugat încă niciun obiectiv personal.')).toHaveCount(0);
	await request.post(`${api}/test/profile`, { data: { failList: false } });
	await page.getByRole('button', { name: 'Reîncearcă' }).click();
	await expect(page.getByText('Nu ai adăugat încă niciun obiectiv personal.')).toBeVisible();
});

test('mobile objectives remain within the viewport and dates stay stable across timezones', async ({
	browser,
	request
}, testInfo) => {
	await request.post(`${api}/api/personal-objectives`, {
		data: {
			title: 'Un obiectiv mai vechi',
			description: 'Un obiectiv cu termen depășit.',
			deadline: '2020-01-15'
		}
	});
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		timezoneId: 'America/Los_Angeles'
	});
	await context.addCookies([
		{ name: 'scoutscluj_session', value: 'synthetic-finance-session', url: 'http://127.0.0.1:5182' }
	]);
	const page = await context.newPage();
	await page.goto('/profile');
	await expect(page.locator('time')).toHaveText('15 ianuarie 2020');
	await expect(page.getByText('Termen depășit', { exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
	await page.screenshot({ path: testInfo.outputPath('mobile-profile.png'), fullPage: true });
	await page.getByRole('button', { name: 'Adaugă obiectiv', exact: true }).click();
	const box = await page.getByRole('dialog').boundingBox();
	expect(box?.x).toBeGreaterThanOrEqual(16);
	expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(374);
	await page.screenshot({ path: testInfo.outputPath('mobile-objective-dialog.png') });
	await context.close();
});

test('notification settings retain all controls and refresh the profile summary on return', async ({
	page
}) => {
	await page.addInitScript(() => {
		let permission = 'default';
		Object.defineProperty(Notification, 'permission', { get: () => permission });
		Notification.requestPermission = async () => {
			permission = 'granted';
			return 'granted';
		};
		const subscription = {
			unsubscribe: async () => true,
			toJSON: () => ({
				endpoint: 'https://push.example.test/subscription',
				keys: { p256dh: 'test', auth: 'test' }
			})
		};
		const registration = {
			pushManager: {
				getSubscription: async () => subscription,
				subscribe: async () => subscription
			}
		};
		Object.defineProperty(navigator, 'serviceWorker', {
			value: { getRegistration: async () => registration, register: async () => registration }
		});
	});
	await page.goto('/profile');
	await expect(page.getByText('Inactive pe acest dispozitiv')).toBeVisible();
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await expect(page).toHaveURL(/\/profile\/notifications$/);
	await page.getByRole('button', { name: 'Activează notificările' }).click();
	await expect(page.getByRole('button', { name: 'Trimite test' })).toBeEnabled();
	await page.getByRole('button', { name: 'Trimite test' }).click();
	await expect(page.getByText('Test procesat: 1 trimise, 0 eșuate.')).toBeVisible();
	await page.getByRole('link', { name: 'Înapoi la profil' }).click();
	await expect(page.getByText('Active pe acest dispozitiv', { exact: true })).toBeVisible();
	await expect(page.getByText('1 dispozitiv activ')).toBeVisible();
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await page.getByRole('button', { name: 'Dezactivează acest dispozitiv' }).click();
	await expect(page.getByRole('button', { name: 'Trimite test' })).toBeDisabled();
	await page.getByRole('button', { name: 'Activează notificările' }).click();
	await page.getByRole('button', { name: 'Dezactivează toate', exact: true }).click();
	await page.getByRole('link', { name: 'Înapoi la profil' }).click();
	await expect(page.getByText('0 dispozitive active')).toBeVisible();
});

test('unsupported browsers and notification failures stay readable', async ({ page, request }) => {
	await page.addInitScript(() => {
		Reflect.deleteProperty(window, 'PushManager');
	});
	await page.goto('/profile');
	await expect(page.getByText('Push nesuportat în acest browser')).toBeVisible();
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await expect(page.getByText('Browserul nu suportă notificări push.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Activează notificările' })).toBeDisabled();
	await request.post(`${api}/test/profile`, { data: { failNotifications: true } });
	await page.getByRole('link', { name: 'Înapoi la profil' }).click();
	await expect(page.getByText('Statusul notificărilor nu este disponibil.')).toBeVisible();
	await expect(page.getByText('0 dispozitive active')).toHaveCount(0);
});

test('denied notification permission does not prompt and disables enable', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
		Notification.requestPermission = async () => {
			throw new Error('Unexpected permission prompt');
		};
	});
	await page.goto('/profile');
	await expect(page.getByText('Permisiune refuzată în browser')).toBeVisible();
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await expect(page.getByText(/Permisiunea a fost refuzată/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Activează notificările' })).toBeDisabled();
});
