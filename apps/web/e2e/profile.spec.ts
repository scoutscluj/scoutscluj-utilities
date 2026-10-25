import { expect, test } from '@playwright/test';

const api = process.env.MEMBERSHIP_TEST_API_URL ?? 'http://127.0.0.1:3015';
test.beforeEach(async ({ page, request }) => {
	await request.post(`${api}/test/reset`);
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-finance-session',
			url: test.info().project.use.baseURL!
		}
	]);
});

test('creates through a dialog and preserves the objective after reload', async ({
	page,
	request
}, testInfo) => {
	await page.addInitScript(() => {
		Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'default' });
	});
	await page.route('https://images.example.test/profile.jpg', (route) =>
		route.fulfill({
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#e9edf5"/><circle cx="32" cy="23" r="11" fill="#64748b"/><path d="M10 64v-6a22 22 0 0 1 44 0v6" fill="#64748b"/></svg>'
		})
	);
	await request.post(`${api}/test/profile`, {
		data: {
			notificationConfigured: false,
			user: {
				displayName: 'Florin Tomozei',
				email: 'florin@example.test',
				avatarUrl: 'https://images.example.test/profile.jpg',
				orgoConnection: {
					cardId: 'FT678',
					orgoUserId: 517,
					connectedAt: '2026-06-01T08:00:00Z',
					profile: {
						email: 'florin@example.test',
						status: 'ACTIVE',
						dateOfBirth: '1993-03-09',
						dateJoined: '2007-11-20',
						feeValidUntilDate: '2026-09-30'
					},
					lastLoginAt: '2026-10-23T08:42:24.373Z'
				}
			}
		}
	});
	await page.goto('/profile');
	const details = page.getByRole('region', { name: 'Informații personale' });
	const orgo = page.getByRole('region', { name: 'Conexiune Orgo' });
	const warning = page.getByRole('complementary', {
		name: 'Situația cotizației nu este disponibilă'
	});
	await expect(warning).toBeVisible();
	await expect(warning.getByRole('link', { name: 'Vezi cotizația' })).toBeVisible();
	await expect(details.getByRole('link', { name: 'Plătește cotizația' })).toHaveCount(0);
	await expect(details.getByRole('heading', { name: 'Roluri în aplicație' })).toBeVisible();
	await expect(details.getByText('FT678')).toBeVisible();
	await expect(orgo.getByText('FT678')).toHaveCount(0);
	await expect(details.getByText('9 martie 1993')).toBeVisible();
	await expect(details.getByText('20 noiembrie 2007')).toBeVisible();
	await expect(details.locator('.fee-field')).toContainText('Indisponibilă');
	await expect(details.getByText('Expirată', { exact: true })).toHaveCount(0);
	await expect(details.getByText('Activ', { exact: true })).toBeVisible();
	await expect(details.getByRole('link', { name: 'florin@example.test' })).toBeVisible();
	await expect(orgo.getByText('517', { exact: true })).toBeVisible();
	await expect(orgo.getByText('23 oct. 2026, 11:42')).toBeVisible();
	const photo = page.getByAltText('Fotografie de profil: Florin Tomozei');
	await expect(photo).toBeVisible();
	expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
	const notifications = page.getByRole('link', { name: 'Setări notificări' });
	await expect(notifications).toHaveAccessibleName(
		'Setări notificări: Notificările nu sunt configurate'
	);
	await expect(notifications.locator('svg')).toHaveCount(1);
	const name = await page
		.getByRole('heading', { name: 'Florin Tomozei', exact: true })
		.boundingBox();
	const bell = await notifications.boundingBox();
	const logout = await page.getByRole('button', { name: 'Deconectare', exact: true }).boundingBox();
	expect(bell!.x).toBeGreaterThan(name!.x + name!.width);
	expect(logout!.x).toBeGreaterThan(bell!.x + bell!.width);
	expect(Math.abs(logout!.y - bell!.y)).toBeLessThanOrEqual(1);
	const card = await details.boundingBox();
	const objectives = await page.getByRole('region', { name: 'Obiective personale' }).boundingBox();
	const orgoCard = await orgo.boundingBox();
	const warningBox = await warning.boundingBox();
	expect(warningBox!.y + warningBox!.height).toBeLessThan(card!.y);
	expect(Math.abs(warningBox!.x - card!.x)).toBeLessThanOrEqual(1);
	expect(Math.abs(warningBox!.width - objectives!.width)).toBeLessThanOrEqual(1);
	expect(orgoCard!.x).toBeGreaterThan(card!.x + card!.width);
	expect(Math.abs(card!.y - orgoCard!.y)).toBeLessThanOrEqual(1);
	expect(Math.abs(card!.width - 2 * orgoCard!.width)).toBeLessThanOrEqual(1);
	expect(Math.abs(card!.height - orgoCard!.height)).toBeLessThanOrEqual(1);
	expect(card!.height).toBeLessThan(300);
	expect(Math.abs(orgoCard!.x + orgoCard!.width - card!.x - objectives!.width)).toBeLessThanOrEqual(
		1
	);
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
	await expect(page.locator('.objectives time')).toHaveAttribute('datetime', '2026-11-15');
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Organizez o drumeție' })).toBeVisible();
	await expect(page.getByText('Pregătesc traseul.\nVerific echipamentul.')).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.screenshot({
		path: testInfo.outputPath('desktop-profile.png'),
		fullPage: true,
		animations: 'disabled'
	});
	for (const width of [375, 768, 1024, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/profile');
		await expect(
			page.getByRole('heading', { name: 'Informații personale', exact: true })
		).toBeVisible();
		await page.evaluate(() => window.scrollTo(0, 0));
		expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
			false
		);
		await page.screenshot({
			path: testInfo.outputPath(`profile-${width}.png`),
			fullPage: true,
			animations: 'disabled'
		});
	}
	const payFee = page.getByRole('link', { name: 'Vezi cotizația', exact: true });
	await expect(payFee).toHaveAttribute('href', '/cotizatie');
	await payFee.click();
	await expect(page).toHaveURL(/\/cotizatie$/);
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
		{
			name: 'scoutscluj_session',
			value: 'synthetic-finance-session',
			url: test.info().project.use.baseURL!
		}
	]);
	const page = await context.newPage();
	await page.route('https://images.example.test/missing.jpg', (route) => route.abort());
	await request.post(`${api}/test/profile`, {
		data: { user: { avatarUrl: 'https://images.example.test/missing.jpg' } }
	});
	await page.goto('/profile');
	await expect(page.locator('.profile-identity .avatar img')).toHaveCount(0);
	await expect(page.locator('.profile-identity .avatar')).toHaveText('R');
	const personalCard = await page
		.getByRole('region', { name: 'Informații personale' })
		.boundingBox();
	const orgoCard = await page.getByRole('region', { name: 'Conexiune Orgo' }).boundingBox();
	expect(orgoCard!.y).toBeGreaterThan(personalCard!.y + personalCard!.height);
	await expect(page.locator('.objectives time')).toHaveText('15 ianuarie 2020');
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
	await expect(page.getByRole('link', { name: 'Setări notificări' })).toHaveAccessibleName(
		'Setări notificări: Notificările sunt inactive pe acest dispozitiv'
	);
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await expect(page).toHaveURL(/\/profile\/notifications$/);
	await page.getByRole('button', { name: 'Activează notificările' }).click();
	await expect(page.getByRole('button', { name: 'Trimite test' })).toBeEnabled();
	await page.getByRole('button', { name: 'Trimite test' }).click();
	await expect(page.getByText('Test procesat: 1 trimise, 0 eșuate.')).toBeVisible();
	await page.getByRole('link', { name: 'Înapoi la profil' }).click();
	await expect(page.getByRole('link', { name: 'Setări notificări' })).toHaveAccessibleName(
		'Setări notificări: Notificările sunt active pe acest dispozitiv'
	);
	await expect(
		page.getByRole('link', { name: 'Setări notificări' }).locator('.status-badge')
	).toBeVisible();
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await page.getByRole('button', { name: 'Dezactivează acest dispozitiv' }).click();
	await expect(page.getByRole('button', { name: 'Trimite test' })).toBeDisabled();
	await page.getByRole('button', { name: 'Activează notificările' }).click();
	await page.getByRole('button', { name: 'Dezactivează toate', exact: true }).click();
	await page.getByRole('link', { name: 'Înapoi la profil' }).click();
	await expect(page.getByRole('link', { name: 'Setări notificări' })).toHaveAccessibleName(
		'Setări notificări: Notificările sunt inactive pe acest dispozitiv'
	);
	await expect(
		page.getByRole('link', { name: 'Setări notificări' }).locator('.status-badge')
	).toHaveCount(0);
});

test('unsupported browsers and notification failures stay readable', async ({ page, request }) => {
	await page.addInitScript(() => {
		Reflect.deleteProperty(window, 'PushManager');
	});
	await page.goto('/profile');
	await expect(page.getByRole('link', { name: 'Setări notificări' })).toHaveAccessibleName(
		'Setări notificări: Push nesuportat în acest browser'
	);
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await expect(page.getByText('Browserul nu suportă notificări push.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Activează notificările' })).toBeDisabled();
	await request.post(`${api}/test/profile`, { data: { failNotifications: true } });
	await page.getByRole('link', { name: 'Înapoi la profil' }).click();
	await expect(page.getByRole('link', { name: 'Setări notificări' })).toHaveAccessibleName(
		'Setări notificări: Statusul notificărilor nu este disponibil'
	);
	await expect(
		page.getByRole('link', { name: 'Setări notificări' }).locator('.status-badge')
	).toHaveCount(0);
});

test('denied notification permission does not prompt and disables enable', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(Notification, 'permission', { get: () => 'denied' });
		Notification.requestPermission = async () => {
			throw new Error('Unexpected permission prompt');
		};
	});
	await page.goto('/profile');
	await expect(page.getByRole('link', { name: 'Setări notificări' })).toHaveAccessibleName(
		'Setări notificări: Permisiune refuzată în browser'
	);
	await page.getByRole('link', { name: 'Setări notificări' }).click();
	await expect(page.getByText(/Permisiunea a fost refuzată/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Activează notificările' })).toBeDisabled();
});

for (const { name, paidBani, date, failMembership, expected } of [
	{ name: 'unpaid current fee', paidBani: 0, date: '2099-09-30', expected: true },
	{ name: 'partially paid current fee', paidBani: 10000, date: '2099-09-30', expected: true },
	{ name: 'fully paid current fee', paidBani: 30500, date: '2099-09-30', expected: false },
	{
		name: 'paid local fee with expired Orgo date',
		paidBani: 30500,
		date: '2020-09-30',
		expected: false
	},
	{ name: 'no recorded fee validity', paidBani: undefined, date: undefined, expected: null },
	{ name: 'paid fee with a missing Orgo date', paidBani: 30500, date: undefined, expected: false },
	{
		name: 'unavailable balance with valid Orgo date',
		paidBani: 0,
		date: '2099-09-30',
		failMembership: true,
		expected: null
	}
]) {
	test(`profile payment link: ${name}`, async ({ page, request }) => {
		const catalog = await request.get(`${api}/api/membership/catalog`);
		const { period } = (await catalog.json()) as { period: { id: string } };
		const own = { id: 'own', periodId: period.id, orgoUserId: 517, totalBani: 30500, paidBani };
		await request.post(`${api}/test/profile`, {
			data: {
				user: { orgoConnection: { orgoUserId: 517, profile: { feeValidUntilDate: date } } },
				membershipObligations:
					paidBani === undefined
						? []
						: [
								own,
								{ ...own, id: 'old', periodId: 'past-period', paidBani: 0 },
								{ ...own, id: 'other-member', orgoUserId: 999, paidBani: 0 }
							],
				failMembership: failMembership ?? false
			}
		});
		await page.goto('/profile');
		const payFee = page.getByRole('link', { name: 'Plătește cotizația', exact: true });
		const feeField = page.locator('.fee-field');
		await expect(feeField).toContainText(
			expected === null ? 'Indisponibilă' : expected ? 'De achitat' : 'Achitată'
		);
		await expect(feeField.getByText('Expirată', { exact: true })).toHaveCount(0);
		const warning = page.getByRole('complementary', {
			name: /Ai o cotizație de achitat|Situația cotizației nu este disponibilă/
		});
		if (expected === null) {
			await expect(warning).toBeVisible();
			await expect(warning.getByRole('link', { name: 'Vezi cotizația' })).toBeVisible();
			await expect(payFee).toHaveCount(0);
		} else if (expected) {
			await expect(warning).toBeVisible();
			await expect(warning.getByRole('link', { name: 'Plătește cotizația' })).toBeVisible();
			await expect(payFee).toBeVisible();
			await payFee.click();
			await expect(page).toHaveURL(/\/cotizatie$/);
		} else {
			await expect(warning).toHaveCount(0);
			await expect(payFee).toHaveCount(0);
		}
	});
}
