import { expect, test } from '@playwright/test';
import {
	captureWorkspace,
	expectThemeContrast,
	expectRenderedContrast,
	seedTheme,
	watchRuntimeErrors,
	expectNoRuntimeErrors
} from './design-helpers';

test.beforeEach(async ({ page, request }) => {
	watchRuntimeErrors(page);
	await request.post('http://127.0.0.1:3019/test/reset');
	await request.post('http://127.0.0.1:3019/test/configure', { data: { designMode: true } });
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-admin', url: 'http://127.0.0.1:5186' }
		]);
});
test.afterEach(({ page }) => expectNoRuntimeErrors(page));

const surfaces = [
	['activities', '/activities'],
	['new-activity', '/activities/new'],
	['activity-overview', '/activities/1'],
	['registrations', '/activities/1/registrations'],
	['activity-settings', '/activities/1/settings'],
	['team-settings', '/activities/1/settings/team'],
	['registration-settings', '/activities/1/settings/registrations'],
	['payment-settings', '/activities/1/settings/payments'],
	['agreement-settings', '/activities/1/settings/consent'],
	['activity-departments', '/activities/1/settings/departments'],
	['activity-finance', '/activities/1/finance'],
	['participation-payments', '/activities/1/finance/participation'],
	['activity-kitchen', '/activities/1/kitchen'],
	['kitchen-ingredients', '/activities/1/kitchen/ingredients'],
	['kitchen-recipes', '/activities/1/kitchen/recipes'],
	['kitchen-meals', '/activities/1/kitchen/meals'],
	['kitchen-procurement', '/activities/1/kitchen/procurement'],
	['kitchen-reports', '/activities/1/kitchen/reports'],
	['activity-audit', '/activities/1/audit'],
	['public-activity', '/activitati/1']
] as const;

for (const theme of ['light', 'dark'] as const) {
	for (const width of [390, 1280]) {
		test(`activity surfaces ${width}px ${theme}`, async ({ page }) => {
			test.setTimeout(120000);
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 844 });
			for (const [name, route] of surfaces) {
				await page.goto(route);
				const metrics = await captureWorkspace(page, `${name}-${width}-${theme}`);
				if (name === 'registrations' && width === 390) {
					expect(metrics.firstRowY).not.toBeNull();
					expect(metrics.firstRowY!).toBeLessThanOrEqual(340);
				}
				await expectThemeContrast(page);
				await expectRenderedContrast(page);
			}
		});
	}
}

for (const width of [320, 768, 1024]) {
	test(`activity edges ${width}px`, async ({ page }) => {
		test.setTimeout(120000);
		await seedTheme(page, 'dark');
		await page.setViewportSize({ width, height: 844 });
		for (const [name, route] of surfaces) {
			await page.goto(route);
			await captureWorkspace(page, `${name}-${width}-dark`);
			await expectRenderedContrast(page);
		}
	});
}

for (const theme of ['light', 'dark'] as const) {
	test(`uploaded digital agreement visibly requests signature review in ${theme}`, async ({
		page,
		request
	}) => {
		await request.post('http://127.0.0.1:3019/test/configure', {
			data: {
				row: {
					consentState: 'uploaded',
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
		await seedTheme(page, theme);
		for (const width of [390, 1280]) {
			await page.setViewportSize({ width, height: 844 });
			await page.goto('/activities/1/registrations');
			await captureWorkspace(page, `digital-agreement-review-${width}-${theme}`);
			await expectThemeContrast(page);
			const review = page.getByRole('button', {
				name: /Acord pentru Participant de test:.*verifică PDF-ul/
			});
			await expect(review).toBeVisible();
			await expect(review.locator('svg')).toBeVisible();
			await review.click();
			const dialog = page.getByRole('dialog');
			await expect(dialog).toContainText(
				/semnătura\s+trebuie\s+să\s+fie\s+digitală,\s+nu\s+olografă/i
			);
			await dialog.screenshot({
				path: `../../tmp/design-review/digital-agreement-modal-${width}-${theme}.png`
			});
			await page.keyboard.press('Escape');
		}
	});
}

test('audit initializes its count, filters rows, and opens accessible details', async ({
	page
}) => {
	await seedTheme(page, 'dark');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/audit');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	const pagination = page.getByRole('navigation', { name: 'Paginile tabelului' });
	await expect(pagination).toContainText('1–2 din 2');
	const search = page.getByRole('searchbox', { name: 'Caută în jurnal' });
	await search.fill('no-matching-audit-entry');
	await expect(page.locator('tbody tr:visible')).toHaveCount(0);
	await expect(pagination).toContainText('0–0 din 0');
	await search.fill('');
	await expect(page.locator('tbody tr:visible')).toHaveCount(2);
	await page
		.getByRole('button', { name: /^Vezi detalii pentru/ })
		.first()
		.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page
		.getByRole('dialog')
		.screenshot({ path: '../../tmp/design-review/audit-details-390-dark.png' });
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('appearance is selectable, persistent, and follows the device in system mode', async ({
	page
}) => {
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/activities/1/registrations');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
	await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 22, 29)');
	await page.getByRole('button', { name: /^Deschide meniul profilului/ }).click();
	await page.getByRole('menuitem', { name: 'Aspectul aplicației' }).click();
	await page.getByRole('radio', { name: /^Luminoasă/ }).check();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.getByRole('dialog').getByRole('button', { name: 'Închide dialogul' }).click();
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
	await page.getByRole('button', { name: /^Deschide meniul profilului/ }).click();
	await page.getByRole('menuitem', { name: 'Aspectul aplicației' }).click();
	await page.getByRole('radio', { name: /^Sistem/ }).check();
	await page.getByRole('dialog').getByRole('button', { name: 'Închide dialogul' }).click();
	await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 22, 29)');
	await page.emulateMedia({ colorScheme: 'light' });
	await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 248, 250)');
});

test('mobile Orgo status and appearance stay accessible without displacing the list', async ({
	page
}) => {
	await seedTheme(page, 'dark');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/activities/1/registrations');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await page.getByRole('button', { name: /^Actualizări Orgo/ }).click();
	await expect(page.getByRole('dialog', { name: 'Actualizări Orgo' })).toBeVisible();
	await page
		.getByRole('dialog')
		.screenshot({ path: '../../tmp/design-review/orgo-status-390-dark.png' });
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: /^Deschide meniul profilului/ }).click();
	await page.getByRole('menuitem', { name: 'Aspectul aplicației' }).click();
	await page
		.getByRole('dialog')
		.screenshot({ path: '../../tmp/design-review/appearance-390-dark.png' });
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Deschide meniul', exact: true }).click();
	await expect(
		page
			.getByRole('complementary', { name: 'Meniu principal' })
			.getByRole('button', { name: 'Închide meniul', exact: true })
	).toBeFocused();
	await expect
		.poll(async () =>
			Math.round(
				(await page.getByRole('complementary', { name: 'Meniu principal' }).boundingBox())!.x
			)
		)
		.toBe(0);
	await page.screenshot({ path: '../../tmp/design-review/navigation-390-dark.png' });
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Deschide meniul', exact: true })).toBeFocused();
});
