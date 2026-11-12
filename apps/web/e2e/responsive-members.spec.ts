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
	await request.post('http://127.0.0.1:3020/test/reset');
	await request.post('http://127.0.0.1:3020/test/configure', { data: { designMode: true } });
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
});
test.afterEach(({ page }) => expectNoRuntimeErrors(page));

for (const theme of ['light', 'dark'] as const)
	for (const width of [320, 390, 768, 1024, 1280]) {
		test(`member detail and actions ${width}px ${theme}`, async ({ page }) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 844 });
			await page.goto('/units');
			await captureWorkspace(page, `members-${width}-${theme}`);
			await expectThemeContrast(page);
			await expectRenderedContrast(page);
			await page
				.getByRole('button', { name: 'Acțiuni pentru Lider adult test', exact: true })
				.click();
			await page.getByRole('menuitem', { name: 'Responsabilități', exact: true }).click();
			await expect(page.getByRole('dialog')).toBeVisible();
			await page.getByRole('dialog').screenshot({
				path: `../../tmp/design-review/member-responsibilities-${width}-${theme}.png`
			});
			await page.keyboard.press('Escape');
			await page.goto('/units/22222222-2222-4222-8222-222222222222');
			await captureWorkspace(page, `member-profile-${width}-${theme}`);
			await expectRenderedContrast(page);
			for (const [route, name] of [
				['/units/orgo', 'member-orgo'],
				['/units/structures', 'member-structures']
			] as const) {
				await page.goto(route);
				await captureWorkspace(page, `${name}-${width}-${theme}`);
				await expectRenderedContrast(page);
			}
		});
	}
