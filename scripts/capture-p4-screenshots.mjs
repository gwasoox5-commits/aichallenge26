/**
 * P4 Event Engine Review screenshot capture (Playwright)
 * Usage: node scripts/capture-p4-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3016";
const OUT = path.join(__dirname, "../docs/release/screenshots/p4");

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
  const pw = page.getByPlaceholder("Admin 비밀번호");
  await pw.click();
  await pw.pressSequentially("bsp-admin-dev", { delay: 30 });
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForSelector("text=인증:");
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. GM login + event panel
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "01-gm-login.png"), fullPage: true });

  await adminLogin(page);
  await page.getByRole("button", { name: "데모 세션 불러오기" }).click();
  await page.waitForSelector("[data-testid='gm-event-panel']", { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "02-gm-event-panel.png"), fullPage: true });

  // 2. Select FX event + preview
  const evt001 = page.locator("button", { hasText: "EVT-001" }).first();
  if (await evt001.isVisible()) {
    await evt001.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "03-event-preview-fx.png"), fullPage: true });
  }

  // 3. Fire confirm dialog
  const fireBtn = page.getByRole("button", { name: "발화 (Fire)" });
  if (await fireBtn.isVisible()) {
    await fireBtn.click();
    await page.waitForSelector("text=발화 확인");
    await page.getByPlaceholder("운영 사유를 입력하세요").fill("P4 스크린샷 — 환율 이벤트");
    await page.screenshot({ path: path.join(OUT, "04-fire-confirm-dialog.png"), fullPage: true });
    await page.getByRole("button", { name: "발화 확인" }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, "05-after-fire-active-list.png"), fullPage: true });
  }

  // 4. CEO play environment
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
      teamName: "P4-Screenshot-Team",
    }),
  });

  const ceoToken = join.json.accessToken;
  const companyId = join.json.companyId;

  await page.goto(`${BASE}/play`, { waitUntil: "networkidle" });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), ceoToken);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid='ceo-event-feed']", { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "06-ceo-event-feed.png"), fullPage: true });

  const badge = page.locator("text=경제 환경이 변경되었습니다");
  if (await badge.isVisible()) {
    await page.screenshot({ path: path.join(OUT, "07-ceo-economy-badge.png"), fullPage: false });
  }

  // 5. Event history panel — reload GM session
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), token);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "데모 세션 불러오기" }).click();
  await page.waitForSelector("[data-testid='gm-event-panel']", { timeout: 60000 });
  const historySection = page.locator("text=이벤트 이력").first();
  if (await historySection.isVisible()) {
    await historySection.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "08-event-history.png"), fullPage: true });
  }

  console.log(`P4 screenshots saved to ${OUT}`);
  console.log(`CEO companyId: ${companyId}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
