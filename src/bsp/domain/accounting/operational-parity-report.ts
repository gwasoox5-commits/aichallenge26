import type { CompanyAggregate, SessionAggregate } from "../../application/ports/repositories";
import type { BspGameStep } from "../types";
import {
  applyFacilityToState,
  applyLoanToState,
  applyProductionToState,
  applySalesToState,
  computeFacility,
  computeHiring,
  computeLoan,
  computeProduction,
  computeSales,
  createInitialOperationalState,
  validateMaterial,
} from "../validation/step-validators";
import type { FinancialStatementsDto } from "../types";

export interface ExcelDiffLine {
  field: string;
  expected: number;
  actual: number;
  delta: number;
}

export interface ExcelDiffReport {
  pass: boolean;
  generatedAt: string;
  deltas: ExcelDiffLine[];
  note: string;
}

const STEP_ORDER: BspGameStep[] = ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"];

function pushDelta(deltas: ExcelDiffLine[], field: string, expected: number, actual: number) {
  const delta = actual - expected;
  if (delta !== 0) deltas.push({ field, expected, actual, delta });
}

/** Rule Book compute chain vs engine output (Excel parity style). */
export function buildOperationalParityReport(
  company: CompanyAggregate,
  session: SessionAggregate,
  dashboard: {
    cashManwon: number;
    inventoryTotalUnits: number;
    halfYearProductionQty: number;
    halfYearSalesQty: number;
    purchaseCapacity: number;
    productionCapacity: number;
    salesCapacity: number;
  },
  fs: FinancialStatementsDto
): ExcelDiffReport {
  const deltas: ExcelDiffLine[] = [];
  const decisions = company.decisions
    .filter((d) => d.periodId === company.periodId && d.status === "POSTED" && d.step !== "SETTLEMENT")
    .sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));

  pushDelta(deltas, "balanceSheet.equation", 0, fs.balanceSheet.assets.total - (fs.balanceSheet.liabilities.total + fs.balanceSheet.equity.total));
  pushDelta(
    deltas,
    "trialBalance.equation",
    0,
    fs.trialBalance.reduce((s, l) => s + l.debitManwon, 0) - fs.trialBalance.reduce((s, l) => s + l.creditManwon, 0)
  );

  if (decisions.length === 0) {
    return {
      pass: deltas.length === 0,
      generatedAt: new Date().toISOString(),
      deltas,
      note: "의사결정이 없어 Rule Book 재계산을 건너뛰었습니다.",
    };
  }

  let state = createInitialOperationalState();
  const economy = session.economy;

  for (const d of decisions) {
    if (d.step === "LOAN") {
      const c = computeLoan(d.payload as Parameters<typeof computeLoan>[0], state);
      state = applyLoanToState(state, c);
    } else if (d.step === "FACILITY") {
      const payload = d.payload as Parameters<typeof computeFacility>[0];
      state = applyFacilityToState(state, payload, computeFacility(payload, state));
    } else if (d.step === "HIRING") {
      const c = computeHiring(d.payload as Parameters<typeof computeHiring>[0]);
      state = {
        ...state,
        headPurchase: c.headPurchaseTotal,
        headProduction: c.headProductionTotal,
        headSales: c.headSalesTotal,
        purchaseCapacity: c.purchaseCapacity,
        productionCapacity: c.productionCapacity,
        salesCapacity: c.salesCapacity,
      };
    } else if (d.step === "MATERIAL") {
      const matV = validateMaterial(d.payload as Parameters<typeof validateMaterial>[0], state, economy);
      state = {
        ...state,
        cashManwon: matV.computed.cashAfterManwon,
        inventory: matV.computed.inventoryAfter,
        inventoryCostManwon: state.inventoryCostManwon + matV.computed.materialCostManwon,
      };
    } else if (d.step === "PRODUCTION") {
      const c = computeProduction(d.payload as Parameters<typeof computeProduction>[0], state, economy);
      state = applyProductionToState(state, d.payload as Parameters<typeof computeProduction>[0], c);
    } else if (d.step === "SALES") {
      const c = computeSales(d.payload as Parameters<typeof computeSales>[0], state, economy);
      state = applySalesToState(state, c);
    }
  }

  const preSettleCash = company.operational.settlementComplete ? undefined : dashboard.cashManwon;
  if (preSettleCash != null) {
    pushDelta(deltas, "cash(pre-settle)", state.cashManwon, preSettleCash);
  }
  pushDelta(deltas, "revenue", state.halfYearRevenueManwon, fs.profitAndLoss.revenue);
  pushDelta(
    deltas,
    "inventoryUnits",
    state.inventory.A + state.inventory.B + state.inventory.C + state.inventory.D,
    dashboard.inventoryTotalUnits
  );
  pushDelta(deltas, "productionQty", state.halfYearProductionQty, dashboard.halfYearProductionQty);
  pushDelta(deltas, "salesQty", state.halfYearSalesQty, dashboard.halfYearSalesQty);

  if (company.operational.settlementComplete) {
    pushDelta(deltas, "cash(post-settle)", dashboard.cashManwon, fs.balanceSheet.assets.cash);
  }

  return {
    pass: deltas.length === 0,
    generatedAt: new Date().toISOString(),
    deltas,
    note: "Rule Book 독립 계산 vs 엔진 결과 (Excel parity)",
  };
}
