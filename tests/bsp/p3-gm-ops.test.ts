/**
 * Sprint 3 P3 — GM Operations E2E scenarios
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import type { ExcelScenarioInput } from "./excel-regression-20.test";
import { EXCEL_SCENARIOS } from "./excel-regression-20.test";

const GM: GmActor = {
  userId: "gm-test",
  role: "GM",
  reason: "E2E test",
};

const MINIMAL: ExcelScenarioInput = {
  id: "MIN",
  name: "Minimal",
  loan: { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 },
  facility: { landPlotsPurchased: 0, machineBigPurchased: 0, machineSmallPurchased: 0 },
  hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
  material: { regionCode: "ASIA", perType: 0 },
  production: { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 },
  sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 0 },
};

function makeEngine() {
  const repos = createMemoryRepositories();
  return {
    engine: new GameEngine(
      repos,
      stepHandlerRegistry,
      new AccountingEngine(),
      new DashboardService(),
      new EventStoreService(repos.events)
    ),
    repos,
  };
}

async function submitStep(
  engine: GameEngine,
  companyId: string,
  step: "LOAN" | "FACILITY" | "HIRING" | "MATERIAL" | "PRODUCTION" | "SALES",
  scenario: ExcelScenarioInput
) {
  const payloads = {
    LOAN: scenario.loan,
    FACILITY: scenario.facility,
    HIRING: scenario.hiring,
    MATERIAL: {
      lines: [
        {
          regionCode: scenario.material.regionCode,
          materials: {
            A: scenario.material.perType,
            B: scenario.material.perType,
            C: scenario.material.perType,
            D: scenario.material.perType,
          },
        },
      ],
    },
    PRODUCTION: scenario.production,
    SALES: {
      lines: [{ regionCode: scenario.sales.regionCode, unitPriceManwon: scenario.sales.unitPriceManwon, qty: scenario.sales.qty }],
    },
  };
  const dash = await engine.getDashboard(companyId);
  await engine.submitDecision(companyId, step, payloads[step], dash.statusVersion);
}

async function runAllStepsForTeam(
  engine: GameEngine,
  sessionId: string,
  companyId: string,
  scenario: ExcelScenarioInput
) {
  const steps = ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const;
  for (const step of steps) {
    await submitStep(engine, companyId, step, scenario);
    await engine.gmAdvanceStep(sessionId, GM);
  }
}

describe("P3 GM Operations — E2E Scenarios", () => {
  beforeEach(() => resetMemoryState());

  it("Scenario 1: 10 teams normal progress", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-10Teams");
    const companies = [];
    for (let i = 1; i <= 10; i++) {
      const { company } = await engine.createCompany(`Team-${i}`, session.id);
      companies.push(company);
    }

    for (const company of companies) {
      await submitStep(engine, company.id, "LOAN", EXCEL_SCENARIOS[0]);
    }

    let desk = await engine.getGmDesk(session.id);
    expect(desk.totalTeamCount).toBe(10);
    expect(desk.submitRatePercent).toBe(100);
    expect(desk.unsubmittedTeamCount).toBe(0);

    await engine.gmAdvanceStep(session.id, GM);

    desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("STEP2_INVESTMENT");
  });

  it("Scenario 2: 2 teams not submitted", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Unsubmitted");
    const teams = [];
    for (let i = 1; i <= 5; i++) {
      const { company } = await engine.createCompany(`Team-${i}`, session.id);
      teams.push(company);
    }

    for (let i = 0; i < 3; i++) {
      await submitStep(engine, teams[i].id, "LOAN", MINIMAL);
    }

    const desk = await engine.getGmDesk(session.id);
    expect(desk.unsubmittedTeamCount).toBe(2);
    expect(desk.submitRatePercent).toBe(60);
    expect(desk.teams.filter((t) => t.warningStatus === "NOT_SUBMITTED")).toHaveLength(2);
  });

  it("Scenario 3: Pause then Resume", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Pause");
    const { company } = await engine.createCompany("Team-A", session.id);

    await engine.gmPauseSession(session.id, GM);
    let desk = await engine.getGmDesk(session.id);
    expect(desk.sessionPhase).toBe("PAUSED");

    await expect(
      engine.submitDecision(company.id, "LOAN", MINIMAL.loan, 0)
    ).rejects.toMatchObject({ code: "ERR_SESSION_PAUSED" });

    await engine.gmResumeSession(session.id, GM);
    desk = await engine.getGmDesk(session.id);
    expect(desk.sessionPhase).toBe("RUNNING");

    const audit = await engine.getGmAuditLog(session.id);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.PAUSE)).toBe(true);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.RESUME)).toBe(true);
  });

  it("Scenario 4: Force Submit", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Force");
    const { company: c1 } = await engine.createCompany("Team-A", session.id);
    const { company: c2 } = await engine.createCompany("Team-B", session.id);

    await submitStep(engine, c1.id, "LOAN", MINIMAL);

    const result = await engine.gmForceSubmit(session.id, GM, c2.id);
    expect(result.submitted).toHaveLength(1);
    expect(result.submitted[0].companyId).toBe(c2.id);

    const desk = await engine.getGmDesk(session.id);
    expect(desk.submitRatePercent).toBe(100);

    const audit = await engine.getGmAuditLog(session.id);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.FORCE_SUBMIT)).toBe(true);
  });

  it("Scenario 5: Zero Submit", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Zero");
    await engine.createCompany("Team-A", session.id);
    await engine.createCompany("Team-B", session.id);
    await engine.createCompany("Team-C", session.id);

    const result = await engine.gmZeroSubmit(session.id, GM);
    expect(result.submitted).toHaveLength(3);
    expect(result.step).toBe("LOAN");

    const desk = await engine.getGmDesk(session.id);
    expect(desk.submitRatePercent).toBe(100);

    const audit = await engine.getGmAuditLog(session.id);
    expect(audit.filter((a) => a.action === GM_AUDIT_ACTIONS.ZERO_SUBMIT).length).toBeGreaterThanOrEqual(1);
  });

  it("Scenario 6: Close period (half-year end)", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Close");
    const { company } = await engine.createCompany("Team-A", session.id);

    await runAllStepsForTeam(engine, session.id, company.id, EXCEL_SCENARIOS[0]);

    let desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("STEP7_SETTLEMENT");

    const close = await engine.closePeriod(session.id, {}, GM);
    expect(close.stepPhase).toBe("HALF_YEAR_END");

    desk = await engine.getGmDesk(session.id);
    expect(desk.stepPhase).toBe("HALF_YEAR_END");
    expect(desk.canStartNextHalf).toBe(true);

    const audit = await engine.getGmAuditLog(session.id);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.CLOSE_PERIOD)).toBe(true);
  });

  it("Scenario 7: Start next half", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-NextHalf");
    const { company } = await engine.createCompany("Team-A", session.id);

    await runAllStepsForTeam(engine, session.id, company.id, MINIMAL);
    await engine.closePeriod(session.id, {}, GM);

    const next = await engine.startNextHalf(session.id, GM);
    expect(next.periodIndex).toBe(2);
    expect(next.stepPhase).toBe("STEP1_FINANCE");

    const desk = await engine.getGmDesk(session.id);
    expect(desk.periodIndex).toBe(2);

    const audit = await engine.getGmAuditLog(session.id);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.START_NEXT_HALF)).toBe(true);
  });

  it("Scenario 8: Game end", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-GameEnd");
    const { company } = await engine.createCompany("Team-A", session.id);

    for (let p = 1; p <= 6; p++) {
      await runAllStepsForTeam(engine, session.id, company.id, p === 1 ? EXCEL_SCENARIOS[0] : MINIMAL);
      await engine.closePeriod(session.id, {}, GM);
      if (p < 6) {
        await engine.startNextHalf(session.id, GM);
      }
    }

    const end = await engine.gameEnd(session.id, GM);
    expect(end.sessionPhase).toBe("FINISHED");

    const desk = await engine.getGmDesk(session.id);
    expect(desk.sessionPhase).toBe("FINISHED");
    expect(desk.stepPhase).toBe("GAME_END");

    const audit = await engine.getGmAuditLog(session.id);
    expect(audit.some((a) => a.action === GM_AUDIT_ACTIONS.GAME_END)).toBe(true);
  });

  it("Lock / Unlock step blocks CEO submit", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Lock");
    const { company } = await engine.createCompany("Team-A", session.id);

    await engine.gmLockStep(session.id, GM);
    await expect(
      engine.submitDecision(company.id, "LOAN", MINIMAL.loan, 0)
    ).rejects.toMatchObject({ code: "ERR_STEP_LOCKED" });

    await engine.gmUnlockStep(session.id, GM);
    await submitStep(engine, company.id, "LOAN", MINIMAL);
  });

  it("Reopen step removes decisions and goes back", async () => {
    const { engine } = makeEngine();
    const session = await engine.createSession("P3-Reopen");
    const { company } = await engine.createCompany("Team-A", session.id);

    await submitStep(engine, company.id, "LOAN", MINIMAL);
    await engine.gmAdvanceStep(session.id, GM);
    await submitStep(engine, company.id, "FACILITY", MINIMAL);
    await engine.gmAdvanceStep(session.id, GM);

    expect((await engine.getGmDesk(session.id)).stepPhase).toBe("STEP3_HR");

    const reopened = await engine.gmReopenStep(session.id, GM);
    expect(reopened.stepPhase).toBe("STEP2_INVESTMENT");

    const desk = await engine.getGmDesk(session.id);
    expect(desk.unsubmittedTeamCount).toBe(1);
  });
});
