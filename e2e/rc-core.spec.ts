import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const ADMIN_PASSWORD = process.env.BSP_ADMIN_PASSWORD ?? "admin10193";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder("비밀번호 입력").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/admin**");
}

async function learnerJoin(page: Page, code: string, teamName: string) {
  await page.goto(`/join?code=${code}`);
  const confirmBtn = page.getByRole("button", { name: "세션 확인" });
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
  await expect(page.locator(".rounded-lg.bg-indigo-50, .text-indigo-900").first()).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("예: Alpha").fill(teamName);
  const joinBtn = page.getByRole("button", { name: "입장하기" });
  await expect(joinBtn).toBeEnabled({ timeout: 10_000 });
  await joinBtn.click();
  await page.waitForURL("**/play**", { timeout: 20_000 });
}

test.describe.serial("BSP RC core browser E2E", () => {
  let joinCode = "";
  let sessionId = "";
  let adminContext: BrowserContext;
  let learnerContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    learnerContext = await browser.newContext();
  });

  test.afterAll(async () => {
    await adminContext?.close();
    await learnerContext?.close();
  });

  test("E2E-1 admin login → session wizard → GM dashboard → realtime connected", async () => {
    const page = await adminContext.newPage();

    page.on("response", async (res) => {
      if (res.url().includes("/api/v1/gm/sessions") && res.request().method() === "POST" && res.ok()) {
        const json = (await res.json()) as { sessionId?: string; joinCode?: string };
        if (json.sessionId) sessionId = json.sessionId;
        if (json.joinCode) joinCode = json.joinCode;
      }
    });

    await adminLogin(page);
    await page.goto("/admin/sessions/new");
    await page.locator('label:has-text("세션명") input').fill("E2E RC Session");
    await page.getByRole("button", { name: "다음" }).click();
    await page.locator('label:has-text("단계별 제한시간") input').fill("900");
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "세션 생성" }).click();

    await expect(page.getByText("세션 생성 완료")).toBeVisible({ timeout: 20_000 });
    if (!joinCode) {
      joinCode = ((await page.locator("dd.font-mono").first().textContent()) ?? "").trim();
    }
    expect(joinCode.length).toBe(5);
    expect(sessionId.length).toBeGreaterThan(0);

    await page.goto("/admin/control");
    await expect(page.getByTestId("realtime-connection-state")).toBeVisible({ timeout: 20_000 });
    await page.close();
  });

  test("E2E-2 learner join → play → step submit → waiting", async () => {
    test.skip(!joinCode, "Session not created in E2E-1");
    const page = await learnerContext.newPage();
    await learnerJoin(page, joinCode, "E2E-Alpha");
    await expect(page.getByTestId("ceo-command-dashboard")).toBeVisible();
    await page.getByRole("button", { name: "Submit Step 1" }).click();
    await expect(page.getByRole("heading", { name: "제출 완료" })).toBeVisible({ timeout: 15_000 });
    await page.close();
  });

  test("E2E-3 GM step advance → learner step updates without refresh", async () => {
    test.skip(!sessionId || !joinCode, "Session not created");
    const learnerPage = await learnerContext.newPage();
    await learnerJoin(learnerPage, joinCode, "E2E-Bravo");
    await expect(learnerPage.getByTestId("ceo-command-dashboard")).toBeVisible({ timeout: 15_000 });

    const adminPage = await adminContext.newPage();
    await adminLogin(adminPage);
    const advance = await adminPage.request.post(`/api/v1/gm/sessions/${sessionId}/advance-step`, {
      data: {},
    });
    expect(advance.ok()).toBeTruthy();

    await expect(learnerPage.getByRole("button", { name: "Submit Step 2" })).toBeVisible({ timeout: 25_000 });
    await learnerPage.close();
    await adminPage.close();
  });

  test("E2E-4 GM catalog event → learner breaking news", async () => {
    test.skip(!sessionId || !joinCode, "Session id unavailable");
    const learnerPage = await learnerContext.newPage();
    await learnerJoin(learnerPage, joinCode, "E2E-Charlie");

    const adminPage = await adminContext.newPage();
    await adminLogin(adminPage);
    const fireRes = await adminPage.request.post(`/api/v1/gm/sessions/${sessionId}/events/fire`, {
      data: { templateId: "EVT-001", applyTiming: "IMMEDIATE" },
    });
    expect(fireRes.ok()).toBeTruthy();

    await expect(learnerPage.getByText(/뉴스|News|속보|Breaking|환율/i).first()).toBeVisible({ timeout: 25_000 });
    await learnerPage.close();
    await adminPage.close();
  });

  test("E2E-5 financial statements show balance OK on play dashboard", async () => {
    test.skip(!joinCode, "Session not created");
    const page = await learnerContext.newPage();
    await learnerJoin(page, joinCode, "E2E-Delta");
    await expect(page.getByTestId("ceo-command-dashboard")).toBeVisible();
    await page.getByText("재무제표").first().scrollIntoViewIfNeeded();
    await expect(page.getByText("B/S 균형 OK")).toBeVisible({ timeout: 20_000 });
    await page.close();
  });

  test("E2E-6 browser refresh restores learner session", async () => {
    test.skip(!joinCode, "Session not created");
    const page = await learnerContext.newPage();
    await learnerJoin(page, joinCode, "E2E-Echo");
    await expect(page.getByTestId("ceo-command-dashboard")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("ceo-command-dashboard")).toBeVisible({ timeout: 15_000 });
    await page.close();
  });

  test("E2E-7 GM close period settlement visible to learner", async () => {
    test.skip(!sessionId || !joinCode, "Session not created");
    const adminPage = await adminContext.newPage();
    await adminLogin(adminPage);

    for (let i = 0; i < 14; i++) {
      const deskRes = await adminPage.request.get(`/api/v1/gm/sessions/${sessionId}/desk`);
      expect(deskRes.ok()).toBeTruthy();
      const desk = (await deskRes.json()) as { stepPhase?: string };
      if (desk.stepPhase === "STEP7_SETTLEMENT") break;
      const zero = await adminPage.request.post(`/api/v1/gm/sessions/${sessionId}/zero-submit`, { data: {} });
      expect(zero.ok()).toBeTruthy();
      const adv = await adminPage.request.post(`/api/v1/gm/sessions/${sessionId}/advance-step`, { data: {} });
      expect(adv.ok()).toBeTruthy();
    }

    const deskBeforeClose = await adminPage.request.get(`/api/v1/gm/sessions/${sessionId}/desk`);
    const deskJson = (await deskBeforeClose.json()) as { stepPhase?: string };
    expect(deskJson.stepPhase).toBe("STEP7_SETTLEMENT");

    const closeRes = await adminPage.request.post(`/api/v1/gm/sessions/${sessionId}/close-period`, { data: {} });
    expect(closeRes.ok()).toBeTruthy();
    const closed = (await closeRes.json()) as { stepPhase?: string };
    expect(closed.stepPhase).toBe("HALF_YEAR_END");

    const learnerPage = await learnerContext.newPage();
    await learnerJoin(learnerPage, joinCode, "E2E-Foxtrot");
    await expect(learnerPage.getByText(/HALF YEAR END|반기 종료/i).first()).toBeVisible({ timeout: 25_000 });
    await learnerPage.close();
    await adminPage.close();
  });

});
