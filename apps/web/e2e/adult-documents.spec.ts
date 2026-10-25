import { expect, test } from '@playwright/test';

const api = process.env.MEMBERSHIP_TEST_API_URL ?? 'http://127.0.0.1:3015';
const pdf = {
	name: 'certificat.pdf',
	mimeType: 'application/pdf',
	buffer: Buffer.from('%PDF-1.7\noriginal signed certificate')
};
test.beforeEach(async ({ page, request }) => {
	await request.post(`${api}/test/reset`);
	await request.post(`${api}/test/profile`, { data: { adultDocuments: true } });
	await page.context().addCookies([
		{
			name: 'scoutscluj_session',
			value: 'synthetic-session',
			url: test.info().project.use.baseURL!
		}
	]);
});

test('owner uploads, sees year history and retains original downloadable versions', async ({
	page
}) => {
	await page.goto('/profile');
	const summary = page.getByRole('region', { name: 'Documente adulți' });
	await expect(summary.getByText('Lipsește')).toHaveCount(1);
	await expect(summary.getByRole('button', { name: 'Adaugă document', exact: true })).toBeVisible();
	expect((await summary.boundingBox())!.width).toBeLessThanOrEqual(680);
	await summary.getByRole('button', { name: /Adaugă document|Deschide dosarul/ }).click();
	const dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Cazier judiciar', { exact: true })).toHaveCount(0);
	await dialog.getByText('Cum obțin certificatul (CIC)?').click();
	await expect(
		dialog.getByRole('link', { name: 'Obține certificatul de integritate' })
	).toHaveAttribute('href', 'https://hub.mai.gov.ro/serviciu/view?id=90');
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await expect(
		dialog.getByText('Document încărcat. Așteaptă verificarea unui administrator.')
	).toBeVisible();
	await expect(summary.getByText('În verificare')).toHaveCount(1);
	await expect(dialog.getByRole('button', { name: 'Validează documentul' })).toHaveCount(0);
	await dialog
		.getByLabel('Înlocuiește Certificat de integritate comportamentală', { exact: true })
		.setInputFiles({ ...pdf, name: 'certificat-nou.pdf' });
	await expect(dialog.getByText('Versiunea 2 ·')).toBeVisible();
	await dialog.getByText('Versiuni anterioare (1)').click();
	const old = dialog.getByRole('link', { name: 'Versiunea 1 · certificat.pdf' });
	await expect(old).toBeVisible();
	const response = await page.request.get((await old.getAttribute('href')) ?? '');
	expect(response.headers()['cache-control']).toBe('private, no-store');
	expect(await response.body()).toEqual(pdf.buffer);
	await dialog.getByRole('combobox', { name: 'An cercetășesc' }).selectOption('2025');
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await expect(
		dialog.getByText('Document încărcat. Așteaptă verificarea unui administrator.')
	).toBeVisible();
	await expect(
		dialog.getByLabel('Înlocuiește Certificat de integritate comportamentală', { exact: true })
	).toBeEnabled();
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await page.reload();
	await summary.getByRole('button', { name: /Adaugă document|Deschide dosarul/ }).click();
	await dialog.getByRole('combobox', { name: 'An cercetășesc' }).selectOption('2025');
	await expect(dialog.getByRole('link', { name: 'certificat.pdf ↓', exact: true })).toBeVisible();
});

test('central admin rejects CIC with feedback and validates its replacement', async ({
	page,
	request
}, testInfo) => {
	await page.goto('/profile');
	await page.getByRole('button', { name: /Adaugă document|Deschide dosarul/ }).click();
	let dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await expect(
		dialog.getByText('Document încărcat. Așteaptă verificarea unui administrator.')
	).toBeVisible();
	await expect(dialog.getByText('În verificare')).toHaveCount(1);
	await request.post(`${api}/test/profile`, { data: { documentsAdmin: true } });
	await page.goto('/admin/adult-documents');
	await expect(page.getByRole('heading', { name: 'Documente adulți' })).toBeVisible();
	await page.getByRole('button', { name: 'Deschide dosarul: Ana Popescu' }).click();
	dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	const integrity = dialog.getByRole('region', {
		name: 'Certificat de integritate comportamentală',
		exact: true
	});
	await integrity.getByRole('button', { name: 'Respinge', exact: true }).click();
	await integrity.getByLabel('Motivul respingerii').fill('Te rugăm să încarci o copie lizibilă.');
	await integrity.getByRole('button', { name: 'Confirmă respingerea' }).click();
	await expect(integrity.getByText('Respins', { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('desktop-document-review.png') });
	await integrity
		.getByLabel('Înlocuiește Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await expect(integrity.getByRole('button', { name: 'Validează documentul' })).toBeVisible();
	await integrity.getByRole('button', { name: 'Validează documentul' }).click();
	await expect(dialog.getByText('Certificat validat pentru acest an')).toBeVisible();
	await page.keyboard.press('Escape');
	await page.getByRole('combobox', { name: 'Starea documentelor' }).selectOption('pending');
	await expect(page.getByText('Niciun membru nu corespunde filtrelor selectate.')).toBeVisible();
	await page.getByRole('combobox', { name: 'Starea documentelor' }).selectOption('validated');
	await expect(page.getByRole('button', { name: 'Deschide dosarul: Ana Popescu' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Deschide dosarul: Elena Ionescu' })).toHaveCount(
		0
	);
	await page.goto('/profile');
	await expect(page.getByText('Dosar complet')).toBeVisible();
});

test('ordinary members cannot open admin workspace or cross-origin upload proxy', async ({
	page
}) => {
	await page.goto('/profile');
	await expect(page.getByRole('link', { name: 'Documente adulți', exact: true })).toHaveCount(0);
	const response = await page.goto('/admin/adult-documents');
	expect(response?.status()).toBe(403);
	const forged = await page.request.post(
		'/adult-documents/members/11111111-1111-4111-8111-111111111111',
		{
			headers: { origin: 'https://other.example.test' },
			data: {}
		}
	);
	expect(forged.status()).toBe(403);
});

test('owner can upload a 10 MiB CIC through the authenticated web proxy', async ({ page }) => {
	await page.goto('/profile');
	await page.getByRole('button', { name: /Adaugă document|Deschide dosarul/ }).click();
	const dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	const buffer = Buffer.alloc(10 * 1024 * 1024, 32);
	buffer.write('%PDF-1.7\n');
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles({ ...pdf, buffer });
	await expect(
		dialog.getByText('Document încărcat. Așteaptă verificarea unui administrator.')
	).toBeVisible();
	await expect(dialog.getByText('Versiunea 1 · 10 MB')).toBeVisible();
});

test('switching dossiers while a file is being read keeps the original upload owner', async ({
	page,
	request
}) => {
	await request.post(`${api}/test/profile`, { data: { documentsAdmin: true } });
	await page.addInitScript(() => {
		const read = FileReader.prototype.readAsDataURL;
		FileReader.prototype.readAsDataURL = function (blob: Blob) {
			setTimeout(() => read.call(this, blob), 1500);
		};
	});
	await page.goto('/admin/adult-documents');
	await page.getByRole('button', { name: 'Deschide dosarul: Ana Popescu' }).click();
	const dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Deschide dosarul: Elena Ionescu' }).click();
	await expect(dialog.getByText('Elena Ionescu', { exact: true })).toBeVisible();
	await expect(
		dialog.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
	).toBeEnabled();
	await expect(dialog.getByText('Lipsește', { exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	const row = page
		.getByRole('row')
		.filter({ has: page.getByRole('button', { name: 'Deschide dosarul: Ana Popescu' }) });
	await expect(row.getByText('În verificare', { exact: true })).toBeVisible();
});

test('mobile dialog fits, traps focus, closes with Escape and handles file errors', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/profile');
	await page.getByRole('button', { name: /Adaugă document|Deschide dosarul/ }).click();
	const dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles({
			name: 'bad.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('not a certificate')
		});
	await expect(dialog.getByRole('alert')).toContainText('Alege un fișier PDF, JPG sau PNG');
	await expect(dialog.getByRole('button', { name: 'Încearcă din nou' })).toHaveCount(0);
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await expect(dialog.getByRole('alert')).toHaveCount(0);
	await dialog.getByText('Cum obțin certificatul (CIC)?').click();
	await expect(
		dialog.getByRole('link', { name: 'Obține certificatul de integritate' })
	).toBeVisible();
	const box = await dialog.boundingBox();
	expect(box!.x).toBeGreaterThanOrEqual(16);
	expect(box!.x + box!.width).toBeLessThanOrEqual(374);
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.keyboard.press('Tab');
	expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
	await page.screenshot({ path: testInfo.outputPath('mobile-documents-dialog.png') });
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
});

test('a failed refresh after upload explains the saved state without asking for another upload', async ({
	page
}) => {
	let saved = false;
	let failRefresh = true;
	await page.route('**/adult-documents/members/**', (route) => {
		if (route.request().method() === 'POST') {
			saved = true;
			return route.continue();
		}
		if (saved && failRefresh) {
			failRefresh = false;
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '{"documents":['
			});
		}
		return route.continue();
	});
	await page.goto('/profile');
	await page.getByRole('button', { name: 'Adaugă document', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Documente adulți' });
	await dialog
		.getByLabel('Încarcă Certificat de integritate comportamentală', { exact: true })
		.setInputFiles(pdf);
	await expect(dialog.getByRole('alert')).toContainText(
		'Nu este nevoie să încarci din nou fișierul'
	);
	await expect(
		dialog.getByText('Document încărcat. Așteaptă verificarea unui administrator.')
	).toHaveCount(0);
	await expect(dialog.getByText(/Unterminated|JSON at position|Reîncarcă dosarul/)).toHaveCount(0);
	await dialog.getByRole('button', { name: 'Încearcă din nou', exact: true }).click();
	await expect(dialog.getByText('În verificare', { exact: true })).toBeVisible();
	await expect(dialog.getByRole('link', { name: 'certificat.pdf ↓', exact: true })).toBeVisible();
	await expect(dialog.getByText('Versiunea 1 ·')).toBeVisible();
});
