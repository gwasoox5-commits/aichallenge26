import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { JOURNAL_RULES } from "@/src/bsp/domain/accounting/journal-rules";
import {
  computeHiring,
  validateMaterial,
  applyLoanToState,
  applyFacilityToState,
  computeLoan,
  computeFacility,
  createInitialOperationalState,
} from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";
import { materialBidPayload, asiaMaterialBidPayload } from "./bid-payloads";

describe("Sprint 2A — full demo flow", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    const repos = createMemoryRepositories();
    engine = new GameEngine(
      repos,
      stepHandlerRegistry,
      new AccountingEngine(),
      new DashboardService(),
      new EventStoreService(repos.events)
    );
  });

  it("runs Step 1→4 with journals and P/L", async () => {
    const session = await engine.ensureDemoSession();
    const { company } = await engine.createCompany("Sprint2A-Team", session.id);

    const s1 = await engine.submitDecision(
      company.id,
      "LOAN",
      { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 },
      0
    );
    expect(s1.dashboard.cashManwon).toBe(11000);
    await engine.gmAdvanceStep(session.id);

    const s2 = await engine.submitDecision(
      company.id,
      "FACILITY",
      { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
      s1.statusVersion
    );
    expect(s2.dashboard.cashManwon).toBe(7400);
    await engine.gmAdvanceStep(session.id);

    const s3 = await engine.submitDecision(
      company.id,
      "HIRING",
      { headPurchase: 2, headProduction: 3, headSales: 2 },
      s2.statusVersion
    );
    expect(s3.dashboard.purchaseCapacity).toBe(60);
    expect(s3.dashboard.payrollForecastHalfManwon).toBe(2100);
    await engine.gmAdvanceStep(session.id);

    const s4 = await engine.submitDecision(
      company.id,
      "MATERIAL",
      materialBidPayload("ASIA", 15, 12),
      s3.statusVersion
    );
    expect(s4.dashboard.cashManwon).toBe(7400);
    expect(s4.dashboard.inventoryTotalUnits).toBe(0);
    await engine.gmAdvanceStep(session.id);

    const afterMaterial = await engine.getDashboard(company.id);
    expect(afterMaterial.cashManwon).toBe(6380);
    expect(afterMaterial.inventoryTotalUnits).toBe(60);

    const journals = await engine.getJournals(company.id);
    expect(journals).toHaveLength(4);
    expect(journals.find((j) => j.transactionType === "HIRING")?.lines).toHaveLength(0);

    const matJournal = journals.find((j) => j.transactionType === "MATERIAL");
    expect(matJournal?.lines.some((l) => l.accountCode === "1300" && l.debitManwon === 720)).toBe(true);
    expect(matJournal?.lines.some((l) => l.accountCode === "6300" && l.debitManwon === 300)).toBe(true);

    const fs = await engine.getFinancialStatements(company.id);
    expect(fs.balanceSheet.assets.rawMaterials).toBe(720);
    expect(fs.profitAndLoss.cogsBreakdown.logisticsMaterial).toBe(300);
    expect(fs.profitAndLoss.cogsBreakdown.payrollPurchaseProduction).toBe(1500);
    expect(fs.profitAndLoss.sga.payrollSales).toBe(600);
    expect(fs.trialBalance.length).toBeGreaterThan(0);
  });
});

describe("Journal Rules catalog", () => {
  it("maps LOAN, FACILITY, HIRING, MATERIAL to rule book", () => {
    const types = JOURNAL_RULES.map((r) => r.transactionType);
    expect(types).toContain("LOAN");
    expect(types).toContain("FACILITY");
    expect(types).toContain("HIRING");
    expect(types).toContain("MATERIAL");
  });
});

describe("Hiring domain", () => {
  it("computes capacity and payroll forecast (2,3,2 → 2100)", () => {
    const c = computeHiring({ headPurchase: 2, headProduction: 3, headSales: 2 });
    expect(c.purchaseCapacity).toBe(60);
    expect(c.productionCapacity).toBe(30);
    expect(c.salesCapacity).toBe(20);
    expect(c.payrollForecastHalfManwon).toBe(2100);
  });
});

describe("Material domain", () => {
  it("validates purchase capacity M03", () => {
    let state = createInitialOperationalState();
    state = applyLoanToState(state, computeLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, state));
    state = applyFacilityToState(
      state,
      { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
      computeFacility({ landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 }, state)
    );
    state.headPurchase = 2;
    state.purchaseCapacity = 60;

    const ok = validateMaterial(
      {
        lines: [
          {
            regionCode: "ASIA",
            materials: { A: 15, B: 15, C: 15, D: 15 },
            unitPriceBidManwon: 12,
          },
        ],
      },
      state,
      DEFAULT_ECONOMY_VALUES
    );
    expect(ok.validation.ok).toBe(true);
    expect(ok.computed.materialCostManwon).toBe(720);
    expect(ok.computed.logisticsCostManwon).toBe(300);
  });
});
