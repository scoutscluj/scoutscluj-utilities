// Capture the deployed UI with fictitious data. Form submission uses the isolated fixture only.
const path = require("node:path");
const fs = require("node:fs/promises");
const repo = path.resolve(__dirname, "../..");
const { chromium } = require(
  path.join(repo, "apps/web/node_modules/@playwright/test"),
);
const sharp = require(path.join(repo, "apps/api/node_modules/sharp"));
const out = path.join(repo, "tmp/tutorial-inscriere");
async function crop(page, id, locators) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  const boxes = await Promise.all(locators.map((l) => l.boundingBox()));
  if (boxes.some((b) => !b)) throw new Error("Missing capture target: " + id);
  const sy = await page.evaluate(() => window.scrollY);
  const image = await page.screenshot({ fullPage: true });
  const meta = await sharp(image).metadata();
  const scale = await page.evaluate(() => window.devicePixelRatio);
  const left = Math.max(
    0,
    Math.floor((Math.min(...boxes.map((b) => b.x)) - 8) * scale),
  );
  const top = Math.max(
    0,
    Math.floor((Math.min(...boxes.map((b) => b.y)) + sy - 8) * scale),
  );
  const right = Math.min(
    meta.width,
    Math.ceil((Math.max(...boxes.map((b) => b.x + b.width)) + 8) * scale),
  );
  const bottom = Math.min(
    meta.height,
    Math.ceil((Math.max(...boxes.map((b) => b.y + b.height)) + sy + 8) * scale),
  );
  await sharp(image)
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toFile(path.join(out, id + ".png"));
  let controls = await page
    .locator(
      "input:not([type=hidden]):not([type=file]), select, button, [role=button], a.register-action, .mode-choice label.selected",
    )
    .evaluateAll((elements) =>
      elements.map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }),
    );
  if (id === "google") controls = [boxes.at(-1)];
  const focus = controls
    .filter(Boolean)
    .map((b) => ({
      x: b.x * scale - left,
      y: (b.y + sy) * scale - top,
      width: b.width * scale,
      height: b.height * scale,
    }))
    .filter(
      (b) =>
        b.width > 40 * scale &&
        b.height > 20 * scale &&
        b.x >= 0 &&
        b.y >= 0 &&
        b.x + b.width <= right - left &&
        b.y + b.height <= bottom - top,
    );
  await fs.writeFile(
    path.join(out, id + ".json"),
    JSON.stringify({ width: right - left, height: bottom - top, focus }),
  );
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    channel: "chromium",
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
      deviceScaleFactor: 2,
    });
    await page.goto("http://127.0.0.1:5197/login");
    await crop(page, "start", [
      page.getByRole("heading", { name: "Autentificare", exact: true }),
      page.locator(".register-action"),
    ]);
    await page
      .getByRole("link", { name: "Înscrie-te în centrul local" })
      .click();
    await page
      .getByRole("radio", {
        name: "Pentru copilul meu / altă persoană",
        exact: false,
      })
      .check();
    await crop(page, "mode", [page.locator(".mode-choice")]);
    await page
      .getByLabel("Prenumele copilului / persoanei", { exact: true })
      .fill("Ana");
    await page
      .getByLabel("Numele de familie al copilului / persoanei", { exact: true })
      .fill("Exemplu");
    await page.getByPlaceholder("zz.ll.aaaa").fill("15.06.2014");
    await page
      .getByRole("combobox", {
        name: "Genul copilului / persoanei",
        exact: true,
      })
      .selectOption("F");
    await crop(page, "profile", [
      page
        .getByLabel("Prenumele copilului / persoanei", { exact: true })
        .locator(".."),
      page.locator(".photo-field"),
    ]);
    await page.getByLabel("Situație școlară").selectOption("grade");
    await page
      .getByRole("combobox", { name: "Clasă", exact: true })
      .selectOption("6");
    await page
      .getByRole("combobox", { name: "Structură", exact: true })
      .selectOption("cluj");
    await page
      .getByLabel("Ramura de vârstă")
      .selectOption("11111111-1111-4111-8111-111111111111");
    await crop(page, "structure", [
      page.getByLabel("Situație școlară").locator(".."),
      page.getByLabel("Ramura de vârstă").locator(".."),
    ]);
    await page
      .getByLabel("Emailul copilului / persoanei", { exact: true })
      .fill("ana.demo@example.com");
    await crop(page, "email", [page.locator(".email-field")]);
    await page
      .getByLabel("Nume părinte", { exact: true })
      .fill("Părinte Exemplu");
    await page.getByLabel("Relația cu copilul").selectOption("Părinte");
    await page.getByLabel("Email părinte").fill("parinte.demo@example.com");
    await page.getByLabel("Telefon părinte").fill("0700 000 000");
    await crop(page, "guardian", [page.locator("form fieldset").last()]);
    await page.getByLabel("Sunt de acord ca datele").check();
    await crop(page, "submit", [
      page.getByLabel("Sunt de acord ca datele").locator(".."),
      page.getByRole("button", { name: "Trimite cererea de înscriere" }),
    ]);
    await page
      .getByRole("button", { name: "Trimite cererea de înscriere" })
      .click();
    await page
      .getByRole("heading", { name: "Cererea a fost înregistrată" })
      .waitFor();
    await crop(page, "approval", [
      page.locator(".success > p").first(),
      page.locator(".next-steps li").nth(1),
    ]);
    await page.goto("http://127.0.0.1:5197/login");
    await page.getByRole("button", { name: /Connect with Orgo/ }).focus();
    await crop(page, "login", [
      page.locator(".center-logo"),
      page.locator(".orgo-button"),
    ]);
    // OAuth entry is public. Never submit an email or ask for an actual code.
    const orgo = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
      deviceScaleFactor: 2,
    });
    await orgo.goto("https://resurse.scoutscluj.ro/login");
    await orgo.getByRole("button", { name: /Connect with Orgo/ }).click();
    await orgo.waitForURL((u) => u.hostname === "membri.scout.ro");
    const email = orgo.locator('input[type="email"]').first();
    await email.waitFor();
    const cookies = orgo.getByRole("button", {
      name: "Respinge opționale",
      exact: true,
    });
    if (await cookies.isVisible()) await cookies.click();
    await email.fill("ana.demo@example.com");
    const proceed = orgo.getByText("Continuă", { exact: true });
    await crop(orgo, "code", [email.locator(".."), proceed]);
    const google = orgo.getByText("Continuă cu Google", { exact: true });
    const googleAction = google.locator(
      'xpath=ancestor-or-self::*[self::button or self::a or @role="button"][1]',
    );
    await crop(orgo, "google", [
      email.locator(".."),
      (await googleAction.count()) ? googleAction : google.locator(".."),
    ]);
    console.log(
      "Captured real UI; one local fixture request; zero production submissions or authentication codes.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
