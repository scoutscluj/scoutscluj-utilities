import { expect, test, type Page } from '@playwright/test';

const sessionToken = process.env.PLAYWRIGHT_ADMIN_SESSION_COOKIE;
const ordinarySessionToken = process.env.PLAYWRIGHT_ORDINARY_SESSION_COOKIE;
const activityId = process.env.PLAYWRIGHT_ACTIVITY_ID;
const templateId = process.env.PLAYWRIGHT_TEMPLATE_DRAFT_ID;
const mutationEnabled = process.env.PLAYWRIGHT_MUTATION_E2E === 'true';

const installSession = async (page: Page, token: string) => {
	const baseURL = test.info().project.use.baseURL as string;
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: token,
			url: baseURL,
			httpOnly: true,
			sameSite: 'Lax'
		}
	]);
};

test('template preview through publication and ordinary-user download', async ({
	browser,
	page
}) => {
	test.skip(
		!sessionToken || !ordinarySessionToken || !activityId || !templateId || !mutationEnabled,
		'Set the parental-consent Playwright variables and use a disposable activity/template to run the mutation E2E.'
	);

	await installSession(page, sessionToken!);
	await page.goto(`/admin/parental-consent/templates/${templateId}`);
	await expect(page.getByRole('heading', { name: /Template v/ })).toBeVisible();

	const uniqueFieldCode = `e2e_${Date.now()}`;
	await page.getByLabel('Cod').fill(uniqueFieldCode);
	await page.getByLabel('Etichetă').fill('Confirmare E2E');
	await page.getByRole('button', { name: 'Inserează câmpul' }).click();
	await page.getByRole('button', { name: 'Salvează draftul' }).click();
	await expect(page.getByText('Operațiunea a reușit.')).toBeVisible();

	const templatePreviewHref = await page
		.getByRole('link', { name: 'Preview lupisori' })
		.getAttribute('href');
	const templatePreview = await page.request.get(templatePreviewHref!);
	expect(templatePreview.ok()).toBeTruthy();
	expect(templatePreview.headers()['content-type']).toContain('application/pdf');

	await page.goto(`/activities/${activityId}/parental-consent`);
	await expect(page.getByRole('heading', { name: 'Acord parental' })).toBeVisible();
	const branchPreview = page.getByRole('button', { name: /^Previzualizează / }).first();
	await expect(branchPreview).toBeEnabled();
	await branchPreview.click();
	const branchPreviewFrame = page.getByTitle(/^Preview acord parental /);
	await expect(branchPreviewFrame).toBeVisible();
	expect(await branchPreviewFrame.getAttribute('src')).toMatch(/^blob:/);

	const publishButton = page.getByRole('button', { name: /^(Publică|Republică)$/ });
	await expect(publishButton).toBeEnabled();
	page.once('dialog', (dialog) => dialog.accept());
	await publishButton.click();
	await expect(page.getByText('Publicarea a reușit.')).toBeVisible();

	const ordinaryContext = await browser.newContext();
	const ordinaryPage = await ordinaryContext.newPage();
	await installSession(ordinaryPage, ordinarySessionToken!);
	await ordinaryPage.goto(`/activities/${activityId}/parental-consent`);
	const downloadHref = await ordinaryPage
		.getByRole('link', { name: /Descarcă PDF/ })
		.first()
		.getAttribute('href');
	const download = await ordinaryPage.request.get(downloadHref!);
	expect(download.ok()).toBeTruthy();
	expect(download.headers()['content-type']).toContain('application/pdf');
	expect(download.headers()['x-checksum-sha256']).toMatch(/^[a-f0-9]{64}$/);
	await ordinaryContext.close();
});
