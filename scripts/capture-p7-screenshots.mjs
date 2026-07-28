/**
 * P7 Production Readiness screenshot capture (Playwright)
 * Usage: node scripts/capture-p7-screenshots.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.join(__dirname, "../docs/release/screenshots/p7");

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
  await page.locator("main button").filter({ hasText: /\uB85C\uADF8\uC778/ }).first().click();
  await page.waitForFunction(() => document.body.innerText.includes("\uC778\uC99D:"), { timeout: 60000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const login = await api("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "bsp-admin-dev" }),
  });
  const adminToken = login.json.accessToken;

  await page.goto(`${BASE}/gm`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.screenshot({ path: path.join(OUT, "01-gm-login.png"), fullPage: true });
  await adminLogin(page);

  await page.locator("button").filter({ hasText: /\uAC8C\uC784 \uC0DD\uC131/ }).click();
  await page.waitForSelector("[data-testid='gm-tab-ops']", { timeout: 60000 });
  await page.waitForFunction(() => /Join Code:/i.test(document.body.innerText), { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, "02-gm-session-created.png"), fullPage: true });

  const joinCode = await page.evaluate(() => {
    const m = document.body.innerText.match(/Join Code:\s*(\S+)/);
    return m?.[1] ?? null;
  });
  if (!joinCode) throw new Error("Join code not found after session create");

  const sessionsRes = await api("/api/v1/admin/sessions", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const sessionId =
    (Array.isArray(sessionsRes.json) ? sessionsRes.json : []).find((s) => s.joinCode === joinCode)?.id ?? null;
  if (!sessionId) throw new Error(`Session id not found for join code ${joinCode}`);

  for (let i = 1; i <= 10; i++) {
    await api("/api/v1/auth/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode, teamName: `P7-Team-${i}` }),
    });
  }

  await page.locator("button").filter({ hasText: /\uC0C8\uB85C\uACE0\uCE68/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "03-gm-10-teams.png"), fullPage: true });

  await page.getByTestId("gm-tab-economy").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "04-gm-economy.png"), fullPage: true });

  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), adminToken);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes("PLATFORM_ADMIN"), { timeout: 60000 });
  await page.getByTestId("admin-tab").click();
  await page.waitForSelector("[data-testid='admin-operations-panel']", { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "05-admin-operations.png"), fullPage: true });

  await page.locator("select").first().selectOption(sessionId).catch(() => undefined);
  await page.locator("select").nth(1).selectOption({ index: 1 }).catch(() => undefined);
  await page.locator("button").filter({ hasText: /\uAC80\uC0C9/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "06-admin-audit-search.png"), fullPage: true });

  const join = await api("/api/v1/auth/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode, teamName: "P7-CEO-Demo" }),
  });
  await page.goto(`${BASE}/play?companyId=${join.json.companyId}`, { waitUntil: "domcontentloaded" });
  await page.evaluate((t) => localStorage.setItem("bsp_access_token", t), join.json.accessToken);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "07-ceo-play.png"), fullPage: true });

  console.log(`P7 screenshots saved to ${OUT}`);
  console.log(`Session: ${sessionId}, Join: ${joinCode}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});