import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => {
	await request.post('http://127.0.0.1:3027/test/reset');
});
test('public registration retains guardian contacts and an explicit preparatory grade', async ({
	page,
	request
}) => {
	await page.goto('/login');
	await page.getByRole('link', { name: 'Înscrie-te în centrul local' }).click();
	await expect(
		page.getByRole('heading', { name: 'Înscriere în centrul local', exact: true })
	).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Prenumele', exact: true })).not.toBeVisible();
	await page
		.getByRole('radio', { name: 'Pentru copilul meu / altă persoană', exact: false })
		.check();
	await page.getByLabel('Prenumele copilului / persoanei', { exact: true }).fill('Ana');
	await page.getByLabel('Numele de familie al copilului / persoanei', { exact: true }).fill('Test');
	await page.getByPlaceholder('zz.ll.aaaa').fill('15.06.2020');
	await page
		.getByRole('combobox', { name: 'Genul copilului / persoanei', exact: true })
		.selectOption('F');
	await page
		.getByLabel('Emailul copilului / persoanei', { exact: true })
		.fill('parent@example.test');
	await page.getByLabel('Situație școlară').selectOption('grade');
	await page.getByRole('combobox', { name: 'Clasă', exact: true }).selectOption('0');
	await page.getByRole('combobox', { name: 'Structură', exact: true }).selectOption('cluj');
	await page.getByLabel('Ramura de vârstă').selectOption('11111111-1111-4111-8111-111111111111');
	await page.getByLabel('Nume complet părinte / tutore', { exact: true }).fill('Părinte de test');
	await page.getByLabel('Relația cu copilul').selectOption('Părinte');
	await page.getByLabel('Email părinte / tutore').fill('parent@example.test');
	await page.getByLabel('Telefon părinte / tutore').fill('0700000000');
	await page.getByLabel('Sunt de acord ca datele').check();
	await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
	await expect(page.getByRole('heading', { name: 'Cererea a fost înregistrată' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Pașii următori' })).toBeVisible();
	await expect(page.getByText('Intră direct în Resurse.', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Nu este nevoie să configurezi profilul', { exact: false })
	).toBeVisible();
	await page.screenshot({ path: 'test-results/admission-next-steps-parent.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: 'test-results/admission-next-steps-parent-mobile.png',
		fullPage: true
	});
	const state = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(state.rows).toHaveLength(1);
	expect(state.rows[0].data.grade).toBe('0');
	expect(state.rows[0].data.email).toBe('parent@example.test');
	expect(state.rows[0].data.gender).toBe('F');
	expect(state.rows[0].data.guardianEmail).toBe('parent@example.test');
	expect(state.rows[0].data.structureId).toBe('cluj');
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/register');
	await expect(
		page.getByRole('heading', { name: 'Înscriere în centrul local', exact: true })
	).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: 'test-results/admission-mobile.png', fullPage: true });
});

test('structure filters branch options and preserves the selection after an email error', async ({
	page,
	request
}) => {
	await page.goto('/register');
	await page.getByRole('radio', { name: 'Pentru mine', exact: false }).check();
	await page.getByRole('combobox', { name: 'Genul', exact: true }).selectOption('F');
	await expect(page.locator('#member-email-hint')).toHaveCount(0);
	const structure = page.getByRole('combobox', { name: 'Structură', exact: true });
	const branch = page.getByLabel('Ramura de vârstă');
	await expect(branch).toBeDisabled();
	await structure.selectOption('cluj');
	await branch.selectOption('11111111-1111-4111-8111-111111111111');
	await structure.selectOption('floresti');
	await expect(branch).toHaveValue('');
	await expect(branch.locator('option')).toHaveText(['Am nevoie de îndrumare', 'Temerari']);
	await branch.selectOption('33333333-3333-4333-8333-333333333333');
	await page.getByLabel('Prenumele', { exact: true }).fill('Ana');
	await page.getByLabel('Numele de familie', { exact: true }).fill('Test');
	await page.getByPlaceholder('zz.ll.aaaa').fill('15.06.1998');
	await page.getByLabel('Situație școlară').selectOption('not-in-school');
	await page.getByRole('textbox', { name: 'Email', exact: true }).fill('used@example.test');
	await page.getByLabel('Sunt de acord ca datele').check();
	await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
	await expect(page.getByText('Acest email este deja folosit', { exact: false })).toBeVisible();
	await expect(structure).toHaveValue('floresti');
	await expect(branch).toHaveValue('33333333-3333-4333-8333-333333333333');
	expect((await (await request.get('http://127.0.0.1:3027/test/state')).json()).rows).toHaveLength(
		0
	);
	await page.getByRole('textbox', { name: 'Email', exact: true }).fill('new@example.test');
	await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
	await expect(
		page.getByText('Ai făcut primul pas spre cercetășie.', { exact: false })
	).toBeVisible();
	await expect(
		page.getByText('Urmărește emailul despre crearea contului.', { exact: true })
	).toBeVisible();
	await expect(
		page.getByText('platforma națională care centralizează cercetașii din România', {
			exact: false
		})
	).toBeVisible();
	await page.screenshot({ path: 'test-results/admission-next-steps-member.png', fullPage: true });
});
test('admin approval and app bootstrap remain distinct from remote completion', async ({
	page,
	context,
	request
}) => {
	await request.post('http://127.0.0.1:3027/api/member-applications', {
		data: {
			requestKey: 'test',
			firstName: 'Ana',
			lastName: 'Test',
			birthDate: '2014-01-01',
			schooling: 'grade',
			grade: 6,
			unitId: '11111111-1111-4111-8111-111111111111',
			guardianName: 'Părinte',
			guardianEmail: 'parent@example.test',
			guardianPhone: '0700000000'
		}
	});
	await context.addCookies([
		{ name: 'scoutscluj_session', value: 'synthetic', url: 'http://127.0.0.1:5197' }
	]);
	await page.goto('/applications');
	await page.getByText('Ana Test', { exact: true }).click();
	await expect(page.getByRole('region', { name: 'Date membru', exact: true })).toContainText(
		'01.01.2014'
	);
	await expect(page.getByRole('region', { name: 'Date membru', exact: true })).toContainText(
		'Clasa a VI-a'
	);
	await expect(page.locator('input[name="existingOrgoId"]')).not.toBeVisible();
	await page.screenshot({ path: 'test-results/application-review-desktop.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: 'test-results/application-review-mobile.png', fullPage: true });
	await page.getByText('Solicită completări sau respinge', { exact: true }).click();
	await expect(
		page.getByRole('textbox', { name: 'Motiv pentru respingere sau completări' })
	).toBeVisible();
	await page.getByText('Solicită completări sau respinge', { exact: true }).click();
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.getByRole('button', { name: 'Confirmă înscrierea', exact: true }).click();
	await page.getByRole('combobox', { name: 'Stare', exact: true }).selectOption('approved');
	await expect(page.getByText('Aprobată', { exact: true })).toBeVisible();
	await page.getByText('Ana Test', { exact: true }).click();
	await expect(page.getByText('Înscriere aprobată. Se pregătește contul Orgo.')).toBeVisible();
	const first = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(first.starts).toBeGreaterThanOrEqual(1);
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	await page.getByRole('link', { name: 'Sincronizare Orgo', exact: true }).click();
	const afterNavigation = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(afterNavigation.starts).toBe(first.starts);
	await page.reload();
	await expect
		.poll(async () => (await (await request.get('http://127.0.0.1:3027/test/state')).json()).starts)
		.toBe(first.starts + 1);
	await page.screenshot({ path: 'test-results/orgo-outbox-desktop.png', fullPage: true });
});

test('other adult retains submitter contact and photograph through a duplicate-email correction', async ({
	page,
	request,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/register');
	await page.getByRole('button', { name: 'Copiază instrucțiunile' }).click();
	await expect(page.getByRole('status')).toContainText('Instrucțiuni copiate.');
	const guide = await page.evaluate(() => navigator.clipboard.readText());
	expect(guide).toContain('http://127.0.0.1:5197/register');
	expect(guide).toContain('Nu este nevoie să configurezi profilul');
	await page
		.getByRole('radio', { name: 'Pentru copilul meu / altă persoană', exact: false })
		.check();
	await page.getByLabel('Prenumele copilului / persoanei', { exact: true }).fill('Adult');
	await page.getByLabel('Numele de familie al copilului / persoanei', { exact: true }).fill('Test');
	await page.getByPlaceholder('zz.ll.aaaa').fill('15.06.1990');
	await page
		.getByRole('combobox', { name: 'Genul copilului / persoanei', exact: true })
		.selectOption('M');
	await page.getByLabel('Situație școlară').selectOption('not-in-school');
	await page.getByRole('combobox', { name: 'Structură', exact: true }).selectOption('cluj');
	await page.getByLabel('Emailul copilului / persoanei', { exact: true }).fill('used@example.test');
	await expect(page.getByLabel('Email părinte / tutore')).not.toBeVisible();
	await page.getByLabel('Numele tău complet').fill('Prieten Test');
	await page.getByLabel('Emailul tău de contact').fill('friend@example.test');
	const photo = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8V8AAAAASUVORK5CYII=',
		'base64'
	);
	await page
		.getByLabel('Fotografia copilului / persoanei', { exact: false })
		.setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: photo });
	await expect(page.getByAltText('Previzualizare fotografie de profil')).toBeVisible();
	await page.getByLabel('Sunt de acord ca datele').check();
	await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
	await expect(page.getByText('Acest email este deja folosit', { exact: false })).toBeVisible();
	await expect(page.getByAltText('Previzualizare fotografie de profil')).toBeVisible();
	await page.screenshot({ path: 'test-results/registration-other-desktop.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: 'test-results/registration-other-mobile.png', fullPage: true });
	await page
		.getByLabel('Emailul copilului / persoanei', { exact: true })
		.fill('adult@example.test');
	await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
	await expect(page.getByRole('heading', { name: 'Cererea a fost înregistrată' })).toBeVisible();
	await expect(
		page.getByText('Ai trimis cererea pentru persoana înscrisă.', { exact: false })
	).toBeVisible();
	await page.getByRole('button', { name: 'Copiază instrucțiunile' }).click();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(guide);
	const state = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(state.rows[0].data).toMatchObject({
		submitterName: 'Prieten Test',
		submitterEmail: 'friend@example.test',
		gender: 'M'
	});
	expect(state.rows[0].data.photo).toContain('data:image/png;base64,');
});
