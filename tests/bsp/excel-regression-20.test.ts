/**
 * V1 Readiness — Excel parity runner (Rule Book = Excel source of truth)
 * 20 scenarios × full Step 1~7 with zero-tolerance comparison.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryRepositories, resetMemoryState } from "@/src/bsp/infrastructure/memory/memory-repositories";
import { GameEngine } from "@/src/bsp/application/game-engine";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { DashboardService } from "@/src/bsp/application/dashboard-service";
import { EventStoreService } from "@/src/bsp/application/event-store-service";
import { stepHandlerRegistry } from "@/src/bsp/domain/steps/step-handler-registry";
import {
  computeLoan,
  computeFacility,
  computeHiring,
  computeProduction,
  computeSales,
  validateMaterial,
  createInitialOperationalState,
  applyLoanToState,
  applyFacilityToState,
  applyProductionToState,
  applySalesToState,
} from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES, type EconomyValues } from "@/src/bsp/domain/types";
import { materialBidPayload } from "./bid-payloads";
import { effectiveMaterialUnitPriceManwon } from "@/src/bsp/domain/economy/material-pricing";
import { getRegion } from "@/src/bsp/domain/regions/region-catalog";

export interface ExcelScenarioInput {
  id: string;
  name: string;
  loan: { loanEarly: number; loanMid: number; deposit: number; loanRepayment: number };
  facility: { landPlotsPurchased: number; machineBigPurchased: number; machineSmallPurchased: number };
  hiring: { headPurchase: number; headProduction: number; headSales: number };
  material: { regionCode: string; perType: number };
  production: { productionQty: number; machineBigRun: number; machineSmallRun: number };
  sales: { regionCode: string; unitPriceManwon: number; qty: number };
  miscIncome?: number;
  economy?: EconomyValues;
}

export interface ExcelScenarioResult {
  id: string;
  name: string;
  pass: boolean;
  deltas: Array<{ field: string; expected: number; actual: number; delta: number }>;
  cash: number;
  inventoryUnits: number;
  productionQty: number;
  salesQty: number;
  purchaseCapacity: number;
  productionCapacity: number;
  salesCapacity: number;
  revenue: number;
  netIncome: number;
  journalCount: number;
  roe: number;
}

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

export async function runExcelScenario(input: ExcelScenarioInput): Promise<ExcelScenarioResult> {
  resetMemoryState();
  const engine = makeEngine();
  const session = await engine.createSession(`Excel-${input.id}`);
  const { company } = await engine.createCompany(`Team-${input.id}`, session.id);

  if (input.economy) {
    await engine.applyEconomyPreset(session.id, "baseline");
  }

  let v = 0;
  const steps: Array<{ step: "LOAN" | "FACILITY" | "HIRING" | "MATERIAL" | "PRODUCTION" | "SALES"; payload: unknown }> = [
    { step: "LOAN", payload: input.loan },
    { step: "FACILITY", payload: input.facility },
    { step: "HIRING", payload: input.hiring },
    {
      step: "MATERIAL",
      payload: materialBidPayload(
        input.material.regionCode as Parameters<typeof materialBidPayload>[0],
        input.material.perType
      ),
    },
    {
      step: "PRODUCTION",
      payload: input.production,
    },
    {
      step: "SALES",
      payload: {
        lines: [{ regionCode: input.sales.regionCode, unitPriceManwon: input.sales.unitPriceManwon, qty: input.sales.qty }],
      },
    },
  ];

  for (const s of steps) {
    const r = await engine.submitDecision(company.id, s.step, s.payload, v);
    v = r.statusVersion;
    await engine.gmAdvanceStep(session.id);
  }

  const preSettlement = await engine.getDashboard(company.id);

  await engine.closePeriod(session.id, input.miscIncome ? { [company.id]: input.miscIncome } : {});

  const dash = await engine.getDashboard(company.id);
  const fs = await engine.getFinancialStatements(company.id);
  const journals = await engine.getJournals(company.id);

  const economy = input.economy ?? DEFAULT_ECONOMY_VALUES;
  let state = createInitialOperationalState();
  state = applyLoanToState(state, computeLoan(input.loan, state));
  state = applyFacilityToState(state, input.facility, computeFacility(input.facility, state));
  const hireC = computeHiring(input.hiring);
  state = {
    ...state,
    headPurchase: hireC.headPurchaseTotal,
    headProduction: hireC.headProductionTotal,
    headSales: hireC.headSalesTotal,
    purchaseCapacity: hireC.purchaseCapacity,
    productionCapacity: hireC.productionCapacity,
    salesCapacity: hireC.salesCapacity,
  };
  const matRegion = getRegion(input.material.regionCode as Parameters<typeof getRegion>[0]);
  const matBidPrice = effectiveMaterialUnitPriceManwon(matRegion, economy);
  const matV = validateMaterial(
    {
      lines: [
        {
          regionCode: input.material.regionCode,
          materials: { A: input.material.perType, B: input.material.perType, C: input.material.perType, D: input.material.perType },
          unitPriceBidManwon: matBidPrice,
        },
      ],
    },
    state,
    economy
  );
  state = { ...state, cashManwon: matV.computed.cashAfterManwon, inventory: matV.computed.inventoryAfter, inventoryCostManwon: state.inventoryCostManwon + matV.computed.materialCostManwon };
  const prodC = computeProduction(input.production, state, economy);
  state = applyProductionToState(state, input.production, prodC);
  const salesC = computeSales(
    { lines: [{ regionCode: input.sales.regionCode, unitPriceManwon: input.sales.unitPriceManwon, qty: input.sales.qty }] },
    state,
    economy
  );
  state = applySalesToState(state, salesC);

  const deltas: ExcelScenarioResult["deltas"] = [];
  const compare = (field: string, expectedVal: number, actualVal: number) => {
    const delta = actualVal - expectedVal;
    if (delta !== 0) deltas.push({ field, expected: expectedVal, actual: actualVal, delta });
  };

  compare("cash(pre-settle)", state.cashManwon, preSettlement.cashManwon);
  compare("productionQty", input.production.productionQty, dash.halfYearProductionQty);
  compare("salesQty", input.sales.qty, dash.halfYearSalesQty);
  compare("purchaseCapacity", hireC.purchaseCapacity, dash.purchaseCapacity);
  compare("productionCapacity", hireC.productionCapacity, dash.productionCapacity);
  compare("salesCapacity", hireC.salesCapacity, dash.salesCapacity);
  compare("revenue", salesC.totalRevenueManwon, fs.profitAndLoss.revenue);
  compare("inventoryUnits", state.inventory.A + state.inventory.B + state.inventory.C + state.inventory.D, dash.inventoryTotalUnits);
  compare("cash(post-settle)", dash.cashManwon, fs.balanceSheet.assets.cash);

  return {
    id: input.id,
    name: input.name,
    pass: deltas.length === 0,
    deltas,
    cash: dash.cashManwon,
    inventoryUnits: dash.inventoryTotalUnits,
    productionQty: dash.halfYearProductionQty,
    salesQty: dash.halfYearSalesQty,
    purchaseCapacity: dash.purchaseCapacity,
    productionCapacity: dash.productionCapacity,
    salesCapacity: dash.salesCapacity,
    revenue: fs.profitAndLoss.revenue,
    netIncome: fs.profitAndLoss.netIncome,
    journalCount: journals.length,
    roe: dash.roePercent,
  };
}

export const EXCEL_SCENARIOS: ExcelScenarioInput[] = [
  {
    id: "S01",
    name: "Baseline Demo (2A+2B)",
    loan: { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 3, headSales: 2 },
    material: { regionCode: "ASIA", perType: 15 },
    production: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 3 },
  },
  {
    id: "S02",
    name: "No external funding",
    loan: { loanEarly: 0, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
    material: { regionCode: "AFRICA", perType: 4 },
    production: { productionQty: 1, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "AFRICA", unitPriceManwon: 80, qty: 1 },
  },
  {
    id: "S03",
    name: "Max early loan (10×1000)",
    loan: { loanEarly: 10, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
    material: { regionCode: "ASIA", perType: 4 },
    production: { productionQty: 1, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 1 },
  },
  {
    id: "S04",
    name: "Loan with repayment",
    loan: { loanEarly: 3, loanMid: 0, deposit: 0, loanRepayment: 1 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 0, machineSmallPurchased: 1 },
    hiring: { headPurchase: 2, headProduction: 2, headSales: 2 },
    material: { regionCode: "MIDDLE_EAST", perType: 8 },
    production: { productionQty: 2, machineBigRun: 0, machineSmallRun: 1 },
    sales: { regionCode: "MIDDLE_EAST", unitPriceManwon: 100, qty: 2 },
  },
  {
    id: "S05",
    name: "Small machine only",
    loan: { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 0, machineSmallPurchased: 1 },
    hiring: { headPurchase: 1, headProduction: 2, headSales: 1 },
    material: { regionCode: "ASIA", perType: 7 },
    production: { productionQty: 1, machineBigRun: 0, machineSmallRun: 1 },
    sales: { regionCode: "ASIA", unitPriceManwon: 120, qty: 1 },
  },
  {
    id: "S06",
    name: "Zero production",
    loan: { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
    material: { regionCode: "ASIA", perType: 4 },
    production: { productionQty: 0, machineBigRun: 0, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 0 },
  },
  {
    id: "S07",
    name: "Europe expensive material",
    loan: { loanEarly: 3, loanMid: 0, deposit: 1, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 3, headProduction: 2, headSales: 2 },
    material: { regionCode: "EUROPE", perType: 10 },
    production: { productionQty: 2, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "EUROPE", unitPriceManwon: 150, qty: 2 },
  },
  {
    id: "S08",
    name: "Minimal hiring",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
    material: { regionCode: "ASIA", perType: 4 },
    production: { productionQty: 1, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 1 },
  },
  {
    id: "S09",
    name: "High deposit",
    loan: { loanEarly: 1, loanMid: 0, deposit: 3, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 2, headSales: 2 },
    material: { regionCode: "ASIA", perType: 12 },
    production: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 130, qty: 3 },
  },
  {
    id: "S10",
    name: "Mid-year loan",
    loan: { loanEarly: 0, loanMid: 5, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 2, headSales: 2 },
    material: { regionCode: "ASIA", perType: 10 },
    production: { productionQty: 2, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 2 },
  },
  {
    id: "S11",
    name: "Africa low cost",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 3, headSales: 2 },
    material: { regionCode: "AFRICA", perType: 15 },
    production: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "AFRICA", unitPriceManwon: 90, qty: 3 },
  },
  {
    id: "S12",
    name: "Oceania region",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 2, headSales: 2 },
    material: { regionCode: "OCEANIA", perType: 8 },
    production: { productionQty: 2, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "OCEANIA", unitPriceManwon: 140, qty: 2 },
  },
  {
    id: "S13",
    name: "North America",
    loan: { loanEarly: 3, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 3, headProduction: 3, headSales: 3 },
    material: { regionCode: "NORTH_AMERICA", perType: 12 },
    production: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "NORTH_AMERICA", unitPriceManwon: 160, qty: 3 },
  },
  {
    id: "S14",
    name: "South America",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 2, headSales: 2 },
    material: { regionCode: "SOUTH_AMERICA", perType: 10 },
    production: { productionQty: 2, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "SOUTH_AMERICA", unitPriceManwon: 120, qty: 2 },
  },
  {
    id: "S15",
    name: "Max price ASIA",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 3, headSales: 2 },
    material: { regionCode: "ASIA", perType: 12 },
    production: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 150, qty: 3 },
  },
  {
    id: "S16",
    name: "Two land plots",
    loan: { loanEarly: 5, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 2, machineBigPurchased: 2, machineSmallPurchased: 0 },
    hiring: { headPurchase: 3, headProduction: 4, headSales: 3 },
    material: { regionCode: "ASIA", perType: 20 },
    production: { productionQty: 5, machineBigRun: 2, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 5 },
  },
  {
    id: "S17",
    name: "Partial sales",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 3, headSales: 2 },
    material: { regionCode: "ASIA", perType: 12 },
    production: { productionQty: 3, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 1 },
  },
  {
    id: "S18",
    name: "Large team capacity",
    loan: { loanEarly: 4, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 2, machineBigPurchased: 2, machineSmallPurchased: 0 },
    hiring: { headPurchase: 4, headProduction: 5, headSales: 4 },
    material: { regionCode: "ASIA", perType: 28 },
    production: { productionQty: 7, machineBigRun: 2, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 110, qty: 7 },
  },
  {
    id: "S19",
    name: "Misc income at settlement",
    loan: { loanEarly: 2, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 2, headProduction: 2, headSales: 2 },
    material: { regionCode: "ASIA", perType: 8 },
    production: { productionQty: 2, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 2 },
    miscIncome: 100,
  },
  {
    id: "S20",
    name: "Single unit minimal",
    loan: { loanEarly: 1, loanMid: 0, deposit: 0, loanRepayment: 0 },
    facility: { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
    hiring: { headPurchase: 1, headProduction: 1, headSales: 1 },
    material: { regionCode: "ASIA", perType: 4 },
    production: { productionQty: 1, machineBigRun: 1, machineSmallRun: 0 },
    sales: { regionCode: "ASIA", unitPriceManwon: 100, qty: 1 },
  },
];

describe.sequential("Excel regression — 20 scenarios (zero tolerance)", () => {
  const results: ExcelScenarioResult[] = [];

  for (const scenario of EXCEL_SCENARIOS) {
    it(`${scenario.id}: ${scenario.name}`, async () => {
      let result: ExcelScenarioResult;
      try {
        result = await runExcelScenario(scenario);
      } catch (e) {
        result = {
          id: scenario.id,
          name: scenario.name,
          pass: false,
          deltas: [{ field: "ERROR", expected: 0, actual: -1, delta: -1 }],
          cash: -1,
          inventoryUnits: -1,
          productionQty: -1,
          salesQty: -1,
          purchaseCapacity: -1,
          productionCapacity: -1,
          salesCapacity: -1,
          revenue: -1,
          netIncome: -1,
          journalCount: -1,
          roe: -1,
        };
        throw e;
      }
      results.push(result);
      if (!result.pass) {
        console.table(result.deltas);
      }
      expect(result.deltas, `${scenario.id} parity failures`).toHaveLength(0);
    });
  }
});

describe("Lecture simulation — 10 teams", () => {
  it("runs 10 teams through Step 1~7 in one session", async () => {
    resetMemoryState();
    const engine = makeEngine();
    const session = await engine.createSession("Class-30students-10teams");
    const teams = [];
    for (let i = 1; i <= 10; i++) {
      const { company } = await engine.joinGame(session.joinCode, `Team-${String(i).padStart(2, "0")}`);
      teams.push(company);
    }
    expect(teams).toHaveLength(10);

    const base = EXCEL_SCENARIOS[0];
    for (const s of [
      { step: "LOAN" as const, payload: base.loan },
      { step: "FACILITY" as const, payload: base.facility },
      { step: "HIRING" as const, payload: base.hiring },
      {
        step: "MATERIAL" as const,
        payload: materialBidPayload(base.material.regionCode as Parameters<typeof materialBidPayload>[0], 15),
      },
      { step: "PRODUCTION" as const, payload: base.production },
      {
        step: "SALES" as const,
        payload: { lines: [{ regionCode: base.sales.regionCode, unitPriceManwon: 100, qty: 3 }] },
      },
    ]) {
      for (const company of teams) {
        const fresh = await engine.getDashboard(company.id);
        await engine.submitDecision(company.id, s.step, s.payload, fresh.statusVersion);
      }
      await engine.gmAdvanceStep(session.id);
    }
    const closed = await engine.closePeriod(session.id);
    expect(closed.results).toHaveLength(10);

    const desk = await engine.getGmDesk(session.id);
    expect(desk.teams).toHaveLength(10);
    expect(desk.teams.every((t) => t.submittedSteps.includes("SALES"))).toBe(true);
  });
});

describe("Performance — 100 teams stress", () => {
  it("creates 100 companies and batch settlement under 5s", async () => {
    resetMemoryState();
    const engine = makeEngine();
    const session = await engine.createSession("Stress-100");
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await engine.joinGame(session.joinCode, `Stress-${i}`);
    }
    const createMs = performance.now() - start;
    expect(createMs).toBeLessThan(3000);

    const settleStart = performance.now();
    for (let i = 0; i < 6; i++) {
      await engine.gmAdvanceStep(session.id);
    }
    await engine.closePeriod(session.id);
    const settleMs = performance.now() - settleStart;
    expect(settleMs).toBeLessThan(5000);
  });
});
