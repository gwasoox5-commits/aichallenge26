/**
 * P6 Realtime Review screenshot capture (Playwright)
 * Usage: node scripts/capture-p6-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3018";
const OUT = path.join(__dirname, "../docs/release/screenshots/p6");

async function api(pathname, opts = {}) {
  const res = await fetch(`${BASE}${pathname}`, opts);
  const text = await res.text();
  try {
    return { status: res.status, json: JSON.parse(text) };
  } catch {
    return { status: res.status, json: { raw: text } };
  }
}

async function adminLogin(page) {
  const pw = page.locator('input[type="password"]').first();
  await pw.click();
  await pw.pressSequentially("bsp-admin-dev", { delay: 30 });
  await page.locator("header ~ main button, main button").filter({ hasText: /\uB85C\uADF8\uC778/ }).first().click();
  await page.waitForFunction(() => document.body.innerText.includes("\uC778\uC99D:"), { timeout: 60000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. GM with realtime indicator
  await page.goto(`${BASE}/gm`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "01-gm-login.png"), fullPage: true });

  await adminLogin(page);
  await page.locator("button").filter({ hasText: /\uC138\uC158 \uBD88\uB7EC/ }).click();
  await page.waitForSelector("[data-testid='realtime-indicator']", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "02-gm-realtime-connected.png"), fullPage: true });

  // 2. GM ops with team table
  await page.waitForSelector("[data-testid='gm-tab-ops']", { timeout: 30000 });
  await page.getByTestId("gm-tab-ops").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "03-gm-ops-realtime.png"), fullPage: true });

  // 3. Pause action flash
  const pauseBtn = page.locator("button").filter({ hasText: /Pause/ });
  if (await pauseBtn.isVisible()) {
    await pauseBtn.click();
    const dialog = page.locator(".fixed.inset-0.z-50");
    await dialog.locator("textarea").fill("P6 screenshot pause test");
    await dialog.locator("button").filter({ hasText: /일시정지|Pause/ }).last().click();
    await page.waitForSelector("[data-testid='realtime-flash-pause']", { timeout: 10000 }).catch(() => undefined);
    await page.screenshot({ path: path.join(OUT, "04-gm-pause-flash.png"), fullPage: true });
    const resumeBtn = page.locator("button").filter({ hasText: /Resume/ });
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      await dialog.locator("textarea").fill("P6 screenshot resume test");
      await dialog.locator("button").filter({ hasText: /재개|Resume/ }).last().click();
    }
  }

  // 4. Economy tab realtime
  await page.getByTestId("gm-tab-economy").click();
  await page.waitForSelector("[data-testid='gm-economy-panel']", { timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, "05-gm-economy-realtime.png"), fullPage: true });

  // 5. CEO play with realtime
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "bsp-admin-dev" }),
  });
  const token = login.json.accessToken;

  const join = await api("/api/v1/auth/join", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      joinCode: "DEADBEEF000000000000000000000001",
      teamName: "P6-Screenshot-Team",
    }),
  });

  const ceoToken = join.json.accessToken;
  const companyId = join.json.companyId;

  await page.goto(`${BASE}/play?companyId=${companyId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), ceoToken);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-testid='realtime-indicator']", { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "06-ceo-play-realtime.png"), fullPage: true });

  await page.waitForSelector("[data-testid='ceo-event-feed']", { timeout: 30000 }).catch(() => undefined);
  await page.screenshot({ path: path.join(OUT, "07-ceo-event-feed-realtime.png"), fullPage: true });

  // 6. GM events tab
  await page.goto(`${BASE}/gm`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), token);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("button").filter({ hasText: /세션 불러/ }).click();
  await page.getByTestId("gm-tab-events").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "08-gm-events-realtime.png"), fullPage: true });

  console.log(`P6 screenshots saved to ${OUT}`);
  console.log(`CEO companyId: ${companyId}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
