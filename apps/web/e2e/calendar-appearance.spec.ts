import { expect, test, type Page } from '@playwright/test';
import {
	captureWorkspace,
	expectRenderedContrast,
	seedTheme,
	watchRuntimeErrors,
	expectNoRuntimeErrors
} from './design-helpers';

async function expectCalendarTextContrast(page: Page) {
	const failures = await page.evaluate(() => {
		const rgb = (value: string) =>
			value
				.match(/[\d.]+/g)!
				.slice(0, 4)
				.map(Number);
		const background = (node: Element | null): number[] => {
			if (!node) return [255, 255, 255];
			const own = rgb(getComputedStyle(node).backgroundColor),
				alpha = own[3] ?? 1;
			const behind = alpha === 1 ? own : background(node.parentElement);
			return own.slice(0, 3).map((value, i) => value * alpha + behind[i] * (1 - alpha));
		};
		const luminance = (channels: number[]) =>
			channels
				.slice(0, 3)
				.map((value) => {
					const c = value / 255;
					return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
				})
				.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
		return [
			...document.querySelectorAll(
				'.event-card h4, .event-time, .status, .event-location, .date-badge span, .date-badge strong, .date-badge small, .day-availability, .period, .weekday, .day-number, .mobile-count, .overflow, .event-preview, .description'
			)
		].flatMap((node) => {
			const bounds = node.getBoundingClientRect();
			if (!bounds.width || !bounds.height || !node.textContent?.trim()) return [];
			const foreground = luminance(rgb(getComputedStyle(node).color)),
				behind = luminance(background(node));
			const ratio = (Math.max(foreground, behind) + 0.05) / (Math.min(foreground, behind) + 0.05);
			return ratio < 4.5 ? [{ text: node.textContent.slice(0, 70), ratio }] : [];
		});
	});
	expect(
		failures,
		'Calendar titles, dates, times, statuses and descriptions remain readable'
	).toEqual([]);
}

test.beforeEach(async ({ page, request }) => {
	watchRuntimeErrors(page);
	await request.post('http://127.0.0.1:3016/test/reset');
	await request.post('http://127.0.0.1:3016/test/settings', { data: { appearanceStates: true } });
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-calendar-session',
			url: 'http://127.0.0.1:5183'
		}
	]);
});
test.afterEach(({ page }) => expectNoRuntimeErrors(page));

for (const theme of ['light', 'dark'] as const)
	for (const width of [320, 390, 768, 1024, 1280]) {
		test(`calendar surfaces remain readable at ${width}px ${theme}`, async ({ page }) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 900 });
			for (const [route, name] of [
				['/', 'home'],
				['/info/calendar', 'events-calendar'],
				['/sediu/orar', 'headquarters-calendar']
			] as const) {
				await page.goto(route);
				await captureWorkspace(page, `neutral-${name}-${width}-${theme}`);
				if (route === '/' && width === 320) {
					for (const header of await page.locator('.widget-header').all()) {
						const title = await header.locator('.widget-title').boundingBox();
						const action = await header.locator('.calendar-link').boundingBox();
						const bounds = await header.boundingBox();
						expect(title).not.toBeNull();
						expect(action).not.toBeNull();
						expect(
							Math.abs(title!.y + title!.height / 2 - action!.y - action!.height / 2),
							'Calendar link stays beside the title'
						).toBeLessThanOrEqual(1);
						expect(action!.height).toBeGreaterThanOrEqual(44);
						expect(
							bounds!.height,
							'No orphan action row in narrow calendar headers'
						).toBeLessThanOrEqual(76);
					}
				}

				await expectRenderedContrast(page);
				await expectCalendarTextContrast(page);
				const details = page.getByRole('button', { name: /^Detalii pentru/ }).first();
				await details.click();
				await expect(details).toHaveAttribute('aria-expanded', 'true');
				await expectCalendarTextContrast(page);
				if (route !== '/info/calendar') {
					const headquarters = page.getByRole('region', { name: 'Calendar Sediu', exact: true });
					await expect(headquarters.locator('.event-card.ended')).toHaveCount(1);
					await headquarters.getByRole('button', { name: 'Lună', exact: true }).click();
					await expect(headquarters).toHaveAttribute('aria-busy', 'false');
					await expect(
						headquarters.getByRole('button', { name: 'Lună', exact: true })
					).toHaveAttribute('aria-pressed', 'true');
					await expect(headquarters.locator('.month-day.chosen')).toHaveCount(1);
					if (width === 320) {
						const dayWidth = await headquarters
							.locator('.month-day')
							.first()
							.evaluate((node) => node.getBoundingClientRect().width);
						expect(
							dayWidth,
							'Seven-column month keeps at least 40px day targets at 320px'
						).toBeGreaterThanOrEqual(40);
					}

					await expectCalendarTextContrast(page);
					await captureWorkspace(page, `neutral-${name}-month-${width}-${theme}`);
					await expectRenderedContrast(page);
					await headquarters
						.getByRole('button', { name: 'Perioada următoare', exact: true })
						.click();
					await expect(headquarters).toHaveAttribute('aria-busy', 'false');
					await headquarters.getByRole('button', { name: 'Astăzi', exact: true }).click();
					await expect(headquarters).toHaveAttribute('aria-busy', 'false');
				}
			}
		});
	}

test('system appearance follows the device while retaining readable live cards', async ({
	page
}) => {
	await seedTheme(page, 'system');
	await page.emulateMedia({ colorScheme: 'dark' });
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expectCalendarTextContrast(page);
	const dark = await page
		.locator('.event-card')
		.first()
		.evaluate((node) => getComputedStyle(node).backgroundColor);
	await page.emulateMedia({ colorScheme: 'light' });
	await expectCalendarTextContrast(page);
	await expect(page.locator('.event-card').first()).not.toHaveCSS('background-color', dark);
});
