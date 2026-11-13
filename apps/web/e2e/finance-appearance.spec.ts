import { expect, test, type Page } from '@playwright/test';
import {
	captureWorkspace,
	expectNoRuntimeErrors,
	expectRenderedContrast,
	expectThemeContrast,
	seedTheme,
	watchRuntimeErrors
} from './design-helpers';

const api = 'http://127.0.0.1:3015';
const routes = [
	['/admin/finance', 'finance-admin'],
	['/admin/finance/membership', 'finance-membership'],
	['/admin/finance/receipts', 'finance-receipts'],
	['/admin/finance/payments', 'finance-payments'],
	['/admin/finance/transfers', 'finance-transfers'],
	['/admin/finance/membership-settings', 'finance-membership-settings'],
	['/admin/finance/payment-processor', 'finance-payment-processor'],
	['/admin/finance/guide', 'finance-guide']
] as const;

test.beforeEach(async ({ page, request }) => {
	watchRuntimeErrors(page);
	await request.post(`${api}/test/reset`);
	await request.post(`${api}/test/admin-appearance`, { data: {} });
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-finance-session',
			url: 'http://127.0.0.1:5182'
		}
	]);
});
test.afterEach(({ page }) => expectNoRuntimeErrors(page));

async function captureDialog(page: Page, name: string) {
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	expect(
		await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
	).toBeLessThanOrEqual(1);
	await expectRenderedContrast(page);
	await dialog.screenshot({ path: `../../tmp/design-review/${name}.png` });
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
	for (const width of [320, 390, 768, 1024, 1280]) {
		test(`financial administration ${width}px ${theme}`, async ({ page, request }) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 844 });
			for (const [route, name] of routes) {
				await page.goto(route);
				await captureWorkspace(page, `${name}-${width}-${theme}`);
				await expectThemeContrast(page);
				await expectRenderedContrast(page);
				if (route === '/admin/finance/membership' || route === '/admin/finance/transfers') {
					const compact = await page.locator('.mobile-members').isVisible();
					const contentWidth = await page
						.locator('.membership-admin')
						.evaluate((element) => element.getBoundingClientRect().width);
					expect(
						compact,
						'Registry responds to available content width, including the sidebar'
					).toBe(contentWidth <= 900);
					const first = compact
						? page.locator('.mobile-member').first()
						: page.locator('.member-ledger tbody tr').first();
					await expect(first).toBeVisible();
					const box = await first.boundingBox();
					expect(
						box!.y,
						`${name}: first member must be reachable in the initial viewport`
					).toBeLessThan(760);
					if (compact)
						expect(box!.height, 'Closed member rows must stay compact').toBeLessThan(125);
				}
				if (route === '/admin/finance/payments') {
					const firstPayment = page.locator('.payment-card').first();
					await expect(firstPayment).toBeVisible();
					expect(
						(await firstPayment.boundingBox())!.y,
						'First payment must not be buried below summary and instructions'
					).toBeLessThan(760);
					await expect(firstPayment.locator('.payment-metadata')).not.toHaveAttribute('open', '');
					await expect(firstPayment.locator('.cancel-payment summary')).toBeVisible();
					const overlapping = await page.locator('.payment-card > dl').evaluateAll((summaries) =>
						summaries.flatMap((summary) => {
							const cells = [...summary.children];
							const badge = cells[0]?.querySelector('.finance-status');
							const provider = cells[1];
							if (!badge || !provider) return [];
							const a = badge.getBoundingClientRect(),
								b = provider.getBoundingClientRect();
							return a.left < b.right - 1 &&
								a.right > b.left + 1 &&
								a.top < b.bottom - 1 &&
								a.bottom > b.top + 1
								? [badge.textContent]
								: [];
						})
					);
					expect(overlapping, 'Payment status badges must not overlap the provider column').toEqual(
						[]
					);
				}
				if (route === '/admin/finance/membership-settings') {
					if (width === 1024)
						await page.screenshot({
							path: `../../tmp/design-review/finance-membership-settings-${width}-${theme}-full.png`,
							fullPage: true
						});

					const clipped = await page.locator('.price-plan strong').evaluateAll((values) =>
						values
							.filter((value) => {
								const range = document.createRange();
								range.selectNodeContents(value);
								const text = range.getBoundingClientRect();
								const card = value.closest('.price-plan')!.getBoundingClientRect();
								return (
									range.getClientRects().length !== 1 ||
									text.right > card.right - 4 ||
									text.left < card.left
								);
							})
							.map((value) => value.textContent)
					);
					expect(clipped, 'Published tariff values must remain complete on one line').toEqual([]);
				}
			}

			await page.goto('/admin/finance/membership');
			await expect(page.locator('.member-ledger .member-name strong').first()).toHaveText(
				'Ana Popescu'
			);
			await page.getByRole('button', { name: 'Adaugă plată pentru Andrei Ionescu' }).click();
			await captureDialog(page, `finance-receipt-modal-${width}-${theme}`);
			if (await page.locator('.mobile-members').isVisible())
				await page
					.locator('.mobile-member')
					.filter({ hasText: 'Ana Popescu' })
					.getByRole('button', { expanded: false })
					.first()
					.click();
			await page
				.getByRole('button', { name: 'Schimbă tipul cotizației pentru Ana Popescu' })
				.click();
			await captureDialog(page, `finance-plan-modal-${width}-${theme}`);
			await request.post(`${api}/test/review/plan`);
			await page.reload();
			await page.getByRole('button', { name: 'Rezolvă verificarea pentru Ana Popescu' }).click();
			await expect(page.getByRole('dialog')).toContainText('După confirmare: Plătit');
			await captureDialog(page, `finance-review-modal-${width}-${theme}`);

			for (const syncState of ['running', 'failed'] as const) {
				await request.post(`${api}/test/admin-appearance`, { data: { syncState } });
				await page.goto('/admin/finance/membership-settings');
				await captureWorkspace(page, `finance-sync-${syncState}-${width}-${theme}`);
				await expectRenderedContrast(page);
			}
		});
	}
}
