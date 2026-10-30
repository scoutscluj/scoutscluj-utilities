import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { setMultiSelect } from './multi-select';

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

test('member creation is beside unit management and opens from the header on desktop and mobile', async ({
	page
}, info) => {
	await page.goto('/units');
	const header = page.locator('.workspace > header');
	const units = header.getByRole('button', { name: 'Unități și subunități', exact: true });
	const add = header.getByRole('button', { name: 'Adaugă membru', exact: true });
	await expect(add).toBeVisible();
	const unitBox = (await units.boundingBox())!;
	const addBox = (await add.boundingBox())!;
	expect(addBox.x).toBeGreaterThanOrEqual(unitBox.x + unitBox.width);
	expect(addBox.y).toBe(unitBox.y);
	await expect(
		page
			.getByRole('region', { name: 'Registrul membrilor', exact: true })
			.getByRole('button', { name: 'Adaugă membru', exact: true })
	).toHaveCount(0);
	await page.screenshot({ path: info.outputPath('add-member-header-desktop.png'), fullPage: true });
	await add.click();
	await expect(page.getByRole('dialog', { name: 'Adaugă membru', exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			page
				.getByRole('complementary', { includeHidden: true })
				.evaluate((element) => element.getBoundingClientRect().right)
		)
		.toBeLessThanOrEqual(0);
	await expect(add).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.screenshot({ path: info.outputPath('add-member-header-mobile.png'), fullPage: true });
	await add.click();
	await expect(page.getByRole('dialog', { name: 'Adaugă membru', exact: true })).toBeVisible();
});

test('an authorized manager can open member creation with an empty mocked roster', async ({
	page
}) => {
	await page
		.context()
		.addCookies([
			{
				name: 'scoutscluj_session',
				value: 'synthetic-empty-registry',
				url: 'http://127.0.0.1:5182'
			}
		]);
	await page.goto('/units');
	await expect(page.getByText('Nu există membri pentru filtrele alese.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Exportă CSV', exact: true })).toBeDisabled();
	await page
		.locator('.workspace > header')
		.getByRole('button', { name: 'Adaugă membru', exact: true })
		.click();
	const dialog = page.getByRole('dialog', { name: 'Adaugă membru', exact: true });
	await expect(dialog).toBeVisible();
	await expect(
		dialog.getByRole('combobox', { name: 'Unitate', exact: true }).locator('option')
	).toHaveText(['Alege categoria principală', 'Temerari', 'Lupișori']);
});

test('a mocked read-only account does not receive member creation controls', async ({ page }) => {
	await page
		.context()
		.addCookies([{ name: 'scoutscluj_session', value: 'read-only', url: 'http://127.0.0.1:5182' }]);
	await page.goto('/units');
	await expect(page.getByRole('link', { name: 'Ana Popescu', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Adaugă membru', exact: true })).toHaveCount(0);
	await expect(
		page.getByRole('checkbox', { name: 'Selectează pagina curentă', exact: true })
	).toHaveCount(0);
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

test('member multi-select filters combine with fee and inclusive voting-age filters', async ({
	page
}, info) => {
	await page.goto('/units');
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await expect(
		registry
			.getByRole('row')
			.filter({ hasText: 'Ana Popescu' })
			.getByRole('cell', { name: '16', exact: true })
	).toBeVisible();
	await setMultiSelect(page, 'Structură', ['Cluj', 'Florești']);
	await setMultiSelect(page, 'Categorie', ['Temerari', 'Lupișori']);
	await expect(registry.locator('tbody tr')).toHaveCount(2);
	await setMultiSelect(page, 'Drept de vot', ['Da (16 ani și peste)']);
	await setMultiSelect(page, 'Cotizație', ['Activă (achitată integral)']);
	await expect(registry.locator('tbody tr')).toHaveCount(1);
	await expect(registry.getByRole('link', { name: 'Ana Popescu', exact: true })).toBeVisible();
	await setMultiSelect(page, 'Drept de vot', ['Da (16 ani și peste)', 'Nu (sub 16 ani)']);
	await setMultiSelect(page, 'Cotizație', [
		'Activă (achitată integral)',
		'Inactivă (neachitată integral)'
	]);
	await expect(registry.locator('tbody tr')).toHaveCount(2);
	await page.screenshot({ path: info.outputPath('unit-filters-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect
		.poll(() =>
			page
				.getByRole('complementary', { includeHidden: true })
				.evaluate((element) => element.getBoundingClientRect().right)
		)
		.toBeLessThanOrEqual(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.getByRole('button', { name: /^Drept de vot:/ }).click();
	await expect(
		page.getByRole('checkbox', { name: 'Da (16 ani și peste)', exact: true })
	).toBeChecked();
	await page.screenshot({ path: info.outputPath('unit-filters-mobile.png'), fullPage: true });
	await page.keyboard.press('Escape');
});

test('member CSV includes all filtered pages and respects hidden columns', async ({ page }) => {
	await page.goto('/units');
	await setMultiSelect(page, 'Status', ['Activ', 'Inactiv']);
	const registry = page.getByRole('region', { name: 'Registrul membrilor', exact: true });
	await registry.getByLabel('Caută membru').fill('Istoric');
	await registry.getByRole('combobox', { name: 'Rânduri pe pagină' }).selectOption('10');
	await registry.getByRole('button', { name: 'Pagina următoare', exact: true }).click();
	await expect(registry.getByRole('link', { name: 'Istoric 11', exact: true })).toBeVisible();
	await registry.getByRole('button', { name: 'Membru ↑', exact: true }).click();
	await expect(registry.getByRole('link', { name: 'Istoric 52', exact: true })).toBeVisible();
	await registry.getByLabel('Alege coloanele', { exact: true }).click();
	await registry.getByRole('checkbox', { name: 'Clasa', exact: true }).uncheck();
	await registry.getByRole('checkbox', { name: 'Vârsta', exact: true }).uncheck();
	await registry.getByLabel('Alege coloanele', { exact: true }).click();
	const downloadEvent = page.waitForEvent('download');
	await registry.getByRole('button', { name: 'Exportă CSV', exact: true }).click();
	const download = await downloadEvent;
	const csv = await readFile((await download.path())!, 'utf8');
	expect(csv.split('\r\n')).toHaveLength(54);
	expect(csv).toContain('Istoric 01');
	expect(csv).toContain('Istoric 52');
	expect(csv.indexOf('Istoric 52')).toBeLessThan(csv.indexOf('Istoric 01'));
	expect(csv).not.toContain('Ana Popescu');
	expect(csv.split('\r\n')[0]).not.toContain('Vârsta');
	expect(csv.split('\r\n')[0]).not.toContain('Clasa');
	// Narrowing from a later page returns to the beginning of the results.
	await registry.getByLabel('Caută membru').fill('Istoric 01');
	await expect(registry.getByRole('link', { name: 'Istoric 01', exact: true })).toBeVisible();
});
