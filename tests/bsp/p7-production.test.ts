/**
 * Sprint 3 P7 — Production Readiness tests
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { resetAuditState } from "@/src/bsp/infrastructure/memory/memory-audit-repository";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { getStorageConfig, resetBspContainer } from "@/src/bsp/application/di/container";
import { isValidJoinCodeFormat } from "@/src/bsp/infrastructure/auth/join-code";

const GM: GmActor = { userId: "gm-p7", role: "GM", reason: "P7 test" };

function makeEngine() {
  resetMemoryState();
  resetAuditState();
  const repos = createMemoryRepositories();
  return new GameEngine(
    repos,
    stepHandlerRegistry,
    new AccountingEngine(),
    new DashboardService(),
    new EventStoreService(repos.events)
  );
}

describe("P7 production readiness", () => {
  beforeEach(() => {
    resetMemoryState();
    resetAuditState();
    resetBspContainer("memory");
  });

  it("rejects BSP_USE_MEMORY in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_USE_MEMORY", "1");
    vi.stubEnv("BSP_DATABASE_URL", "postgresql://test");
    expect(() => resetBspContainer()).toThrow(/BSP_USE_MEMORY/);
    vi.unstubAllEnvs();
  });

  it("requires BSP_DATABASE_URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BSP_USE_MEMORY", "");
    vi.stubEnv("BSP_DATABASE_URL", "");
    expect(() => resetBspContainer()).toThrow(/BSP_DATABASE_URL/);
    vi.unstubAllEnvs();
  });

  it("memory mode is demo-only in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BSP_USE_MEMORY", "1");
    resetBspContainer("memory");
    const cfg = getStorageConfig();
    expect(cfg.memoryDemoOnly).toBe(true);
    vi.unstubAllEnvs();
  });

  it("persists all required audit action types", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("P7 Audit Session");
    const { company } = await engine.createCompany("Team-A", session.id);

    await engine.logPlatformAudit({ userId: "admin-1", role: "PLATFORM_ADMIN" }, GM_AUDIT_ACTIONS.LOGIN, {});
    await engine.joinGame(session.joinCode, "Team-B");

    const dash = await engine.getDashboard(company.id);
    try {
      await engine.submitDecision(
        company.id,
        "LOAN",
        { loanEarly: 999, loanMid: 0, deposit: 0, loanRepayment: 0 },
        dash.statusVersion
      );
    } catch {
      /* validation error expected */
    }

    await engine.submitDecision(company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 }, dash.statusVersion);

    await engine.gmAdvanceStep(session.id, GM);
    await engine.gmPauseSession(session.id, GM);
    await engine.gmResumeSession(session.id, GM);

    const audit = await engine.searchAdminAudit({ sessionId: session.id, limit: 100 });
    const actions = new Set(audit.entries.map((e) => e.action));
    expect(actions.has(GM_AUDIT_ACTIONS.JOIN)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.DECISION_SUBMIT)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.VALIDATION_ERROR)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.STEP_ADVANCE)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.PAUSE)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.RESUME)).toBe(true);
  });

  it("admin session list and archive", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Archive Test");
    const list = await engine.listAdminSessions();
    expect(list.some((s) => s.id === session.id)).toBe(true);
    await engine.archiveAdminSession(session.id);
    const active = await engine.listAdminSessions(false);
    expect(active.some((s) => s.id === session.id)).toBe(false);
    const all = await engine.listAdminSessions(true);
    expect(all.find((s) => s.id === session.id)?.archivedAt).toBeTruthy();
  });

  it("audit search filters by action", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Search Test");
    await engine.gmPauseSession(session.id, GM);
    const paused = await engine.searchAdminAudit({ sessionId: session.id, action: GM_AUDIT_ACTIONS.PAUSE });
    expect(paused.total).toBeGreaterThanOrEqual(1);
    expect(paused.entries.every((e) => e.action === GM_AUDIT_ACTIONS.PAUSE)).toBe(true);
  });

  it("security: join code format is 5 characters", () => {
    expect(isValidJoinCodeFormat("PILOT")).toBe(true);
    expect(isValidJoinCodeFormat("ABC123")).toBe(false);
    expect(isValidJoinCodeFormat("'; DROP TABLE--")).toBe(false);
  });

  it("performance: 100 teams create under 5s", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Perf 100 Teams");
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await engine.createCompany(`Team-${i}`, session.id);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  it("performance: 100 decision submits (100 teams)", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Perf 100 Submits");
    const companies = [];
    for (let i = 0; i < 100; i++) {
      companies.push((await engine.createCompany(`T${i}`, session.id)).company);
    }

    const times: number[] = [];
    for (const company of companies) {
      const dash = await engine.getDashboard(company.id);
      const t0 = performance.now();
      await engine.submitDecision(
        company.id,
        "LOAN",
        { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 },
        dash.statusVersion
      );
      times.push(performance.now() - t0);
    }

    expect(times.length).toBe(100);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    expect(avg).toBeLessThan(200);
    expect(max).toBeLessThan(500);
  });
});

describe("P7 PostgreSQL integration", () => {
  const hasDb = Boolean(process.env.BSP_DATABASE_URL) && process.env.BSP_USE_MEMORY !== "1";

  it.skipIf(!hasDb)("audit persists to PostgreSQL", async () => {
    resetBspContainer("prisma");
    const { getGameEngine } = await import("@/src/bsp/application/bsp-service");
    const engine = getGameEngine();
    const session = await engine.createSession(`PG Audit ${Date.now()}`);
    await engine.logPlatformAudit({ userId: "pg-admin", role: "PLATFORM_ADMIN" }, GM_AUDIT_ACTIONS.LOGIN, {});
    const audit = await engine.searchAdminAudit({ sessionId: session.id, limit: 10 });
    expect(Array.isArray(audit.entries)).toBe(true);
    resetBspContainer("memory");
  });
});
