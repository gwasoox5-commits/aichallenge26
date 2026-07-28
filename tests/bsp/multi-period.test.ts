/**
 * Sprint 3 — Multi-period engine (6 half-years)
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { TOTAL_PERIODS } from "@/src/bsp/domain/period/period-calendar";
import type { ExcelScenarioInput } from "./excel-regression-20.test";
import { EXCEL_SCENARIOS } from "./excel-regression-20.test";

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
  const repos = createMemoryRepositories();
  return new GameEngine(
    repos,
    stepHandlerRegistry,
    new AccountingEngine(),
    new DashboardService(),
    new EventStoreService(repos.events)
  );
}

async function runHalfYearSteps(
  engine: GameEngine,
  sessionId: string,
  companyId: string,
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
    const dash = await engine.getDashboard(companyId);
    await engine.submitDecision(companyId, s.step, s.payload, dash.statusVersion);
    await engine.gmAdvanceStep(sessionId);
  }
  await engine.closePeriod(sessionId, scenario.miscIncome ? { [companyId]: scenario.miscIncome } : {});
}

describe("Multi-period engine — Sprint 3", () => {
  beforeEach(() => resetMemoryState());

  it("runs 6 half-years with carry-forward and game end", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Sprint3-6Half");
    const { company } = await engine.createCompany("Team-A", session.id);
    const scenarioH1 = EXCEL_SCENARIOS[0];
    let cashAfterH1 = 0;

    for (let period = 1; period <= TOTAL_PERIODS; period++) {
      const scenario = period === 1 ? scenarioH1 : MINIMAL_HALF;
      await runHalfYearSteps(engine, session.id, company.id, scenario);
      const desk = await engine.getGmDesk(session.id);
      expect(desk.stepPhase).toBe("HALF_YEAR_END");
      expect(desk.periodIndex).toBe(period);

      const dash = await engine.getDashboard(company.id);
      expect(dash.settlementComplete).toBe(true);
      if (period === 1) cashAfterH1 = dash.cashManwon;

      if (period < TOTAL_PERIODS) {
        await engine.startNextHalf(session.id);
        const after = await engine.getGmDesk(session.id);
        expect(after.periodIndex).toBe(period + 1);
        expect(after.stepPhase).toBe("STEP1_FINANCE");
        const nextDash = await engine.getDashboard(company.id);
        expect(nextDash.settlementComplete).toBe(false);
        expect(nextDash.completedSteps).toHaveLength(0);
        if (period === 1) {
          expect(nextDash.cashManwon).toBe(cashAfterH1);
        }
      } else {
        const end = await engine.gameEnd(session.id);
        expect(end.sessionPhase).toBe("FINISHED");
        expect(end.stepPhase).toBe("GAME_END");
      }
    }
  });

  it("rejects startNextHalf after period 6", async () => {
    const engine = makeEngine();
    const session = await engine.createSession("Final-only");
    const { company } = await engine.createCompany("Team-B", session.id);
    const scenario = MINIMAL_HALF;

    for (let i = 0; i < TOTAL_PERIODS; i++) {
      await runHalfYearSteps(engine, session.id, company.id, scenario);
      if (i < TOTAL_PERIODS - 1) await engine.startNextHalf(session.id);
    }

    await expect(engine.startNextHalf(session.id)).rejects.toMatchObject({
      code: "ERR_FINAL_PERIOD",
    });
  });
});
