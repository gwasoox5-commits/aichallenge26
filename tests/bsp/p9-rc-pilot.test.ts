/**
 * Sprint 3 P9 — Release Candidate E2E Pilot
 * Join → 6 half-years → game end → debrief-ready state (engine/API fast path)
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { resetAuditState } from "@/src/bsp/infrastructure/memory/memory-audit-repository";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { GM_AUDIT_ACTIONS, type GmActor } from "@/src/bsp/domain/gm/audit-types";
import { TOTAL_PERIODS } from "@/src/bsp/domain/period/period-calendar";
import {
  EXCEL_SCENARIOS,
  runExcelScenario,
  type ExcelScenarioInput,
} from "./excel-regression-20.test";

const GM: GmActor = { userId: "gm-p9", role: "GM", reason: "P9 RC pilot" };

const MINIMAL_HALF: ExcelScenarioInput = {
  id: "MIN",
  name: "Minimal carry-forward",
  loan: { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 },
  facility: { landPlotsPurchased: 0, machineBigPurchased: 0, machineSmallPurchased: 0 },
  hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
  material: { regionCode: "ASIA", perType: 0 },
  production: { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 },
  sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 0 },
};

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

async function submitHalfYearSteps(
  engine: GameEngine,
  sessionId: string,
  companies: Array<{ id: string }>,
  scenario: ExcelScenarioInput
) {
  const steps = [
    { step: "LOAN" as const, payload: scenario.loan },
    { step: "FACILITY" as const, payload: scenario.facility },
    { step: "HIRING" as const, payload: scenario.hiring },
    {
      step: "MATERIAL" as const,
      payload: {
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
    },
    { step: "PRODUCTION" as const, payload: scenario.production },
    {
      step: "SALES" as const,
      payload: {
        lines: [
          {
            regionCode: scenario.sales.regionCode,
            unitPriceManwon: scenario.sales.unitPriceManwon,
            qty: scenario.sales.qty,
          },
        ],
      },
    },
  ];

  for (const s of steps) {
    for (const company of companies) {
      const dash = await engine.getDashboard(company.id);
      await engine.submitDecision(company.id, s.step, s.payload, dash.statusVersion);
    }
    await engine.gmAdvanceStep(sessionId, GM);
  }
}

describe("P9 RC Pilot — E2E", () => {
  beforeEach(() => {
    resetMemoryState();
    resetAuditState();
  });

  it("full pilot: join 3 teams → 6 periods → game end with audit trail", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("P9-RC-Pilot");
    expect(session.joinCode).toMatch(/^[A-Z0-9]{5}$/);

    const teams = [];
    for (const name of ["Team-Alpha", "Team-Beta", "Team-Gamma"]) {
      const { company } = await engine.joinGame(session.joinCode, name);
      teams.push(company);
    }
    expect(teams).toHaveLength(3);

    await engine.fireEvent(session.id, "EVT-001", "IMMEDIATE", GM);
    await engine.patchEconomy(
      session.id,
      { patch: { rawMaterialIndex: 110 }, applyTiming: "IMMEDIATE" },
      GM
    );

    const scenarioH1 = EXCEL_SCENARIOS[0];
    for (let period = 1; period <= TOTAL_PERIODS; period++) {
      const scenario = period === 1 ? scenarioH1 : MINIMAL_HALF;
      await submitHalfYearSteps(engine, session.id, teams, scenario);

      const beforeClose = await engine.getGmDesk(session.id);
      expect(beforeClose.stepPhase).toBe("STEP7_SETTLEMENT");
      expect(beforeClose.periodIndex).toBe(period);

      await engine.closePeriod(session.id, {}, GM);

      const desk = await engine.getGmDesk(session.id);
      expect(desk.stepPhase).toBe("HALF_YEAR_END");
      expect(desk.periodIndex).toBe(period);
      expect(desk.teams).toHaveLength(3);
      expect(desk.teams.every((t) => t.submittedSteps.includes("SALES"))).toBe(true);

      if (period < TOTAL_PERIODS) {
        await engine.startNextHalf(session.id, GM);
        const next = await engine.getGmDesk(session.id);
        expect(next.periodIndex).toBe(period + 1);
        expect(next.stepPhase).toBe("STEP1_FINANCE");
      }
    }

    const end = await engine.gameEnd(session.id, GM);
    expect(end.sessionPhase).toBe("FINISHED");
    expect(end.stepPhase).toBe("GAME_END");

    const finalDesk = await engine.getGmDesk(session.id);
    expect(finalDesk.sessionPhase).toBe("FINISHED");
    for (const team of teams) {
      const dash = await engine.getDashboard(team.id);
      expect(dash.settlementComplete).toBe(true);
    }

    const audit = await engine.searchAdminAudit({ sessionId: session.id, limit: 500 });
    const actions = new Set(audit.entries.map((e) => e.action));
    expect(actions.has(GM_AUDIT_ACTIONS.JOIN)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.DECISION_SUBMIT)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.STEP_ADVANCE)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.CLOSE_PERIOD)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.SETTLEMENT)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.START_NEXT_HALF)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.GAME_END)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.EVENT_FIRED)).toBe(true);
    expect(actions.has(GM_AUDIT_ACTIONS.ECONOMY_CHANGE)).toBe(true);
    expect(audit.entries.length).toBeGreaterThan(50);
  });

  it("excel regression reference: golden scenario S01 still 100% parity", async () => {
    const result = await runExcelScenario(EXCEL_SCENARIOS[0]);
    expect(result.pass).toBe(true);
    expect(result.deltas).toHaveLength(0);
  });

  it("performance: 100 teams × 1000 submits extrapolation under thresholds", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("P9-Perf-1000");
    const companies = [];
    for (let i = 0; i < 100; i++) {
      companies.push((await engine.createCompany(`Perf-${i}`, session.id)).company);
    }

    const steps = ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const;
    const times: number[] = [];
    for (const step of steps) {
      for (const company of companies) {
        const dash = await engine.getDashboard(company.id);
        const t0 = performance.now();
        const payload =
          step === "LOAN"
            ? { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 }
            : step === "FACILITY"
              ? { landPlotsPurchased: 0, machineBigPurchased: 0, machineSmallPurchased: 0 }
              : step === "HIRING"
                ? { headPurchase: 1, headProduction: 1, headSales: 1 }
                : step === "MATERIAL"
                  ? {
                      lines: [{ regionCode: "ASIA", materials: { A: 0, B: 0, C: 0, D: 0 } }],
                    }
                  : step === "PRODUCTION"
                    ? { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 }
                    : { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 0 }] };
        await engine.submitDecision(company.id, step, payload, dash.statusVersion);
        times.push(performance.now() - t0);
      }
      await engine.gmAdvanceStep(session.id, GM);
    }

    expect(times.length).toBe(600);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    expect(avg).toBeLessThan(200);
    expect(max).toBeLessThan(500);
    // Linear extrapolation: 600 submits × (1000/600) ≈ 1000 at same avg
    expect(avg * (1000 / times.length)).toBeLessThan(200);
  });

  it("performance: 100 settlements via closePeriod under 5s", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("P9-Settle-100");
    const companies = [];
    for (let i = 0; i < 100; i++) {
      companies.push((await engine.createCompany(`Settle-${i}`, session.id)).company);
    }

    const start = performance.now();
    for (const step of ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"] as const) {
      for (const company of companies) {
        const dash = await engine.getDashboard(company.id);
        const payload =
          step === "LOAN"
            ? { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 }
            : step === "FACILITY"
              ? { landPlotsPurchased: 0, machineBigPurchased: 0, machineSmallPurchased: 0 }
              : step === "HIRING"
                ? { headPurchase: 1, headProduction: 1, headSales: 1 }
                : step === "MATERIAL"
                  ? {
                      lines: [{ regionCode: "ASIA", materials: { A: 0, B: 0, C: 0, D: 0 } }],
                    }
                  : step === "PRODUCTION"
                    ? { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 }
                    : { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 0 }] };
        await engine.submitDecision(company.id, step, payload, dash.statusVersion);
      }
      await engine.gmAdvanceStep(session.id, GM);
    }
    await engine.closePeriod(session.id, {}, GM);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
