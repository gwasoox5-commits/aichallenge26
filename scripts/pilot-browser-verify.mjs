/**
 * Pilot browser verification — admin + learner E2E with screenshots.
 * Run: node scripts/pilot-browser-verify.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "docs/pilot/screenshots/verify");
const ADMIN_PASSWORD = process.env.BSP_ADMIN_PASSWORD ?? "bsp-admin-dev";
const results = [];

function log(step, ok, detail = "") {
  results.push({ step, ok, detail, at: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${step}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function waitForRealtime(page, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await page.locator("header").innerText().catch(() => "");
    if (text.includes("실시간 연결됨")) return "connected";
    if (text.includes("연결 실패")) return "failed";
    if (text.includes("재연결 중")) return "reconnecting";
    await page.waitForTimeout(400);
  }
  return "timeout";
}

async function seedAdminSession(page) {
  const login = await api("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  if (!login.ok) throw new Error(`login failed ${login.status}`);

  const demo = await api("/api/v1/pilot/demo-session", {
    method: "POST",
    headers: { Authorization: `Bearer ${login.data.accessToken}` },
  });
  if (!demo.ok) throw new Error(`demo failed ${demo.status}`);

  const { sessionId, joinCode, gmAccessToken } = demo.data;
  const joinUrl = `${BASE}/join?code=${joinCode}`;

  await page.addInitScript(
    ({ sid, token }) => {
      localStorage.setItem("bsp_access_token", token);
      localStorage.setItem("bsp_admin_session_id", sid);
    },
    { sid: sessionId, token: gmAccessToken }
  );

  return { sessionId, joinCode, joinUrl, gmAccessToken, adminToken: login.data.accessToken };
}

async function joinLearner(joinCode, teamName) {
  const res = await api("/api/v1/auth/join", {
    method: "POST",
    body: JSON.stringify({ joinCode, teamName }),
  });
  return res;
}

async function confirmGmAction(page, confirmLabel, reason = "pilot verify") {
  const dialog = page.locator(".fixed.inset-0.z-50 .rounded-xl");
  if (!(await dialog.isVisible().catch(() => false))) return false;
  await dialog.locator("textarea").fill(reason);
  await dialog.getByRole("button", { name: confirmLabel }).click();
  await page.waitForTimeout(2000);
  return true;
}

async function clickGmButton(page, label, confirmLabel) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.getByRole("button", { name: label, exact: true }).click();
  await confirmGmAction(page, confirmLabel);
}

async function fireFirstEvent(sessionId, gmToken) {
  const cat = await api("/api/v1/gm/events/catalog", {
    headers: { Authorization: `Bearer ${gmToken}` },
  });
  const template = cat.data.catalog?.[0];
  if (!template) return { ok: false, detail: "no catalog" };
  const fire = await api(`/api/v1/gm/sessions/${sessionId}/events/fire`, {
    method: "POST",
    headers: { Authorization: `Bearer ${gmToken}` },
    body: JSON.stringify({ templateId: template.eventId, applyTiming: "IMMEDIATE", reason: "pilot verify" }),
  });
  return { ok: fire.ok, detail: template.title, data: fire.data };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const admin = await ctx.newPage();
  const wsLog = [];
  admin.on("websocket", (ws) => {
    const url = ws.url();
    if (url.includes("/api/v1/ws")) {
      wsLog.push({ url: url.replace(/token=[^&]+/, "token=***"), event: "open", time: Date.now() });
      ws.on("close", (code) => wsLog.push({ event: "close", code, time: Date.now() }));
    }
  });

  let session = null;

  try {
    session = await seedAdminSession(admin);

    // ① Admin login (via stored token → /admin)
    await admin.goto(`${BASE}/admin`);
    await admin.waitForLoadState("networkidle");
    await admin.screenshot({ path: join(OUT, "01-admin-login.png"), fullPage: true });
    log("① 관리자 로그인", admin.url().includes("/admin"), admin.url());

    // ② Demo session
    await admin.screenshot({ path: join(OUT, "02-demo-session.png"), fullPage: true });
    const joinVisible = await admin.locator(`text=${session.joinCode.slice(0, 8)}`).count().catch(() => 0);
    log("② 데모 세션 생성", !!session.sessionId, `session=${session.sessionId.slice(0, 8)} joinVisible=${joinVisible}`);

    // ③ Realtime
    await admin.waitForTimeout(2000);
    const rt1 = await waitForRealtime(admin, 25000);
    await admin.screenshot({ path: join(OUT, "03-realtime-status.png"), fullPage: true });
    log("③ 실시간 연결됨", rt1 === "connected", `${rt1}, wsAttempts=${wsLog.length}`);

    // ④ Two learners
    const l1 = await joinLearner(session.joinCode, "Alpha");
    const l2 = await joinLearner(session.joinCode, "Bravo");
    const learnerCtx1 = await browser.newContext();
    const learnerCtx2 = await browser.newContext();
    const learner1 = await learnerCtx1.newPage();
    const learner2 = await learnerCtx2.newPage();
    for (const [page, token, file] of [
      [learner1, l1.data.accessToken, "04-learner1-play.png"],
      [learner2, l2.data.accessToken, "04-learner2-play.png"],
    ]) {
      await page.addInitScript((t) => localStorage.setItem("bsp_access_token", t), token);
      await page.goto(`${BASE}/play`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: join(OUT, file), fullPage: true });
    }
    log("④ 학습자 2 브라우저 접속", l1.ok && l2.ok, `Alpha=${l1.ok} Bravo=${l2.ok}`);

    // ⑤ Event publish (API — GM fire)
    const fired = await fireFirstEvent(session.sessionId, session.gmAccessToken);
    await admin.waitForTimeout(1500);
    await admin.screenshot({ path: join(OUT, "05-event-publish.png"), fullPage: true });
    log("⑤ 이벤트 Publish", fired.ok, fired.detail ?? "");

    // ⑥ Breaking news
    await learner1.waitForTimeout(2500);
    await learner2.waitForTimeout(2500);
    const news1 = await learner1.locator("text=/Breaking|뉴스|News|이벤트|발화/i").count();
    const news2 = await learner2.locator("text=/Breaking|뉴스|News|이벤트|발화/i").count();
    await learner1.screenshot({ path: join(OUT, "06-learner1-news.png"), fullPage: true });
    await learner2.screenshot({ path: join(OUT, "06-learner2-news.png"), fullPage: true });
    log("⑥ Breaking News 수신", news1 > 0 || news2 > 0, `L1=${news1} L2=${news2}`);

    // ⑦ Refresh
    await admin.reload();
    await admin.waitForLoadState("networkidle");
    const rt2 = await waitForRealtime(admin, 25000);
    await admin.screenshot({ path: join(OUT, "07-admin-refresh.png"), fullPage: true });
    await learner1.reload();
    await learner2.reload();
    await learner1.waitForTimeout(2000);
    await learner1.screenshot({ path: join(OUT, "07-learner1-refresh.png"), fullPage: true });
    log("⑦ 새로고침 후 연결 유지", rt2 === "connected", `admin=${rt2}`);

    // ⑧ Next step
    await clickGmButton(admin, "다음 Step", "진행");
    await admin.screenshot({ path: join(OUT, "08-next-step.png"), fullPage: true });
    log("⑧ 다음 Step 진행", true);

    // ⑨ Settlement
    await clickGmButton(admin, "반기 결산", "결산 실행");
    await admin.screenshot({ path: join(OUT, "09-settlement.png"), fullPage: true });
    log("⑨ 반기 결산", true);

    // ⑩ Next period
    const nextHalfBtn = admin.getByRole("button", { name: "다음 반기", exact: true });
    if (await nextHalfBtn.isEnabled().catch(() => false)) {
      await clickGmButton(admin, "다음 반기", "시작");
    }
    const rt3 = await waitForRealtime(admin, 20000);
    await admin.screenshot({ path: join(OUT, "10-next-period.png"), fullPage: true });
    log("⑩ 다음 반기 연결 유지", rt3 === "connected", rt3);

    // Failure recovery
    await admin.reload();
    const rtA = await waitForRealtime(admin, 20000);
    await admin.screenshot({ path: join(OUT, "11-recovery-admin-refresh.png"), fullPage: true });
    log("복구: 관리자 새로고침", rtA === "connected", rtA);

    await learner1.reload();
    await learner1.waitForTimeout(2000);
    await learner1.screenshot({ path: join(OUT, "11-recovery-learner-refresh.png"), fullPage: true });
    log("복구: 학습자 새로고침", true);

    // Network flap: block WS briefly then restore
    await admin.route("**/api/v1/ws**", (route) => route.abort());
    await admin.waitForTimeout(3000);
    await admin.unroute("**/api/v1/ws**");
    const rtFlap = await waitForRealtime(admin, 25000);
    await admin.screenshot({ path: join(OUT, "12-recovery-network-flap.png"), fullPage: true });
    log("복구: 네트워크 일시 끊김", rtFlap === "connected", rtFlap);

    // GM token re-issue
    const gmRe = await api(`/api/v1/gm/sessions/${session.sessionId}/gm-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.adminToken}` },
    });
    if (gmRe.ok) {
      await admin.evaluate((t) => {
        localStorage.setItem("bsp_access_token", t);
        window.dispatchEvent(new CustomEvent("bsp-auth-changed"));
      }, gmRe.data.gmAccessToken);
      const rtGm = await waitForRealtime(admin, 30000);
      await admin.screenshot({ path: join(OUT, "13-recovery-gm-token.png"), fullPage: true });
      log("복구: GM 토큰 재발급", rtGm === "connected" || rtGm === "reconnecting", rtGm);
    } else {
      log("복구: GM 토큰 재발급", false, String(gmRe.status));
    }

    await learnerCtx1.close();
    await learnerCtx2.close();
  } catch (e) {
    log("FATAL", false, e.message);
    await admin.screenshot({ path: join(OUT, "error.png"), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
    await writeFile(join(OUT, "results.json"), JSON.stringify({ results, wsLog }, null, 2));
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    console.log(`Screenshots: ${OUT}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

main();
