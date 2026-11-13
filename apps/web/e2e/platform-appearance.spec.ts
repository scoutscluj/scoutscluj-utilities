import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import {
	captureWorkspace,
	expectRenderedContrast,
	seedTheme,
	watchRuntimeErrors,
	expectNoRuntimeErrors
} from './design-helpers';
const api = 'http://127.0.0.1:3030';

async function seedRepresentativeData(request: APIRequestContext) {
	await request.post(`${api}/test/reset`);
	await request.post(`${api}/test/platform/reset`);
	await request.post(`${api}/test/profile`, {
		data: {
			adultDocuments: true,
			documentsAdmin: true,
			user: {
				displayName: 'Ana Popescu',
				email: 'ana@example.test',
				roles: ['super_admin'],
				orgoConnection: {
					orgoUserId: 36801,
					cardId: 'AP36801',
					connectedAt: '2026-08-01T08:00:00Z',
					lastLoginAt: '2026-11-13T09:00:00Z',
					profile: {
						email: 'ana@example.test',
						status: 'ACTIVE',
						dateOfBirth: '1992-04-15',
						dateJoined: '2008-09-01',
						feeValidUntilDate: '2027-08-31'
					}
				}
			}
		}
	});
	await request.post(`${api}/api/personal-objectives`, {
		data: {
			title: 'Pregătesc o drumeție de unitate',
			description: 'Aleg traseul și discut echipamentul cu echipa de lideri.',
			deadline: '2027-03-20'
		}
	});
	const upload = async (memberId: string, kind: string) => {
		const response = await request.post(`${api}/api/adult-documents/members/${memberId}`, {
			data: {
				year: 2026,
				kind,
				filename: `${kind}.pdf`,
				contentType: 'application/pdf',
				contentBase64: Buffer.from('%PDF-1.7\nSynthetic document for UI tests').toString('base64')
			}
		});
		expect(response.ok()).toBeTruthy();
		return (await response.json()).id as string;
	};
	await upload('11111111-1111-4111-8111-111111111111', 'behavioural_integrity');
	const validated = await upload('22222222-2222-4222-8222-222222222222', 'behavioural_integrity');
	await request.post(`${api}/api/adult-documents/versions/${validated}/review`, {
		data: { status: 'validated' }
	});
	const rejected = await upload('22222222-2222-4222-8222-222222222222', 'criminal_record');
	await request.post(`${api}/api/adult-documents/versions/${rejected}/review`, {
		data: { status: 'rejected', reason: 'Încarcă PDF-ul complet, fără pagini lipsă.' }
	});
}
async function dialogCapture(page: Page, name: string) {
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expectRenderedContrast(page);
	await expect
		.poll(() => dialog.evaluate((node) => node.contains(document.activeElement)), {
			message: 'Dialog receives focus'
		})
		.toBe(true);
	await mkdir('../../tmp/design-review', { recursive: true });
	await dialog.screenshot({ path: `../../tmp/design-review/${name}.png` });
	const overflow = await dialog.evaluate((node) => ({
		width: node.clientWidth,
		scroll: node.scrollWidth,
		oversized: [...node.querySelectorAll('*')]
			.filter((child) => child.getBoundingClientRect().width > node.clientWidth)
			.map((child) => ({
				tag: child.tagName,
				class: child.getAttribute('class'),
				width: child.getBoundingClientRect().width
			}))
			.slice(0, 12)
	}));
	expect(
		overflow.scroll,
		`Dialog contents fit available width: ${JSON.stringify(overflow.oversized)}`
	).toBeLessThanOrEqual(overflow.width + 1);
}
async function closeDialog(page: Page) {
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
}

test.beforeEach(async ({ page, request }) => {
	watchRuntimeErrors(page);
	await seedRepresentativeData(request);
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-platform-session',
			url: 'http://127.0.0.1:5190'
		}
	]);
	// These routes test our embed shell only. Third-party documents remain outside platform styling.
	await page.route(/^https:\/\/(docs\.google\.com|scoutscluj\.notion\.site)\//, (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: '<!doctype html><html lang="ro"><meta name="color-scheme" content="light dark"><title>Conținut extern sintetic</title><body><p>Conținut extern simulat pentru verificarea cadrului platformei.</p></body></html>'
		})
	);
});
test.afterEach(({ page }) => expectNoRuntimeErrors(page));

const surfaces = [
	['/profile', 'personal-profile'],
	['/profile/notifications', 'personal-notifications'],
	['/admin', 'administration'],
	['/admin/users', 'admin-users'],
	['/admin/adult-documents', 'adult-documents'],
	['/admin/orgo-sync', 'orgo-outbox'],
	['/admin/notifications', 'admin-notifications'],
	['/admin/parental-consent', 'consent-administration'],
	['/audit', 'global-audit'],
	['/finance', 'finance-overview'],
	['/finance/documents', 'finance-documents'],
	['/sediu/inventar', 'inventory'],
	['/info/statut', 'organization-statute'],
	['/sediu/regulament', 'headquarters-rules'],
	['/programe/regulamente', 'program-rules'],
	['/user/docs', 'user-documentation-shell'],
	['/user/feedback', 'feedback-shell'],
	['/applications', 'member-applications']
] as const;
for (const theme of ['light', 'dark'] as const)
	for (const width of [320, 390, 768, 1024, 1280]) {
		test(`remaining platform ${width}px ${theme}`, async ({ page }) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 900 });
			for (const [route, name] of surfaces) {
				const response = await page.goto(route);
				expect(
					response?.status(),
					`${route}: successful page, no forbidden/missing/server-error placeholder`
				).toBeLessThan(400);
				await expect(page).not.toHaveURL(/\/login/);
				if (route === '/admin/notifications')
					await expect(page.locator('[aria-label="Abonamente active"]')).toContainText('24');
				if (route === '/profile/notifications')
					await expect(page.getByText('Se încarcă setările…')).toHaveCount(0);
				await captureWorkspace(page, `platform-${name}-${width}-${theme}`);
				if (route === '/sediu/inventar' && width <= 1280) {
					await expect(page.locator('.table-shell')).toBeHidden();
					await expect(page.locator('.card-list')).toBeVisible();
					const card = page.locator('.inventory-card').first();
					for (const name of ['Editează', 'Șterge']) {
						const action = card.getByRole('button', { name, exact: true });
						await expect(action).toBeVisible();
						const bounds = await action.boundingBox();
						expect(bounds!.width).toBeGreaterThanOrEqual(44);
						expect(bounds!.height).toBeGreaterThanOrEqual(44);
						expect(bounds!.x).toBeGreaterThanOrEqual(0);
						expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
					}
					await card.getByText('Detalii', { exact: true }).click();
					const details = card.locator('.card-secondary');
					await expect(details.locator('dl')).toBeVisible();
					await expect(details.locator('dl')).toContainText('Centru local');
					await expect(details.locator('dl')).toContainText('Cluj');
					await expect(details.locator('dl')).toContainText('Ana Popescu');
					await captureWorkspace(page, `platform-inventory-details-${width}-${theme}`);
					await expectRenderedContrast(page);
				}
				if (route === '/admin/users' && width <= 1024) {
					for (const row of await page.locator('.user-row').all()) {
						const bounds = await row.boundingBox();
						expect(
							bounds!.height,
							'Compact user rows keep name, email and role summary dense'
						).toBeLessThanOrEqual(130);
					}
					const identity = page.locator('.compact-identity').first();
					await identity.locator('summary').click();
					await expect(identity.locator('dl')).toBeVisible();
					await expect(identity.locator('dl')).toContainText('Roluri');
					await identity.locator('summary').click();
				}
				if (route === '/admin/orgo-sync' && width <= 1024) {
					for (const action of [
						page.getByRole('button', { name: 'Verifică în Orgo', exact: true }).first(),
						page.getByText('Reia / asociază', { exact: true })
					]) {
						await expect(action).toBeVisible();
						const bounds = await action.boundingBox();
						expect(
							bounds!.x,
							'Outbox action stays inside the left viewport boundary'
						).toBeGreaterThanOrEqual(0);
						expect(
							bounds!.x + bounds!.width,
							'Outbox action remains reachable without horizontal scrolling'
						).toBeLessThanOrEqual(width);
						expect(bounds!.height).toBeGreaterThanOrEqual(44);
					}
					for (const table of await page.locator('.table').all())
						expect(
							await table.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
							'Outbox cards do not require internal horizontal scrolling'
						).toBe(true);
					await page.getByText('Reia / asociază', { exact: true }).click();
					await expect(page.getByLabel('ID Orgo verificat', { exact: true })).toBeVisible();
					await expect(page.getByLabel('Dovada verificării', { exact: true })).toBeVisible();
					await captureWorkspace(page, `platform-orgo-object-details-${width}-${theme}`);
					await expectRenderedContrast(page);
				}

				if (route === '/applications') {
					await expect(page.locator('.toolbar')).toContainText('1 cerere');
					await page.locator('.toolbar select').selectOption('all');
					await expect(page.locator('.toolbar')).toContainText('3 cereri');
					await expect(page.locator('details.application')).toHaveCount(3);
					const application = page.locator('details.application').first();
					await application.locator('summary').first().click();
					await expect(application).toHaveJSProperty('open', true);
					await expect(
						application.getByRole('region', { name: 'Date membru', exact: true })
					).toBeVisible();
					await expect(
						application.getByRole('region', { name: 'Părinte sau tutore', exact: true })
					).toBeVisible();
					await captureWorkspace(page, `platform-member-applications-expanded-${width}-${theme}`);
					await expectRenderedContrast(page);
					const calls = (await (await page.request.get(`${api}/test/platform/state`)).json())
						.calls as { method: string; path: string }[];
					expect(
						calls.filter(
							(call) => call.path.startsWith('/api/member-applications') && call.method !== 'GET'
						),
						'Reading and filtering applications do not submit review decisions'
					).toEqual([]);
				}

				if (route === '/audit' && width <= 1024) {
					const rows = page.locator('.audit-table > tbody > tr');
					await expect(rows).toHaveCount(2);
					for (const row of await rows.all()) {
						await expect(row.locator('.audit-compact-cell')).toBeVisible();
						const bounds = await row.boundingBox();
						expect(
							bounds!.height,
							'Audit entries keep date, actor and summary compact'
						).toBeLessThanOrEqual(160);
					}
					const first = rows.first().locator('.audit-compact-cell');
					await expect(first).not.toContainText('Activitate #');
					await expect(rows.last().locator('.audit-compact-cell')).toContainText('Activitate #1');
					const search = page.getByLabel('Caută în jurnal', { exact: true });
					await search.fill('Mihai');
					await expect(page.getByRole('button', { name: /^Vezi detalii pentru/ })).toHaveCount(1);
					await expect(
						page.getByRole('button', {
							name: 'Vezi detalii pentru Acord fizic primit',
							exact: true
						})
					).toBeVisible();
					await search.fill('');
					await expect(page.getByRole('button', { name: /^Vezi detalii pentru/ })).toHaveCount(2);
				}

				await expectRenderedContrast(page);
				await expect(page.locator('h1').first()).not.toHaveText(/^(403|404|500)$/);
			}
			await page.goto('/admin/parental-consent/templates');
			await expect(page).toHaveURL(/\/admin\/parental-consent$/);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		});
	}
for (const theme of ['light', 'dark'] as const)
	for (const width of [390, 1280]) {
		test(`remaining platform dialogs, selected and error states ${width}px ${theme}`, async ({
			page,
			request
		}) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/profile');
			const objectiveTrigger = page.getByRole('button', { name: 'Adaugă obiectiv', exact: true });
			await objectiveTrigger.click();
			let dialog = page.getByRole('dialog');
			await dialog.getByLabel('Titlu', { exact: true }).fill('Organizez o activitate de patrulă');
			await dialog
				.getByLabel('Descriere', { exact: true })
				.fill('Stabilesc programul și responsabilitățile echipei.');
			await dialog.getByLabel('Termen limită').fill('20.03.2027');
			await request.post(`${api}/test/profile`, { data: { failSave: true } });
			await dialog.getByRole('button', { name: 'Salvează obiectiv', exact: true }).click();
			await expect(dialog.getByRole('alert')).toBeVisible();
			await expect(dialog.getByLabel('Titlu', { exact: true })).toHaveValue(
				'Organizez o activitate de patrulă'
			);
			await dialogCapture(page, `platform-objective-error-${width}-${theme}`);
			await closeDialog(page);
			await expect(objectiveTrigger).toBeFocused();
			await request.post(`${api}/test/profile`, { data: { failSave: false } });

			await page.goto('/admin/users');
			const userMenu = page.getByRole('button', {
				name: 'Acțiuni pentru Voluntar 01',
				exact: true
			});
			await userMenu.click();
			await page.getByRole('menuitem', { name: 'Schimbă rolurile', exact: true }).click();
			dialog = page.getByRole('dialog');
			await dialog.getByRole('checkbox').first().check();
			await expect(dialog.getByRole('checkbox').first()).toBeChecked();
			const close = await dialog
				.getByRole('button', { name: 'Închide dialogul', exact: true })
				.boundingBox();
			expect(close!.width).toBeGreaterThanOrEqual(44);
			expect(close!.height).toBeGreaterThanOrEqual(44);
			for (const label of await dialog.locator('.role-options label').all()) {
				const bounds = await label.boundingBox();
				expect(bounds!.height, 'Role checkbox labels remain touch targets').toBeGreaterThanOrEqual(
					44
				);
			}

			await dialogCapture(page, `platform-user-roles-${width}-${theme}`);
			await closeDialog(page);
			await expect(userMenu).toBeFocused();

			await page.goto('/admin/adult-documents');
			const dossierTrigger = page.getByRole('button', {
				name: 'Deschide dosarul: Ana Popescu',
				exact: true
			});
			await dossierTrigger.click();
			dialog = page.getByRole('dialog');
			await dialog.getByRole('button', { name: 'Respinge', exact: true }).click();
			await dialog
				.getByLabel(/Motivul respingerii/)
				.fill('PDF-ul trebuie să conțină toate paginile.');
			await dialogCapture(page, `platform-document-rejection-${width}-${theme}`);
			await closeDialog(page);
			await expect(dossierTrigger).toBeFocused();

			await page.goto('/sediu/inventar');
			const inventoryTrigger = page
				.getByRole('button', { name: 'Adaugă obiect', exact: true })
				.first();
			await inventoryTrigger.click();
			dialog = page.getByRole('dialog');
			await dialog.getByLabel('Nume', { exact: true }).fill('Cort de patrulă de verificat');
			await dialog.getByLabel('Cantitate', { exact: true }).fill('3');
			await request.post(`${api}/test/platform/configure`, { data: { inventoryFailure: true } });
			await dialog.getByRole('button', { name: 'Salvează', exact: true }).click();
			await expect(dialog).toContainText('Salvarea sintetică nu este disponibilă.');
			await expect(dialog.getByLabel('Nume', { exact: true })).toHaveValue(
				'Cort de patrulă de verificat'
			);
			await dialogCapture(page, `platform-inventory-error-${width}-${theme}`);
			await closeDialog(page);
			await expect(
				page.getByRole('button', { name: 'Adaugă obiect', exact: true }).first()
			).toBeFocused();

			await page.goto('/audit');
			const auditTrigger = page.getByRole('button', { name: /^Vezi detalii pentru/ }).first();
			await auditTrigger.click();
			await dialogCapture(page, `platform-audit-details-${width}-${theme}`);
			await closeDialog(page);
			await expect(auditTrigger).toBeFocused();

			await page.goto('/finance/documents');
			const financeTrigger = page.getByRole('button', { name: 'Adaugă document', exact: true });
			await financeTrigger.click();
			await dialogCapture(page, `platform-finance-upload-${width}-${theme}`);
			await closeDialog(page);
			await expect(financeTrigger).toBeFocused();
			const settingsTrigger = page.getByRole('button', { name: 'Keez', exact: true });
			await settingsTrigger.click();
			await expect(page.getByRole('dialog').getByLabel('Flux documente')).toBeVisible();
			await dialogCapture(page, `platform-finance-settings-${width}-${theme}`);
			await closeDialog(page);
			await expect(settingsTrigger).toBeFocused();
			const previewTrigger = page.getByRole('button', {
				name: 'Previzualizează Bon echipament camp.pdf',
				exact: true
			});
			await previewTrigger.click();
			dialog = page.getByRole('dialog', {
				name: 'Previzualizare Bon echipament camp.pdf',
				exact: true
			});
			await expect(dialog).toBeVisible();
			await expect(dialog.locator('.preview-state')).toHaveCount(0);
			const pdfCanvas = dialog.getByLabel('Previzualizare PDF pentru Bon echipament camp.pdf', {
				exact: true
			});
			await expect(pdfCanvas).toBeVisible();
			expect(
				await pdfCanvas.evaluate(
					(canvas: HTMLCanvasElement) => canvas.width > 0 && canvas.height > 0
				)
			).toBe(true);
			await dialogCapture(page, `platform-finance-pdf-preview-${width}-${theme}`);
			await closeDialog(page);
			await expect(previewTrigger).toBeFocused();

			await page.goto('/admin/orgo-sync');
			await page.getByRole('button', { name: 'Verifică în Orgo', exact: true }).first().click();
			await expect(
				page.getByRole('button', { name: 'Confirmă reverificarea și reluarea', exact: true })
			).toBeVisible();
			await captureWorkspace(page, `platform-orgo-preview-${width}-${theme}`);
			await expectRenderedContrast(page);

			await page.goto('/admin/notifications');
			await page.getByLabel('Titlu', { exact: true }).fill('Activitate sintetică');
			await page
				.getByLabel('Mesaj', { exact: true })
				.fill('Acesta este un test local fără destinatari reali.');
			await page.getByLabel('Rută internă opțională', { exact: true }).fill('/profile');
			await page.getByRole('button', { name: 'Trimite broadcast', exact: true }).click();
			await expect(
				page.getByRole('heading', { name: 'Rezultat trimitere', exact: true })
			).toBeVisible();
			await captureWorkspace(page, `platform-notification-result-${width}-${theme}`);
			await expectRenderedContrast(page);
			await request.post(`${api}/test/profile`, { data: { failNotifications: true } });
			await page.goto('/profile/notifications');
			await expect(page.getByRole('alert')).toContainText(
				'Statusul notificărilor nu este disponibil.'
			);
			await captureWorkspace(page, `platform-personal-notification-error-${width}-${theme}`);
			await expectRenderedContrast(page);
			await request.post(`${api}/test/profile`, { data: { failNotifications: false } });
			await page.getByRole('button', { name: 'Reîncearcă', exact: true }).click();
			await expect(page.getByRole('alert')).not.toBeVisible();
		});
	}

for (const theme of ['light', 'dark'] as const)
	for (const width of [390, 1280]) {
		test(`guest platform ${width}px ${theme}`, async ({ page }) => {
			await page.context().clearCookies();
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 900 });
			for (const [route, name] of [
				['/login', 'login'],
				['/register', 'registration'],
				['/offline', 'offline'],
				['/activitati', 'public-catalogue']
			] as const) {
				const response = await page.goto(route);
				expect(response?.status(), `${route}: guest surface is available`).toBeLessThan(400);
				await expect(page).toHaveURL(new RegExp(`${route}$`));
				await captureWorkspace(page, `platform-guest-${name}-${width}-${theme}`);
				await expectRenderedContrast(page);
				if (route === '/activitati') {
					await expect(
						page.getByRole('heading', { name: 'Camp de primăvară', exact: true })
					).toBeVisible();
					await expect(
						page.getByRole('heading', { name: 'Drumeție de orientare', exact: true })
					).toBeVisible();
				}
				if (route === '/register') {
					await page.getByRole('radio', { name: /^Pentru copilul meu/ }).check();
					await expect(page.getByRole('radio', { name: /^Pentru copilul meu/ })).toBeChecked();
					await captureWorkspace(page, `platform-guest-registration-selected-${width}-${theme}`);
					await expectRenderedContrast(page);
				}
			}
		});
	}
