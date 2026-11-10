import type { Page } from '@playwright/test';

export async function setMultiSelect(page: Page, label: string, choices: string[]) {
	await page.getByRole('button', { name: new RegExp(`^${label}:`) }).click();
	const popover = page.getByRole('dialog', { name: label, exact: true });
	const all = popover.getByRole('button', { name: 'Toate', exact: true });
	if (await all.isEnabled()) await all.click();
	for (const choice of choices) {
		await popover.getByRole('checkbox', { name: choice, exact: true }).check();
	}
	await page.keyboard.press('Escape');
}
