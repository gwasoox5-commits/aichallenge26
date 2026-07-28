/**
 * P5 Economy UI Review screenshot capture (Playwright)
 * Usage: node scripts/capture-p5-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3018";
const OUT = path.join(__dirname, "../docs/release/screenshots/p5");

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

  // 1. GM login
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "01-gm-login.png"), fullPage: true });

  await adminLogin(page);
  await page.locator("button").filter({ hasText: /\uC138\uC158 \uBD88\uB7EC/ }).click();
  await page.waitForSelector("[data-testid='gm-tab-economy']", { timeout: 60000 });

  // 2. Economy tab — dashboard cards
  await page.getByTestId("gm-tab-economy").click();
  await page.waitForSelector("[data-testid='gm-economy-panel']", { timeout: 30000 });
  await page.waitForSelector("[data-testid='eco-card-rawMaterial']", { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "02-gm-economy-dashboard.png"), fullPage: true });

  // 3. Preview — set value and run
  await page.waitForSelector("[data-testid='eco-card-rawMaterial']", { timeout: 15000 });
  const valueInput = page.locator("[data-testid='gm-economy-panel'] input[type='number']");
  await valueInput.fill("130");
  await page.getByTestId("eco-preview-btn").click();
  await page.waitForSelector("[data-testid='eco-preview-result']", { timeout: 30000 }).catch(async () => {
    await page.waitForTimeout(2000);
  });
  await page.screenshot({ path: path.join(OUT, "03-economy-preview.png"), fullPage: true });

  // 4. Apply patch confirm
  await page.getByTestId("eco-apply-btn").click();
  const confirmDialog = page.locator(".fixed.inset-0.z-50");
  await confirmDialog.locator("textarea").fill("P5 screenshot raw material patch");
  await page.screenshot({ path: path.join(OUT, "04-patch-confirm-dialog.png"), fullPage: true });
  await confirmDialog.locator("button").last().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "05-after-patch-history.png"), fullPage: true });

  // 5. Preset apply UI
  const presetSelect = page.locator("select").filter({ has: page.locator('option[value="PRESET_HIGH_INTEREST"]') });
  if (await presetSelect.count()) {
    await presetSelect.first().selectOption("PRESET_HIGH_INTEREST");
    await page.screenshot({ path: path.join(OUT, "06-preset-selected.png"), fullPage: true });
  }

  // 6. Timeline section
  const timeline = page.getByTestId("eco-timeline");
  if (await timeline.isVisible()) {
    await timeline.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "07-economy-timeline.png"), fullPage: true });
  }

  // 7. CEO environment
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "bsp-admin-dev" }),
  });
  const token = login.json.accessToken;

  const join = await api("/api/v1/auth/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      joinCode: "DEADBEEF000000000000000000000001",
      teamName: "P5-Screenshot-Team",
    }),
  });

  const ceoToken = join.json.accessToken;
  const companyId = join.json.companyId;

  await page.goto(`${BASE}/play?companyId=${companyId}`, { waitUntil: "networkidle" });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), ceoToken);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid='ceo-event-feed']", { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "08-ceo-environment.png"), fullPage: true });

  const recent = page.getByTestId("ceo-recent-changes");
  if (await recent.isVisible()) {
    await page.screenshot({ path: path.join(OUT, "09-ceo-recent-changes.png"), fullPage: false });
  }

    // 8. GM tabs overview
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), token);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.body.innerText.includes("인증:"), { timeout: 60000 });
  await page.locator("button").filter({ hasText: /세션 불러/ }).click();
  await page.waitForSelector("[data-testid='gm-tab-events']", { timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "10-gm-tabs-overview.png"), fullPage: true });

  console.log(`P5 screenshots saved to ${OUT}`);
  console.log(`CEO companyId: ${companyId}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
