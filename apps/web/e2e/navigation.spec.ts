import { expect, test } from '@playwright/test';
import { expectRenderedContrast } from './design-helpers';

test('contrast checks ignore transparent PDF selection text and still reject unreadable UI text', async ({
	page
}) => {
	await page.setContent(
		'<main style="background:white;color:black"><h1>Document</h1><div class="textLayer"><span style="color:transparent">Selectable PDF text painted by canvas</span></div></main>'
	);
	await expectRenderedContrast(page);
	await page.setContent(
		'<main style="background:white"><p style="color:#ddd">Unreadable interface label</p></main>'
	);
	await expect(expectRenderedContrast(page)).rejects.toThrow(
		'Rendered navigation and control contrast'
	);
});

test('an open tab recovers when an old deployment chunk is missing', async ({
	browser,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	// Isolate the HTTP/browser-cache recovery path from the service worker cache.
	const context = await browser.newContext({ serviceWorkers: 'block' });
	await context.addCookies([
		{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
	]);
	const page = await context.newPage();
	try {
		await page.goto('http://127.0.0.1:5187/units');
		await expect(
			page.getByRole('heading', { name: 'Membri și unități', exact: true })
		).toBeVisible();
		let failedChunk = false;
		let removedChunk = '';
		let recovering = false;
		page.on('request', (req) => {
			if (req.isNavigationRequest() && new URL(req.url()).pathname === '/admin/adult-documents')
				recovering = true;
		});
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			if (!removedChunk) removedChunk = route.request().url();
			if (!recovering && route.request().url() === removedChunk) {
				failedChunk = true;
				await route.fulfill({ status: 404, body: 'Removed deployment chunk' });
			} else await route.continue();
		});
		await page.route('**/_app/version.json', (route) =>
			route.fulfill({ json: { version: 'new-deployment' } })
		);
		await page.getByRole('button', { name: 'Admin', exact: true }).click();
		const recovery = page.waitForRequest(
			(req) => req.isNavigationRequest() && new URL(req.url()).pathname === '/admin/adult-documents'
		);
		await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
		await recovery;
		await expect(
			page.getByRole('heading', { name: 'Documente adulți', exact: true })
		).toBeVisible();
		expect(failedChunk).toBe(true);
	} finally {
		await context.close();
	}
});

test('a stalled navigation offers a working full-page retry', async ({ page, request }) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	await page.goto('/units');
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	await page.route('**/admin/adult-documents/__data.json*', async () => {});
	await page.clock.install();
	await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
	await expect(page.getByRole('status', { name: 'Încărcarea paginii' })).toBeVisible();
	await page.clock.fastForward(8100);
	await expect(page.getByText('Încărcarea durează mai mult decât de obicei.')).toBeVisible();
	await page.getByRole('button', { name: 'Reîncearcă deschiderea' }).click();
	await expect(page.getByRole('heading', { name: 'Documente adulți', exact: true })).toBeVisible();
});

test('roster refresh does not cancel and restart a slow fee verification', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await request.post('http://127.0.0.1:3020/test/configure', { data: { fees: true } });
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	let feeRequests = 0;
	await page.route('**/units/fees', async () => {
		feeRequests++;
	});
	const refreshed = page.waitForResponse((response) =>
		response.url().includes('/units/__data.json')
	);
	await page.goto('/units');
	await refreshed;
	await expect(page.getByRole('heading', { name: 'Membri și unități', exact: true })).toBeVisible();
	// Flush rendering of the freshly loaded registry before checking the pending batch.
	await page.getByPlaceholder('Caută după nume…').fill('beneficiar');
	expect(feeRequests).toBe(1);
});

test('slow background refreshes do not pile up or reload every layout', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await request.post('http://127.0.0.1:3020/test/configure', { data: { pendingSync: true } });
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	const reloads: string[] = [];
	await page.route('**/units/__data.json*', async (route) => {
		reloads.push(route.request().url());
	});
	await page.goto('/units');
	await expect.poll(() => reloads.length).toBe(1);
	await page.clock.install();
	await page.clock.fastForward(6000);
	await page.clock.fastForward(6000);
	await page.clock.fastForward(6000);
	expect(reloads).toHaveLength(1);
	expect(reloads[0]).not.toContain('invalidated=111');
});

test('slow navigation immediately shows loading feedback and clears it on arrival', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	await page.goto('/units');
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	let release!: () => void;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route('**/admin/adult-documents/__data.json*', async (route) => {
		await held;
		await route.continue();
	});
	await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
	const status = page.getByRole('status', { name: 'Încărcarea paginii' });
	await expect(status).toBeVisible();
	await expect(status).toContainText('Se încarcă pagina…');
	await page.screenshot({ path: test.info().outputPath('navigation-loading.png') });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
	await expect(status).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: test.info().outputPath('navigation-loading-mobile-dark.png') });
	release();
	await expect(page.getByRole('heading', { name: 'Documente adulți', exact: true })).toBeVisible();
	await expect(status).toBeHidden();
});

test('an expired session in an open tab returns to login on navigation', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	await page.goto('/units');
	await expect(page.getByRole('heading', { name: 'Membri și unități', exact: true })).toBeVisible();
	await request.post('http://127.0.0.1:3020/test/configure', { data: { sessionExpired: true } });
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Fadmin%2Fadult-documents/);
});

test('can navigate from the member register after filtering and editing', async ({
	page,
	request
}) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/units');
	await expect(page.getByRole('heading', { name: 'Membri și unități', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Acțiuni pentru Beneficiar test', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Schimbă clasa', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Schimbă clasa · Beneficiar test' });
	await dialog.getByRole('spinbutton', { name: 'Clasa', exact: true }).fill('7');
	await dialog.getByRole('button', { name: 'Salvează modificarea' }).click();
	await expect(dialog).toBeHidden();
	await page.getByPlaceholder('Caută după nume…').fill('beneficiar');
	await expect(page.getByRole('link', { name: 'Lider adult test', exact: true })).toBeHidden();
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Documente adulți', exact: true })).toBeVisible();
	expect(errors).toEqual([]);
});

for (const width of [390, 1280]) {
	test(`repeated search and navigation at ${width}px`, async ({ page, request }) => {
		await request.post('http://127.0.0.1:3020/test/reset');
		await page.context().addCookies([
			{
				name: 'scoutscluj_session',
				value: 'synthetic-member-admin',
				url: 'http://127.0.0.1:5187'
			}
		]);
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/units');
		for (let attempt = 0; attempt < 5; attempt++) {
			await page.getByPlaceholder('Caută după nume…').fill('beneficiar');
			await expect(page.getByRole('link', { name: 'Lider adult test', exact: true })).toBeHidden();
			if (width < 900)
				await page.getByRole('button', { name: 'Deschide meniul', exact: true }).click();
			const admin = page.getByRole('button', { name: 'Admin', exact: true });
			if ((await admin.getAttribute('aria-expanded')) !== 'true') await admin.click();
			await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
			await expect(
				page.getByRole('heading', { name: 'Documente adulți', exact: true })
			).toBeVisible();
			if (width < 900)
				await page.getByRole('button', { name: 'Deschide meniul', exact: true }).click();
			await page.getByRole('link', { name: 'Membri și unități', exact: true }).click();
			await expect(
				page.getByRole('heading', { name: 'Membri și unități', exact: true })
			).toBeVisible();
		}
	});
}

test('can leave the register while its background reload is stalled', async ({ page, request }) => {
	await request.post('http://127.0.0.1:3020/test/reset');
	await page
		.context()
		.addCookies([
			{ name: 'scoutscluj_session', value: 'synthetic-member-admin', url: 'http://127.0.0.1:5187' }
		]);
	let intercepted!: () => void;
	const reloading = new Promise<void>((resolve) => (intercepted = resolve));
	await page.route('**/units/__data.json*', async () => {
		intercepted();
	});
	await page.goto('/units');
	await reloading;
	await page.getByRole('button', { name: 'Admin', exact: true }).click();
	await page.getByRole('link', { name: 'Documente adulți', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Documente adulți', exact: true })).toBeVisible();
});
