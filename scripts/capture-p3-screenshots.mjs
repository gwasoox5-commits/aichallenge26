/**
 * P3 GM Operation Review screenshot capture (Playwright)
 * Usage: node scripts/capture-p3-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3016";
const OUT = path.join(__dirname, "../docs/release/screenshots/p3");
const SETUP = path.join(__dirname, "../docs/release/p2-setup-data.json");

async function api(pathname, opts = {}) {
  const res = await fetch(`${BASE}${pathname}`, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
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

  const setupRaw = await readFile(SETUP, "utf8");
  const setup = JSON.parse(setupRaw);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. GM login
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "01-gm-login.png"), fullPage: true });

  await adminLogin(page);
  await page.screenshot({ path: path.join(OUT, "02-gm-logged-in.png"), fullPage: true });

  // 2. Load demo + command center
  await page.getByRole("button", { name: "데모 세션 불러오기" }).click();
  await page.waitForSelector("text=GM Command Center", { timeout: 60000 }).catch(() => undefined);
  await page.waitForFunction(
    () => document.body.innerText.includes("제출률") || document.body.innerText.includes("Join Code:"),
    { timeout: 60000 }
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "03-command-center.png"), fullPage: true });

  // 3. Status banner close-up
  const banner = page.locator("text=현재 반기").first();
  if (await banner.isVisible()) {
    await banner.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "04-status-banner.png"), fullPage: false });
  }

  // 4. Confirmation dialog — Pause
  const pauseBtn = page.getByRole("button", { name: /Pause/i });
  if (await pauseBtn.isVisible()) {
    await pauseBtn.click();
    await page.waitForSelector("text=일시정지");
    await page.getByPlaceholder("운영 사유를 입력하세요").fill("P3 스크린샷 — 수업 중 휴식");
    await page.screenshot({ path: path.join(OUT, "05-pause-confirm-dialog.png"), fullPage: true });
    await page.getByRole("button", { name: "취소" }).click();
  }

  // 5. Create teams via API for team table
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "bsp-admin-dev" }),
  });
  const adminToken = login.json.accessToken;

  const demo = await api("/api/v1/demo/setup", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const sessionId = demo.json.sessionId;
  const gmToken = demo.json.gmAccessToken;

  for (let i = 1; i <= 3; i++) {
    await api("/api/v1/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: setup.joinCode, teamName: `P3-Team-${i}` }),
    });
  }

  await page.addInitScript((token) => {
    localStorage.setItem("bsp_access_token", token);
  }, gmToken);
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "06-team-table-unsubmitted.png"), fullPage: true });

  // 6. Audit log panel
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "07-audit-log-panel.png"), fullPage: true });

  // 7. Zero submit via API then refresh
  await api(`/api/v1/gm/sessions/${sessionId}/zero-submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gmToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "P3 screenshot — 미제출 zero" }),
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "08-after-zero-submit.png"), fullPage: true });

  // 8. GM operations buttons
  await page.evaluate(() => window.scrollTo(0, 0));
  const opsSection = page.locator("text=GM 조작").first();
  if (await opsSection.isVisible()) {
    await opsSection.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "09-gm-operations.png"), fullPage: true });
  }

  await browser.close();
  console.log(`P3 screenshots saved to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
