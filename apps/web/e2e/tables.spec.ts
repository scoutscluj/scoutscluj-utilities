import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page, request }) => {
	await request.post('http://127.0.0.1:3015/test/reset');
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-finance-session',
			url: 'http://127.0.0.1:5182'
		}
	]);
});

test('membership search leads filters and highlights matching terms without clipping controls', async ({
	page
}, info) => {
	await page.goto('/admin/finance/membership');
	const toolbar = page.locator('.sc-table-toolbar').first();
	await expect(toolbar.locator('input, select').first()).toHaveAttribute('type', 'search');
	await page.getByLabel('Caută nume sau ID').fill('ana');
	await expect(page.getByRole('cell', { name: /^Ana Popescu/ })).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				[...(CSS.highlights.get('sc-table-search') ?? [])]
					.map((range) => range.toString())
					.join(' ')
			)
		)
		.toContain('Ana');
	const footer = page.getByRole('navigation', { name: 'Paginile cotizațiilor' });
	await expect(footer.getByRole('combobox', { name: 'Rânduri pe pagină' })).toBeVisible();
	await expect(footer.getByRole('button', { name: 'Pagina anterioară' })).toBeDisabled();
	await page.screenshot({ path: info.outputPath('membership-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 820, height: 900 });
	for (const control of await toolbar.locator('input, select').all()) {
		expect(
			await control.evaluate((element) => {
				const style = getComputedStyle(element);
				return (
					element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
				);
			})
		).toBeGreaterThanOrEqual(18);
	}
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.screenshot({ path: info.outputPath('membership-mobile.png'), fullPage: true });
});

test('member column picker is icon-only and navigation uses neutral icon buttons', async ({
	page
}, info) => {
	await page.goto('/units');
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await expect(
		registry.locator('.sc-table-filters input, .sc-table-filters select').first()
	).toHaveAttribute('type', 'search');
	const columns = registry.getByLabel('Alege coloanele', { exact: true });
	await expect(columns).toHaveText('');
	await expect(columns.locator('svg')).toHaveCount(1);
	await columns.click();
	await registry.getByRole('checkbox', { name: 'Clasa', exact: true }).uncheck();
	await expect(registry.getByRole('columnheader').filter({ hasText: 'Clasa' })).toHaveCount(0);
	await columns.click();
	const next = registry.getByRole('button', { name: 'Pagina următoare' });
	await expect(next).toHaveText('');
	expect(await next.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
		'rgba(0, 0, 0, 0)'
	);
	await page.screenshot({ path: info.outputPath('member-table-desktop.png'), fullPage: true });
});
