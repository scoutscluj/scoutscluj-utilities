import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import {
	captureWorkspace,
	expectRenderedContrast,
	expectNoRuntimeErrors,
	watchRuntimeErrors,
	seedTheme
} from './design-helpers';

const api = 'http://127.0.0.1:3015';
const origin = 'http://127.0.0.1:5182';
const periodId = '11111111-1111-4111-8111-111111111111';
const obligation = {
	id: '33333333-3333-4333-8333-333333333333',
	periodId,
	orgoUserId: 36801,
	memberName: 'Ana Popescu',
	plan: 'normal',
	totalBani: 30500,
	nationalBani: 15000,
	admissionAmountBani: 5500,
	admissionEligible: true
};

async function configure(
	page: Page,
	request: APIRequestContext,
	options: Record<string, unknown> = {},
	authenticated = true
) {
	await request.post(`${api}/test/reset`);
	await request.post(`${api}/test/profile`, {
		data: {
			user: { displayName: 'Ana Popescu', firstName: 'Ana' },
			...options,
			selfServiceCatalog: {
				environment: 'live',
				...(typeof options.selfServiceCatalog === 'object' && options.selfServiceCatalog
					? options.selfServiceCatalog
					: {})
			}
		}
	});
	await page.context().clearCookies();
	if (authenticated)
		await page
			.context()
			.addCookies([{ name: 'scoutscluj_session', value: 'synthetic-self-service', url: origin }]);
}

async function capture(page: Page, name: string) {
	await page.evaluate(() => window.scrollTo(0, 0));
	await captureWorkspace(page, name);
	await expectRenderedContrast(page);
	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toBeVisible();
	const bounds = (await heading.boundingBox())!;
	const topbar = page.locator('header.topbar, header.public-topbar').first();
	if (await topbar.count()) {
		const bar = (await topbar.boundingBox())!;
		expect(bounds.y, `${name}: initial heading clears the header`).toBeGreaterThanOrEqual(
			bar.y + bar.height - 1
		);
	}
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test.beforeEach(({ page }) => watchRuntimeErrors(page));
test.afterEach(({ page }) => expectNoRuntimeErrors(page));

for (const width of [320, 390, 768, 1280])
	for (const theme of ['light', 'dark'] as const) {
		test(`self-service member balances and admission ${width}px ${theme}`, async ({
			page,
			request
		}) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 844 });
			for (const [state, paidBani, reviewState] of [
				['unpaid', 0, null],
				['partial', 10000, null],
				['paid', 30500, null],
				['review', 10000, 'plan_changed_after_payment']
			] as const) {
				await configure(page, request, {
					membershipObligations: [{ ...obligation, paidBani, reviewState }]
				});
				await page.goto('/cotizatie');
				await capture(page, `self-service-${state}-${width}-${theme}`);
				const own = page.getByRole('region', { name: 'Cotizația ta' });
				await expect(own).toContainText('Ana Popescu');
				const wrappedAmounts = await own.locator('.account-summary dd').evaluateAll((elements) =>
					elements
						.filter((element) => /RON/.test(element.textContent ?? ''))
						.filter((element) => {
							const range = document.createRange();
							range.selectNodeContents(element);
							return (
								new Set(
									[...range.getClientRects()]
										.filter((rect) => rect.width > 0)
										.map((rect) => Math.round(rect.top))
								).size > 1
							);
						})
						.map((element) => element.textContent)
				);
				expect(wrappedAmounts, 'financial amounts keep the value and currency together').toEqual(
					[]
				);

				if (state === 'unpaid') {
					const lookupInput = page.getByLabel('ID ORGO sau ID Card');
					await lookupInput.focus();
					await expect(lookupInput).toBeFocused();
					const inputBounds = (await lookupInput.boundingBox())!;
					const barBounds = (await page.locator('header.topbar').boundingBox())!;
					expect(
						inputBounds.y,
						'focused member lookup stays below the authenticated topbar'
					).toBeGreaterThanOrEqual(barBounds.y + barBounds.height - 1);
					await page.screenshot({
						path: `../../tmp/design-review/self-service-focused-lookup-${width}-${theme}.png`
					});
				}

				if (state === 'paid' || state === 'review')
					await expect(
						own.getByRole('button', { name: 'Continuă la plata cu cardul' })
					).toHaveCount(0);
				else
					await expect(
						own.getByRole('button', { name: 'Continuă la plata cu cardul' })
					).toBeEnabled();
			}
			for (const admissionPaid of [false, true]) {
				await configure(page, request, {
					membershipObligations: [{ ...obligation, paidBani: 0, admissionPaid }]
				});
				await page.goto('/cotizatie?tip=adeziune');
				await capture(
					page,
					`self-service-admission-${admissionPaid ? 'paid' : 'unpaid'}-${width}-${theme}`
				);
				await expect(page.getByRole('region', { name: 'Adeziunea ta' })).toContainText('55,00');
			}
			await configure(page, request, { membershipObligations: [] });
			await page.goto('/cotizatie');
			await capture(page, `self-service-missing-${width}-${theme}`);
			await expect(page.getByRole('region', { name: 'Cotizația ta' })).toContainText(
				'Nu există încă'
			);
			await configure(page, request, {
				membershipObligations: [{ ...obligation, admissionEligible: false }]
			});
			await page.goto('/cotizatie?tip=adeziune');
			await capture(page, `self-service-admission-ineligible-${width}-${theme}`);
			await expect(page.getByRole('region', { name: 'Adeziunea ta' })).toContainText(
				'ultimele 6 luni'
			);
			await configure(page, request, {
				selfServiceCatalog: { cardEnabled: false },
				membershipObligations: [{ ...obligation, paidBani: 0 }]
			});
			await page.goto('/cotizatie');
			await capture(page, `self-service-card-disabled-${width}-${theme}`);
			await expect(
				page.getByRole('button', { name: 'Continuă la plata cu cardul' })
			).toBeDisabled();
			await configure(page, request, { selfServiceCatalog: { period: null } }, false);
			await page.goto('/cotizatie');
			await capture(page, `self-service-unpublished-${width}-${theme}`);
			await expect(
				page.getByText('Perioada de cotizație nu a fost încă publicată.', { exact: false })
			).toBeVisible();
		});

		test(`self-service guest lookup and payment errors ${width}px ${theme}`, async ({
			page,
			request
		}) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 844 });
			for (const state of ['unpaid', 'paid', 'error'] as const) {
				await configure(
					page,
					request,
					{
						guestLookup: { paid: state === 'paid' },
						guestLookupError:
							state === 'error' ? 'ID-ul nu poate fi verificat. Verifică numărul introdus.' : null
					},
					false
				);
				await page.goto('/cotizatie');
				await capture(page, `self-service-guest-${state}-initial-${width}-${theme}`);
				const identifier = page.getByLabel('ID ORGO sau ID Card');
				await identifier.fill('at36801');
				await expect(identifier).toHaveValue('AT36801');
				const input = (await identifier.boundingBox())!;
				const bar = (await page.locator('header.public-topbar').boundingBox())!;
				expect(input.y).toBeGreaterThanOrEqual(Math.max(0, bar.y + bar.height));
				await page.getByRole('button', { name: 'Verifică ID-ul' }).click();
				if (state === 'error')
					await expect(page.getByRole('alert')).toContainText('ID-ul nu poate');
				else await expect(page.locator('.member-result')).toContainText('Ana P.');
				await capture(page, `self-service-guest-${state}-${width}-${theme}`);
				if (state === 'unpaid') {
					await page.getByRole('checkbox', { name: /Am citit și accept/ }).check();
					await page.getByRole('button', { name: 'Continuă la plata cu cardul' }).click();
					await expect(page.getByRole('alert')).toContainText('Eroare de test');
					await expect(page.locator('input[name="amountBani"]')).toHaveValue('30500');
					await capture(page, `self-service-checkout-error-${width}-${theme}`);
				}
			}
		});

		test(`self-service checkout results ${width}px ${theme}`, async ({ page, request }) => {
			await seedTheme(page, theme);
			await page.setViewportSize({ width, height: 844 });
			for (const state of ['pending', 'succeeded', 'failed', 'unknown', 'missing'] as const) {
				await configure(page, request, {
					selfServiceStatus:
						state === 'missing'
							? null
							: {
									state,
									purpose: 'membership',
									environment: 'sandbox',
									provider: 'stripe',
									amountBani: 20500,
									requiresStaffReview: state === 'unknown',
									paymentUrl: state === 'pending' ? 'https://example.test/synthetic-checkout' : null
								}
				});
				await page
					.context()
					.addCookies([
						{ name: 'membership_attempt', value: 'synthetic-attempt', url: origin + '/cotizatie' }
					]);
				await page.goto('/cotizatie/rezultat');
				await capture(page, `self-service-result-${state}-${width}-${theme}`);
				if (state !== 'missing') {
					await expect(page.locator('.payment-details')).toContainText('205,00');
					await page.goto('/cotizatie');
					await capture(page, `self-service-attempt-${state}-${width}-${theme}`);
				}
			}
		});
	}
