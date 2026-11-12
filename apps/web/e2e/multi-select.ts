import { expect, type Page } from '@playwright/test';

export async function setMultiSelect(page: Page, label: string, choices: string[]) {
	const trigger = page.getByRole('button', { name: new RegExp(`^${label}:`) });
	if (!(await trigger.isVisible())) {
		const disclosure = page.getByRole('button', { name: /^Filtre(?:\s|\(|$)/ });
		await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
		await disclosure.click();
	}
	await expect(trigger).toBeVisible();
	await trigger.click();
	const popover = page.getByRole('dialog', { name: label, exact: true });
	const all = popover.getByRole('button', { name: 'Toate', exact: true });
	if (await all.isEnabled()) await all.click();
	for (const choice of choices) {
		await popover.getByRole('checkbox', { name: choice, exact: true }).check();
	}
	await page.keyboard.press('Escape');
}
