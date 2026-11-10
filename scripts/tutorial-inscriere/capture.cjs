// Capture the deployed UI with fictitious data. Form submission uses the isolated fixture only.
const path = require('node:path');
const fs = require('node:fs/promises');
const repo = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(repo, 'apps/web/node_modules/@playwright/test'));
const sharp = require(path.join(repo, 'apps/api/node_modules/sharp'));
const out = path.join(repo, 'tmp/tutorial-inscriere');
async function crop(page, id, locators) {
  const boxes = await Promise.all(locators.map(l => l.boundingBox()));
  if (boxes.some(b => !b)) throw new Error('Missing capture target: ' + id);
  const sy = await page.evaluate(() => window.scrollY);
  const image = await page.screenshot({ fullPage: true });
  const meta = await sharp(image).metadata();
  const scale = await page.evaluate(() => window.devicePixelRatio);
  const left = Math.max(0, Math.floor((Math.min(...boxes.map(b => b.x)) - 8) * scale));
  const top = Math.max(0, Math.floor((Math.min(...boxes.map(b => b.y)) + sy - 8) * scale));
  const right = Math.min(meta.width, Math.ceil((Math.max(...boxes.map(b => b.x + b.width)) + 8) * scale));
  const bottom = Math.min(meta.height, Math.ceil((Math.max(...boxes.map(b => b.y + b.height)) + sy + 8) * scale));
  await sharp(image).extract({ left, top, width: right - left, height: bottom - top }).png().toFile(path.join(out, id + '.png'));
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:5197/login');
    await crop(page, 'start', [page.getByRole('heading', { name: 'Autentificare', exact: true }), page.locator('.register-action')]);
    await page.getByRole('link', { name: 'Înscrie-te în centrul local' }).click();
    await page.getByRole('radio', { name: 'Pentru copilul meu / altă persoană', exact: false }).check();
    await crop(page, 'mode', [page.locator('.mode-choice')]);
    await page.getByLabel('Prenumele copilului / persoanei', { exact: true }).fill('Ana');
    await page.getByLabel('Numele de familie al copilului / persoanei', { exact: true }).fill('Exemplu');
    await page.getByPlaceholder('zz.ll.aaaa').fill('15.06.2014');
    await page.getByRole('combobox', { name: 'Genul copilului / persoanei', exact: true }).selectOption('F');
    await crop(page, 'profile', [page.getByLabel('Prenumele copilului / persoanei', { exact: true }).locator('..'), page.locator('.photo-field')]);
    await page.getByLabel('Situație școlară').selectOption('grade');
    await page.getByRole('combobox', { name: 'Clasă', exact: true }).selectOption('6');
    await page.getByRole('combobox', { name: 'Structură', exact: true }).selectOption('cluj');
    await page.getByLabel('Ramura de vârstă').selectOption('11111111-1111-4111-8111-111111111111');
    await crop(page, 'structure', [page.getByLabel('Situație școlară').locator('..'), page.getByLabel('Ramura de vârstă').locator('..')]);
    await page.getByLabel('Emailul copilului / persoanei', { exact: true }).fill('ana.demo@example.com');
    await crop(page, 'email', [page.locator('.email-field')]);
    await page.getByLabel('Nume complet părinte / tutore', { exact: true }).fill('Părinte Exemplu');
    await page.getByLabel('Relația cu copilul').selectOption('Părinte');
    await page.getByLabel('Email părinte / tutore').fill('parinte.demo@example.com');
    await page.getByLabel('Telefon părinte / tutore').fill('0700 000 000');
    await crop(page, 'guardian', [page.locator('form fieldset').last()]);
    await page.getByLabel('Sunt de acord ca datele').check();
    await crop(page, 'submit', [page.getByLabel('Sunt de acord ca datele').locator('..'), page.getByRole('button', { name: 'Trimite cererea de înscriere' })]);
    await page.getByRole('button', { name: 'Trimite cererea de înscriere' }).click();
    await page.getByRole('heading', { name: 'Cererea a fost înregistrată' }).waitFor();
    await crop(page, 'approval', [page.locator('.success > p').first(), page.locator('.next-steps li').nth(1)]);
    await page.goto('http://127.0.0.1:5197/login');
    await page.getByRole('button', { name: /Connect with Orgo/ }).focus();
    await crop(page, 'login', [page.locator('.center-logo'), page.locator('.orgo-button')]);
    // OAuth entry is public. Never submit an email or ask for an actual code.
    const orgo = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    await orgo.goto('https://resurse.scoutscluj.ro/login');
    await orgo.getByRole('button', { name: /Connect with Orgo/ }).click();
    await orgo.waitForURL(u => u.hostname === 'membri.scout.ro');
    const email = orgo.locator('input[type="email"]').first();
    await email.waitFor();
    const cookies = orgo.getByRole('button', { name: 'Respinge opționale', exact: true });
    if (await cookies.isVisible()) await cookies.click();
    await email.fill('ana.demo@example.com');
    const proceed = orgo.getByText('Continuă', { exact: true });
    await crop(orgo, 'code', [email.locator('..'), proceed]);
    const google = orgo.getByText('Continuă cu Google', { exact: true });
    await crop(orgo, 'google', [email.locator('..'), google]);
    console.log('Captured real UI; one local fixture request; zero production submissions or authentication codes.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
