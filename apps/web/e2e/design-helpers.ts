import { expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtimeErrors = new WeakMap<Page, string[]>();
export function watchRuntimeErrors(page: Page) {
	const errors: string[] = [];
	runtimeErrors.set(page, errors);
	page.on('pageerror', (error) => errors.push(error.message));
}
export function expectNoRuntimeErrors(page: Page) {
	expect(runtimeErrors.get(page) ?? [], 'No browser initialization or runtime errors').toEqual([]);
}

export async function captureWorkspace(page: Page, name: string) {
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expect(page.locator('main').first()).toBeVisible();
	await expect(page.locator('h1').first(), `${name}: page heading`).toBeVisible();
	await expect(page.locator('h1').first()).not.toHaveText(/^(500|404|Internal Error)$/);
	const readingSelector = name.startsWith('kitchen-meals')
		? '.slot-grid'
		: name.startsWith('activity-audit')
			? '.table-wrap'
			: '';
	const metrics = await page.evaluate((selector) => {
		const main = document.querySelector('main');
		const row = main?.querySelector('tbody > tr:not([hidden])');
		return {
			width: innerWidth,
			scrollWidth: document.documentElement.scrollWidth,
			background: getComputedStyle(document.body).backgroundColor,
			heading: document.querySelector('h1')?.textContent,
			firstRowY: row?.getBoundingClientRect().top ?? null,
			readingOverflow: selector
				? [...(main?.querySelectorAll(selector) ?? [])]
						.filter(
							(element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1
						)
						.map((element) => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }))
				: [],
			theme: document.documentElement.dataset.theme
		};
	}, readingSelector);
	const directory = resolve('../../tmp/design-review');
	await mkdir(directory, { recursive: true });
	await page.screenshot({ path: resolve(directory, `${name}.png`) });
	if (metrics.width === 390 || metrics.width === 1280)
		await page.screenshot({ path: resolve(directory, `${name}-full.png`), fullPage: true });
	await writeFile(resolve(directory, `${name}.json`), JSON.stringify(metrics, null, 2));
	if (metrics.width <= 1024)
		expect(metrics.readingOverflow, `${name}: information must fit its content area`).toEqual([]);
	expect(metrics.scrollWidth, `${name}: page must fit the viewport`).toBeLessThanOrEqual(
		metrics.width
	);
	return metrics;
}

export async function seedTheme(page: Page, theme: 'light' | 'dark' | 'system') {
	await page.addInitScript((value) => localStorage.setItem('scoutscluj-appearance', value), theme);
}

export async function expectThemeContrast(page: Page) {
	const pairs = await page.evaluate(() => {
		const probe = document.createElement('div');
		probe.style.position = 'fixed';
		probe.style.left = '-10000px';
		document.body.append(probe);
		const definitions = [
			['ink/surface', '--sc-ink', '--sc-surface', 4.5],
			['muted/surface', '--sc-muted', '--sc-surface', 4.5],
			['muted/canvas', '--sc-muted', '--sc-canvas', 4.5],
			['link/surface', '--sc-link', '--sc-surface', 4.5],
			['button', '--sc-on-accent', '--sc-accent', 4.5],
			['control border', '--sc-control-border', '--sc-surface', 3],
			['success', '--sc-success', '--sc-success-soft', 4.5],
			['received button', '--sc-success-control-ink', '--sc-success-control-bg', 4.5],
			['received border', '--sc-success-control-border', '--sc-success-control-bg', 3],
			['review button', '--sc-review-control-ink', '--sc-review-control-bg', 4.5],
			['review border', '--sc-review-control-border', '--sc-review-control-bg', 3],
			['warning', '--sc-warning', '--sc-warning-soft', 4.5],
			['info', '--sc-info', '--sc-info-soft', 4.5]
		] as const;
		const luminance = (color: string) => {
			const channels = color
				.match(/[\d.]+/g)!
				.slice(0, 3)
				.map(Number)
				.map((v) => {
					const n = v / 255;
					return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
				});
			return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
		};
		const result = definitions.map(([name, foreground, background, minimum]) => {
			probe.style.color = `var(${foreground})`;
			probe.style.backgroundColor = `var(${background})`;
			const css = getComputedStyle(probe);
			const a = luminance(css.color),
				b = luminance(css.backgroundColor);
			return { name, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), minimum };
		});
		probe.remove();
		return result;
	});
	for (const pair of pairs) expect(pair.ratio, pair.name).toBeGreaterThanOrEqual(pair.minimum);
}

export async function expectRenderedContrast(page: Page) {
	const failures = await page.evaluate(() => {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const ctx = canvas.getContext('2d')!;
		const rgba = (color: string) => {
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, 1, 1);
			return [...ctx.getImageData(0, 0, 1, 1).data];
		};
		const background = (element: Element | null): number[] => {
			if (!element) return [255, 255, 255, 255];
			const own = rgba(getComputedStyle(element).backgroundColor);
			if (own[3] === 255) return own;
			const behind = background(element.parentElement),
				alpha = own[3] / 255;
			return [0, 1, 2].map((i) => own[i] * alpha + behind[i] * (1 - alpha)).concat(255);
		};
		const luminance = (color: number[]) => {
			const c = color.slice(0, 3).map((v) => {
				const n = v / 255;
				return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
			});
			return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
		};
		const contrast = (a: number[], b: number[]) => {
			const x = luminance(a),
				y = luminance(b);
			return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
		};
		const visible = (element: Element) => {
			const r = element.getBoundingClientRect(),
				c = getComputedStyle(element);
			return r.width > 0 && r.height > 0 && c.visibility !== 'hidden';
		};
		const result: { element: string; ratio: number; minimum: number }[] = [];
		for (const element of document.querySelectorAll(
			'nav a, main a, [role="menuitem"], .department-heading, .utility-label'
		)) {
			if (!visible(element) || element.getAttribute('aria-disabled') === 'true') continue;
			const ratio = contrast(rgba(getComputedStyle(element).color), background(element));
			if (ratio < 4.5)
				result.push({
					element: (element.textContent ?? '').trim().slice(0, 70),
					ratio,
					minimum: 4.5
				});
		}
		for (const element of document.querySelectorAll(
			'input:not([type="hidden"],[type="checkbox"],[type="radio"]), select, textarea, .date-control, .filter-trigger'
		)) {
			if (
				!visible(element) ||
				element.matches(':disabled') ||
				element.getAttribute('aria-disabled') === 'true'
			)
				continue;
			const css = getComputedStyle(element);
			if (element.matches('input[placeholder], textarea[placeholder]')) {
				const placeholder = getComputedStyle(element, '::placeholder');
				const ratio = contrast(rgba(placeholder.color), background(element));
				if (ratio < 4.5)
					result.push({
						element: `${element.getAttribute('placeholder')} placeholder`,
						ratio,
						minimum: 4.5
					});
			}
			if (css.borderTopStyle === 'none' || parseFloat(css.borderTopWidth) === 0) continue;
			const ratio = contrast(rgba(css.borderTopColor), background(element));
			if (ratio < 3)
				result.push({
					element:
						element.getAttribute('aria-label') ?? element.getAttribute('name') ?? element.className,
					ratio,
					minimum: 3
				});
		}
		return result;
	});
	expect(failures, 'Rendered navigation and control contrast').toEqual([]);
}
