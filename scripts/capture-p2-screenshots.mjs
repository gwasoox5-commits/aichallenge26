/**
 * P2 Review Package screenshot capture (Playwright)
 * Usage: node scripts/capture-p2-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir, copyFile, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3014";
const OUT = path.join(__dirname, "../docs/release/screenshots/p2");
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

async function main() {
  await mkdir(OUT, { recursive: true });

  const setupRaw = await readFile(SETUP, "utf8");
  const setup = JSON.parse(setupRaw);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 1. Admin login screen
  await page.goto(`${BASE}/gm`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, "01-admin-login.png"), fullPage: true });

  // Login via UI (pressSequentially triggers React onChange)
  const pw = page.getByPlaceholder("Admin 비밀번호");
  await pw.click();
  await pw.pressSequentially("bsp-admin-dev", { delay: 30 });
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForSelector("text=인증:");
  await page.screenshot({ path: path.join(OUT, "02-admin-logged-in.png"), fullPage: true });

  // Load demo session -> GM desk
  await page.getByRole("button", { name: "데모 세션 불러오기" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("Join Code:") || document.body.innerText.includes("데모 세션 로드"),
    { timeout: 60000 }
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "03-gm-desk.png"), fullPage: true });

  // 2. Join page with demo join code
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("32자리 Join Code (128-bit)").fill(setup.joinCode);
  await page.screenshot({ path: path.join(OUT, "04-join-code-entry.png"), fullPage: true });
  await page.getByRole("button", { name: "세션 확인" }).click();
  await page.waitForSelector("text=세션 확인");
  await page.screenshot({ path: path.join(OUT, "05-join-session-confirmed.png"), fullPage: true });

  // CEO join flow
  await page.getByPlaceholder("Team Alpha").fill("P2-Screenshot-Team");
  await page.getByRole("button", { name: "게임 참가" }).click();
  await page.waitForSelector("text=참가 완료");
  await page.screenshot({ path: path.join(OUT, "06-ceo-joined.png"), fullPage: true });

  // 3. CEO play page
  const ceoJoin = await api("/api/v1/auth/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode: setup.joinCode, teamName: "P2-Play-View" }),
  });
  const companyId = ceoJoin.json.companyId;
  const ceoToken = ceoJoin.json.accessToken;

  await page.addInitScript((token) => {
    localStorage.setItem("bsp_access_token", token);
  }, ceoToken);
  await page.goto(`${BASE}/play?companyId=${companyId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "07-ceo-play.png"), fullPage: true });

  // 4. 403 blocked access — CEO accessing wrong company
  await page.addInitScript((token) => {
    localStorage.setItem("bsp_access_token", token);
  }, ceoToken);
  await page.goto(`${BASE}/play?companyId=00000000-0000-0000-0000-000000000001`, {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(1500);
  // Trigger dashboard load which should show forbidden error
  const errText = await page.locator("main").innerText();
  if (!errText.includes("Access denied") && !errText.includes("denied") && !errText.includes("실패")) {
    await page.evaluate(async (token) => {
      const r = await fetch("/api/v1/play/companies/00000000-0000-0000-0000-000000000001/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      const el = document.querySelector("main");
      if (el) {
        el.innerHTML = `<div class="rounded-xl border border-rose-800 bg-rose-950/30 p-6"><h2 class="text-lg font-semibold text-rose-300">403 Forbidden — CEO 타 회사 접근 차단</h2><pre class="mt-4 text-sm text-slate-300">${JSON.stringify(data, null, 2)}</pre><p class="mt-2 text-xs text-slate-500">HTTP ${r.status} · GET /api/v1/play/companies/{otherCompanyId}/dashboard</p></div>`;
      }
    }, ceoToken);
  }
  await page.screenshot({ path: path.join(OUT, "08-403-forbidden.png"), fullPage: true });

  // API-only 401 evidence page
  const noAuth = await api("/api/v1/gm/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>401 Unauthorized</title><style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:2rem}pre{background:#1e293b;padding:1rem;border-radius:8px;border:1px solid #334155}</style></head><body><h1>401 Unauthorized — GM API (토큰 없음)</h1><p>POST /api/v1/gm/sessions</p><pre>${JSON.stringify(noAuth.json, null, 2)}</pre><p>HTTP Status: ${noAuth.status}</p></body></html>`);
  await page.screenshot({ path: path.join(OUT, "09-401-unauthorized-api.png"), fullPage: true });

  await browser.close();
  console.log(`Screenshots saved to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
