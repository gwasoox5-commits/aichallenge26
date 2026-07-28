/**
 * P9 RC Validation screenshot capture (Playwright)
 * Usage: npm run dev (BSP_USE_MEMORY=1)
 *        node scripts/p9-rc-setup.mjs http://localhost:3018   # optional: seeds 3-team session
 *        node scripts/capture-p9-screenshots.mjs http://localhost:3018
 */
import { chromium } from "playwright";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3018";
const OUT = path.join(__dirname, "../docs/release/screenshots/p9");
const SETUP_PATH = path.join(__dirname, "../docs/release/p8-setup-data.json");

async function loadSetup() {
  try {
    const raw = await readFile(SETUP_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function adminLogin(page) {
  const pw = page.locator('input[type="password"]').first();
  await pw.click();
  await pw.pressSequentially("bsp-admin-dev", { delay: 30 });
  await page.locator("header ~ main button, main button").filter({ hasText: /\uB85C\uADF8\uC778/ }).first().click();
  await page.waitForFunction(() => document.body.innerText.includes("\uC778\uC99D:"), { timeout: 60000 });
}

async function openGmDesk(page, setup) {
  const token = setup?.gmAccessToken ?? setup?.adminAccessToken;
  await page.goto(`${BASE}/gm?sessionId=${setup.sessionId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  if (token) {
    await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), token);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  } else {
    await adminLogin(page);
  }
  await page.waitForSelector("[data-testid='gm-ops-summary']", { timeout: 60000 });
  await page.waitForTimeout(600);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const setup = await loadSetup();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 01 Join
  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "01-join.png"), fullPage: true });

  if (setup?.sessionId) {
    // 02 GM desk (pilot session)
    await openGmDesk(page, setup);
    await page.screenshot({ path: path.join(OUT, "02-gm-desk-pilot.png"), fullPage: true });

    const audit = page.locator("[data-testid='gm-audit-log']");
    await audit.scrollIntoViewIfNeeded();
    await audit.screenshot({ path: path.join(OUT, "03-gm-audit-pilot.png") });

    const ceo = setup?.teams?.[0];
    if (ceo?.companyId && ceo?.accessToken) {
      await page.goto(`${BASE}/play?companyId=${ceo.companyId}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), ceo.accessToken);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector("[data-testid='ceo-command-dashboard']", { timeout: 60000 });
      await page.screenshot({ path: path.join(OUT, "04-ceo-play-pilot.png"), fullPage: true });
    }

    await openGmDesk(page, setup);
    await page.screenshot({ path: path.join(OUT, "05-gm-ops-pilot.png"), fullPage: true });
  } else {
    await page.goto(`${BASE}/gm`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await adminLogin(page);
    await page.screenshot({ path: path.join(OUT, "02-gm-login-fallback.png"), fullPage: true });
  }

  await browser.close();
  console.log(`P9 screenshots saved to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
