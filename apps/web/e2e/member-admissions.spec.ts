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
	await page.getByLabel('Completez pentru copilul meu', { exact: false }).check();
	await page.getByLabel('Prenume', { exact: true }).fill('Ana');
	await page.getByLabel('Nume de familie', { exact: true }).fill('Test');
	await page.getByPlaceholder('zz.ll.aaaa').fill('15.06.2020');
	await page.getByLabel('Situație școlară').selectOption('grade');
  await page.getByRole('combobox',{name:'Clasă',exact:true}).selectOption('0');
	await page.getByLabel('Unitatea în care').selectOption('11111111-1111-4111-8111-111111111111');
	await page.getByLabel('Nume complet', { exact: true }).fill('Părinte de test');
	await page.getByLabel('Relația cu copilul').selectOption('Părinte');
	await page.getByLabel('Email părinte / tutore').fill('parent@example.test');
	await page.getByLabel('Telefon părinte / tutore').fill('0700000000');
	await page.getByLabel('Sunt de acord ca datele').check();
	await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
	await expect(page.getByRole('heading', { name: 'Cererea a fost înregistrată' })).toBeVisible();
	const state = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(state.rows).toHaveLength(1);
	expect(state.rows[0].data.grade).toBe('0');
	expect(state.rows[0].data.email).toBe('');
	expect(state.rows[0].data.guardianEmail).toBe('parent@example.test');
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
	await page.getByRole('button', { name: 'Confirmă înscrierea', exact: true }).click();
	await page.getByRole('combobox', { name:'Stare', exact: true }).selectOption('approved');
	await expect(page.getByText('Aprobată', { exact: true })).toBeVisible();
	await page.getByText('Ana Test', { exact: true }).click();
	await expect(page.getByText('Înscriere aprobată. Se pregătește contul Orgo.')).toBeVisible();
	const first = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(first.starts).toBeGreaterThanOrEqual(1);
	await page.getByRole('button', { name:'Admin', exact:true }).click();
	await page.getByRole('link', { name: 'Sincronizare Orgo', exact: true }).click();
	const afterNavigation = await (await request.get('http://127.0.0.1:3027/test/state')).json();
	expect(afterNavigation.starts).toBe(first.starts);
	await page.reload();
	await expect
		.poll(async () => (await (await request.get('http://127.0.0.1:3027/test/state')).json()).starts)
		.toBe(first.starts + 1);
	await page.screenshot({ path: 'test-results/orgo-outbox-desktop.png', fullPage: true });
});
