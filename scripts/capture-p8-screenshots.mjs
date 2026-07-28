/**
 * P8 / P8.1 UX Validation screenshot capture (Playwright)
 * Usage: node scripts/p8-review-setup.mjs [baseUrl]
 *        node scripts/capture-p8-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3018";
const OUT = path.join(__dirname, "../docs/release/screenshots/p8");
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
  await page.waitForTimeout(800);
}

async function captureDesktop(browser, setup) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "01-join-page.png"), fullPage: true });

  await openGmDesk(page, setup);
  await page.screenshot({ path: path.join(OUT, "02-gm-ops-summary.png"), fullPage: true });

  const audit = page.locator("[data-testid='gm-audit-log']");
  await audit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await audit.screenshot({ path: path.join(OUT, "03-gm-audit-prominent.png") });

  const ceo = setup?.teams?.[1] ?? setup?.teams?.[0];
  if (ceo?.companyId && ceo?.accessToken) {
    await page.goto(`${BASE}/play?companyId=${ceo.companyId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), ceo.accessToken);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("[data-testid='ceo-command-dashboard']", { timeout: 60000 });
    await page.screenshot({ path: path.join(OUT, "04-ceo-command-dashboard.png"), fullPage: true });
    await page.waitForSelector("[data-testid='step-education-LOAN']", { timeout: 30000 }).catch(() => undefined);
    await page.screenshot({ path: path.join(OUT, "05-ceo-step-education.png"), fullPage: true });
  }

  await openGmDesk(page, setup);
  await page.waitForSelector("[data-testid='gm-recommended-action']", { timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "06-gm-recommended-action.png"), fullPage: true });

  await context.close();
}

async function captureMobile(browser, setup) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "07-mobile-join.png"), fullPage: true });

  const ceo = setup?.teams?.[1] ?? setup?.teams?.[0];
  if (ceo?.companyId && ceo?.accessToken) {
    await page.goto(`${BASE}/play?companyId=${ceo.companyId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), ceo.accessToken);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("[data-testid='ceo-command-dashboard']", { timeout: 60000 });
    await page.screenshot({ path: path.join(OUT, "08-mobile-ceo-play.png"), fullPage: true });
  }

  await openGmDesk(page, setup);
  await page.screenshot({ path: path.join(OUT, "09-mobile-gm-desk.png"), fullPage: true });

  await context.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const setup = await loadSetup();
  if (!setup?.sessionId) {
    console.warn("Warning: run p8-review-setup.mjs first — GM captures may use empty demo session");
  }

  const browser = await chromium.launch({ headless: true });
  await captureDesktop(browser, setup);
  await captureMobile(browser, setup);
  await browser.close();

  console.log(`P8 screenshots saved to ${OUT}`);
  if (setup) {
    console.log(`Session: ${setup.sessionId} · Audit entries: ${setup.auditEntryCount ?? "?"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
