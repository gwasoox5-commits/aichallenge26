import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import { runSettlementPipeline } from "@/src/bsp/domain/accounting/settlement-pipeline";
import {
  computeProduction,
  computeSales,
  createInitialOperationalState,
  validateProduction,
  validateSales,
  applyLoanToState,
  applyFacilityToState,
  computeLoan,
  computeFacility,
} from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES, GAME_CONSTANTS } from "@/src/bsp/domain/types";
import { BspError } from "@/src/bsp/application/game-engine";

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

/** Sprint 2A demo inputs through Step 4 */
async function setupThroughMaterial(engine: GameEngine) {
  const session = await engine.ensureDemoSession();
  const { company } = await engine.createCompany("Sprint2B-Team", session.id);
  let v = 0;

  const s1 = await engine.submitDecision(
    company.id,
    "LOAN",
    { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 },
    v
  );
  v = s1.statusVersion;
  await engine.gmAdvanceStep(session.id);

  const s2 = await engine.submitDecision(
    company.id,
    "FACILITY",
    { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    v
  );
  v = s2.statusVersion;
  await engine.gmAdvanceStep(session.id);

  const s3 = await engine.submitDecision(
    company.id,
    "HIRING",
    { headPurchase: 2, headProduction: 3, headSales: 2 },
    v
  );
  v = s3.statusVersion;
  await engine.gmAdvanceStep(session.id);

  const s4 = await engine.submitDecision(
    company.id,
    "MATERIAL",
    { lines: [{ regionCode: "ASIA", materials: { A: 15, B: 15, C: 15, D: 15 } }] },
    v
  );
  v = s4.statusVersion;
  await engine.gmAdvanceStep(session.id);

  return { session, company, version: v };
}

describe("Sprint 2B — Production domain", () => {
  it("computeProduction max capacity = min(material, machine, labor)", () => {
    let state = createInitialOperationalState();
    state = applyLoanToState(state, computeLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, state));
    state = applyFacilityToState(
      state,
      { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
      computeFacility({ landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 }, state)
    );
    state.headProduction = 3;
    state.productionCapacity = 30;
    state.inventory = { A: 15, B: 15, C: 15, D: 15 };
    state.inventoryCostManwon = 720;
    state.machineBig = 1;

    const c = computeProduction(
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      state,
      DEFAULT_ECONOMY_VALUES
    );
    expect(c.maxByMaterial).toBe(3);
    expect(c.maxByMachine).toBe(30);
    expect(c.maxByLabor).toBe(30);
    expect(c.maxProduction).toBe(3);
    expect(c.machineOpCostManwon).toBe(80);
    expect(c.materialCostConsumedManwon).toBe(576);
  });

  it("P01 rejects productionQty > capacity", () => {
    let state = createInitialOperationalState();
    state.inventory = { A: 8, B: 8, C: 8, D: 8 };
    state.headProduction = 3;
    state.productionCapacity = 30;
    state.machineBig = 1;
    const r = validateProduction(
      { productionQty: 10, machineBigRun: 1, machineSmallRun: 0 },
      state,
      DEFAULT_ECONOMY_VALUES
    );
    expect(r.validation.ok).toBe(false);
    expect(r.validation.rules.some((x) => x.ruleId === "P01" && !x.passed)).toBe(true);
  });

  it("P02 rejects machineBigRun > owned", () => {
    let state = createInitialOperationalState();
    state.machineBig = 1;
    state.inventory = { A: 20, B: 20, C: 20, D: 20 };
    state.headProduction = 5;
    const r = validateProduction(
      { productionQty: 5, machineBigRun: 2, machineSmallRun: 0 },
      state,
      DEFAULT_ECONOMY_VALUES
    );
    expect(r.validation.ok).toBe(false);
  });

  it("P04 rejects negative productionQty", () => {
    const r = validateProduction(
      { productionQty: -1, machineBigRun: 0, machineSmallRun: 0 },
      createInitialOperationalState(),
      DEFAULT_ECONOMY_VALUES
    );
    expect(r.validation.ok).toBe(false);
  });
});

describe("Sprint 2B — Sales domain", () => {
  function salesReadyState() {
    let state = createInitialOperationalState();
    state.cashManwon = 6300;
    state.finishedGoodsQty = 3;
    state.finishedGoodsCostManwon = 576;
    state.unitFinishedGoodsCostManwon = 192;
    state.salesCapacity = 20;
    return state;
  }

  it("computeSales revenue and logistics", () => {
    const c = computeSales(
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] },
      salesReadyState(),
      DEFAULT_ECONOMY_VALUES
    );
    expect(c.totalRevenueManwon).toBe(300);
    expect(c.totalSoldQty).toBe(3);
    expect(c.cogsManwon).toBe(576);
    expect(c.logisticsSalesManwon).toBe(30);
    expect(c.cashAfterManwon).toBe(6570);
  });

  it("S01 rejects price above region max", () => {
    const r = validateSales(
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 200, qty: 5 }] },
      salesReadyState(),
      DEFAULT_ECONOMY_VALUES
    );
    expect(r.validation.ok).toBe(false);
  });

  it("S02 rejects qty above region limit", () => {
    const r = validateSales(
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 101 }] },
      salesReadyState(),
      DEFAULT_ECONOMY_VALUES
    );
    expect(r.validation.ok).toBe(false);
  });

  it("S04 rejects sales > finished goods", () => {
    const r = validateSales(
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 20 }] },
      salesReadyState(),
      DEFAULT_ECONOMY_VALUES
    );
    expect(r.validation.ok).toBe(false);
  });
});

describe("Sprint 2B — Step 5 Production integration", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    engine = makeEngine();
  });

  it("posts production journal and updates inventory/FG", async () => {
    const { session, company, version } = await setupThroughMaterial(engine);
    const s5 = await engine.submitDecision(
      company.id,
      "PRODUCTION",
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      version
    );
    expect(s5.dashboard.cashManwon).toBe(6300);
    expect(s5.dashboard.finishedGoodsQty).toBe(3);
    expect(s5.dashboard.halfYearProductionQty).toBe(3);
    expect(s5.dashboard.inventoryTotalUnits).toBe(12);

    const journals = await engine.getJournals(company.id);
    const prod = journals.find((j) => j.transactionType === "PRODUCTION");
    expect(prod?.lines.some((l) => l.accountCode === "6500" && l.debitManwon === 80)).toBe(true);
    expect(prod?.lines.some((l) => l.accountCode === "1400" && l.debitManwon === 576)).toBe(true);

    await engine.gmAdvanceStep(session.id);
  });
});

describe("Sprint 2B — Step 6 Sales integration", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    engine = makeEngine();
  });

  it("posts sales journal with revenue and COGS", async () => {
    const { session, company, version } = await setupThroughMaterial(engine);
    const s5 = await engine.submitDecision(
      company.id,
      "PRODUCTION",
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      version
    );
    await engine.gmAdvanceStep(session.id);

    const s6 = await engine.submitDecision(
      company.id,
      "SALES",
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] },
      s5.statusVersion
    );
    expect(s6.dashboard.cashManwon).toBe(6570);
    expect(s6.dashboard.halfYearSalesQty).toBe(3);
    expect(s6.dashboard.halfYearRevenueManwon).toBe(300);
    expect(s6.dashboard.finishedGoodsQty).toBe(0);

    const journals = await engine.getJournals(company.id);
    const sales = journals.find((j) => j.transactionType === "SALES");
    expect(sales?.lines.some((l) => l.accountCode === "4100" && l.creditManwon === 300)).toBe(true);
    expect(sales?.lines.some((l) => l.accountCode === "5100" && l.debitManwon === 576)).toBe(true);

    await engine.gmAdvanceStep(session.id);
  });
});

describe("Sprint 2B — Settlement", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    engine = makeEngine();
  });

  it("CEO cannot POST settlement (G07)", async () => {
    const { session, company, version } = await setupThroughMaterial(engine);
    let v = version;
    const s5 = await engine.submitDecision(
      company.id,
      "PRODUCTION",
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      v
    );
    v = s5.statusVersion;
    await engine.gmAdvanceStep(session.id);
    const s6 = await engine.submitDecision(
      company.id,
      "SALES",
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] },
      v
    );
    await engine.gmAdvanceStep(session.id);

    await expect(
      engine.submitDecision(company.id, "SETTLEMENT", {}, s6.statusVersion)
    ).rejects.toThrow(BspError);
  });

  it("closePeriod runs settlement and locks journals", async () => {
    const { session, company, version } = await setupThroughMaterial(engine);
    let v = version;
    const s5 = await engine.submitDecision(
      company.id,
      "PRODUCTION",
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      v
    );
    v = s5.statusVersion;
    await engine.gmAdvanceStep(session.id);
    const s6 = await engine.submitDecision(
      company.id,
      "SALES",
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] },
      v
    );
    await engine.gmAdvanceStep(session.id);

    const closed = await engine.closePeriod(session.id);
    expect(closed.results).toHaveLength(1);
    expect(closed.results[0].companyId).toBe(company.id);

    const dash = await engine.getDashboard(company.id);
    expect(dash.journalsLocked).toBe(true);
    expect(dash.settlementComplete).toBe(true);

    const journals = await engine.getJournals(company.id);
    expect(journals.some((j) => j.transactionType === "SETTLEMENT_PAYROLL")).toBe(true);
    expect(journals.some((j) => j.transactionType === "SETTLEMENT_CLOSE")).toBe(true);
  });

  it("settlement pipeline computes payroll and depreciation", () => {
    let state = createInitialOperationalState();
    state.headPurchase = 2;
    state.headProduction = 3;
    state.headSales = 2;
    state.depositManwon = 1000;
    state.debtManwon = 2000;
    const ledger = new Map([
      ["1510", 600],
      ["1100", 7650],
    ]);
    const result = runSettlementPipeline({
      operational: state,
      ledger,
      economy: DEFAULT_ECONOMY_VALUES,
    });
    expect(result.computed.payrollPurchaseProductionManwon).toBe(1500);
    expect(result.computed.payrollSalesManwon).toBe(600);
    expect(result.computed.welfareManwon).toBe(315);
    expect(result.computed.depreciationManwon).toBe(30);
    expect(result.computed.interestIncomeManwon).toBe(25);
    expect(result.computed.interestExpenseManwon).toBe(100);
    expect(result.operational.journalsLocked).toBe(true);
  });
});

describe("Sprint 2B — Excel regression (zero tolerance)", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    engine = makeEngine();
  });

  it("matches Excel demo scenario end-to-end", async () => {
    const { session, company, version } = await setupThroughMaterial(engine);

    expect((await engine.getDashboard(company.id)).cashManwon).toBe(6380);

    let v = version;
    const s5 = await engine.submitDecision(
      company.id,
      "PRODUCTION",
      { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
      v
    );
    expect(s5.dashboard.cashManwon).toBe(6300);
    expect(s5.dashboard.finishedGoodsQty).toBe(3);
    v = s5.statusVersion;
    await engine.gmAdvanceStep(session.id);

    const s6 = await engine.submitDecision(
      company.id,
      "SALES",
      { lines: [{ regionCode: "ASIA", unitPriceManwon: 100, qty: 3 }] },
      v
    );
    expect(s6.dashboard.cashManwon).toBe(6570);
    expect(s6.dashboard.halfYearRevenueManwon).toBe(300);
    await engine.gmAdvanceStep(session.id);

    await engine.closePeriod(session.id);

    const dash = await engine.getDashboard(company.id);
    const fs = await engine.getFinancialStatements(company.id);

    expect(dash.cashManwon).toBe(fs.balanceSheet.assets.cash);
    expect(dash.halfYearProductionQty).toBe(3);
    expect(dash.halfYearSalesQty).toBe(3);
    expect(fs.profitAndLoss.revenue).toBe(300);
    expect(fs.balanceSheet.assets.finishedGoods).toBe(0);
    expect(fs.balanceSheet.assets.rawMaterials).toBe(144);
    expect(dash.journalsLocked).toBe(true);

    const journals = await engine.getJournals(company.id);
    expect(journals.filter((j) => j.transactionType.startsWith("SETTLEMENT")).length).toBeGreaterThanOrEqual(3);
  });
});

describe("Sprint 2B — Join Code & GM", () => {
  let engine: GameEngine;

  beforeEach(() => {
    resetMemoryState();
    engine = makeEngine();
  });

  it("createSession generates join code", async () => {
    const session = await engine.createSession("Class A");
    expect(session.joinCode).toHaveLength(5);
    expect(session.name).toBe("Class A");
  });

  it("joinGame creates company in session", async () => {
    const session = await engine.createSession("Class B");
    const { company } = await engine.joinGame(session.joinCode, "Team-Beta");
    expect(company.teamName).toBe("Team-Beta");
    expect(company.sessionId).toBe(session.id);
  });

  it("joinGame reuses wizard pre-created team slot", async () => {
    const session = await engine.createSession("Wizard Class", { teamNames: ["Alpha", "Bravo"] });
    expect((await engine.listSessionCompanies(session.id))).toHaveLength(2);
    const { company } = await engine.joinGame(session.joinCode, "Alpha");
    expect(company.teamName).toBe("Alpha");
    expect((await engine.listSessionCompanies(session.id))).toHaveLength(2);
  });

  it("findSessionByJoinCode resolves session", async () => {
    const session = await engine.createSession("Class C");
    const found = await engine.findSessionByJoinCode(session.joinCode);
    expect(found.id).toBe(session.id);
  });

  it("getGmDesk shows team submission status", async () => {
    const session = await engine.createSession("Class D");
    const { company } = await engine.joinGame(session.joinCode, "Team-D");
    await engine.submitDecision(
      company.id,
      "LOAN",
      { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
      0
    );
    const desk = await engine.getGmDesk(session.id);
    expect(desk.joinCode).toBe(session.joinCode);
    expect(desk.teams).toHaveLength(1);
    expect(desk.teams[0].submittedSteps).toContain("LOAN");
  });

  it("gmAdvanceStep moves session phase", async () => {
    const session = await engine.ensureDemoSession();
    const next = await engine.gmAdvanceStep(session.id);
    expect(next.stepPhase).toBe("STEP2_INVESTMENT");
  });

  it("blocks decision when step gate mismatch (G02)", async () => {
    const session = await engine.ensureDemoSession();
    const { company } = await engine.createCompany("Gate-Test", session.id);
    await expect(
      engine.submitDecision(
        company.id,
        "FACILITY",
        { landPlotsPurchased: 1, machineBigPurchased: 0, machineSmallPurchased: 0 },
        0
      )
    ).rejects.toThrow(BspError);
  });

  it("blocks duplicate decision (G05)", async () => {
    const session = await engine.ensureDemoSession();
    const { company } = await engine.createCompany("Dup-Test", session.id);
    await engine.submitDecision(company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 }, 0);
    await expect(
      engine.submitDecision(company.id, "LOAN", { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 }, 1)
    ).rejects.toThrow(BspError);
  });
});

describe("Sprint 2B — GAME_CONSTANTS", () => {
  it("machine operating costs match rule book", () => {
    expect(GAME_CONSTANTS.machineBigOperatingCostManwon).toBe(80);
    expect(GAME_CONSTANTS.machineSmallOperatingCostManwon).toBe(40);
    expect(GAME_CONSTANTS.salesLogisticsPerUnitManwon).toBe(10);
    expect(GAME_CONSTANTS.bomRatio).toBe(4);
  });
});
