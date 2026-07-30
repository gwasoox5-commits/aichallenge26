import {
  GAME_CONSTANTS,
  type CompanyOperationalState,
  type EconomyValues,
  type FacilityPayload,
  type HiringDepartment,
  type HiringPayload,
  type HiringResignations,
  type HiringTransfer,
  type LoanPayload,
  type MaterialPayload,
  type ProductionPayload,
  type SalesPayload,
  type ValidationResult,
  type ValidationRuleResult,
} from "../types";
import { getRegion, isRegionCode } from "../regions/region-catalog";
import {
  isPurchaseBranchOpened,
  isSalesBranchOpened,
  projectedPurchaseBranchRegions,
  projectedSalesBranchRegions,
  regionExpansionCap,
  MAX_PURCHASE_BRANCH_REGIONS,
  openingPurchaseRegions,
  openingSalesRegions,
  hasPurchaseBranch,
  hasSalesBranch,
  purchasingRegionsFromMaterialPayload,
  sellingRegionsFromSalesPayload,
} from "../regions/region-expansion";
import {
  effectiveMaterialLimit,
  effectiveMaterialUnitPriceManwon,
  logisticsCostManwon,
} from "../economy/material-pricing";
import { effectiveSaleLimit, salesLogisticsCostManwon } from "../economy/sales-pricing";

function fail(ruleId: string, errorCode: string, field: string, message: string, params?: Record<string, unknown>): ValidationRuleResult {
  return { ruleId, errorCode, passed: false, field, message, params };
}

function pass(ruleId: string, message: string): ValidationRuleResult {
  return { ruleId, passed: true, message };
}

function result(rules: ValidationRuleResult[]): ValidationResult {
  return { ok: rules.every((r) => r.passed), rules };
}

export function validateLoan(
  payload: LoanPayload,
  state: CompanyOperationalState
): { validation: ValidationResult; computed: ReturnType<typeof computeLoan> } {
  const computed = computeLoan(payload, state);
  const rules: ValidationRuleResult[] = [];

  for (const [field, value] of Object.entries({
    loanEarly: payload.loanEarly,
    loanMid: payload.loanMid,
    deposit: payload.deposit,
    loanRepayment: payload.loanRepayment,
  })) {
    if (!Number.isInteger(value) || value < 0) {
      rules.push(fail("L04", "ERR_LOAN_NEGATIVE", field, `${field} must be a non-negative integer`));
    } else {
      rules.push(pass("L04", `${field} is non-negative`));
    }
  }

  if (Number.isInteger(payload.loanEarly)) {
    if (computed.loanEarlyAmtManwon > state.equityManwon) {
      rules.push(
        fail("L01", "ERR_LOAN_EQUITY_LIMIT", "loanEarly", "Early loan exceeds equity limit", {
          equityBeforeManwon: state.equityManwon,
          requestedManwon: computed.loanEarlyAmtManwon,
        })
      );
    } else {
      rules.push(pass("L01", "Early loan within equity limit"));
    }
    rules.push(pass("L05", "loanEarly uses 천만원 unit"));
  }

  if (Number.isInteger(payload.loanMid)) {
    if (computed.loanMidAmtManwon > GAME_CONSTANTS.loanMidMaxManwon) {
      rules.push(
        fail("L02", "ERR_LOAN_MID_LIMIT", "loanMid", "Mid-year loan exceeds 1억 limit", {
          requestedManwon: computed.loanMidAmtManwon,
          maxManwon: GAME_CONSTANTS.loanMidMaxManwon,
        })
      );
    } else {
      rules.push(pass("L02", "Mid-year loan within limit"));
    }
  }

  if (computed.cashAfterManwon < 0) {
    rules.push(
      fail("L03", "ERR_CASH_NEGATIVE", "loanRepayment", "Cash would become negative", {
        cashAfterManwon: computed.cashAfterManwon,
      })
    );
  } else {
    rules.push(pass("L03", "Cash remains non-negative"));
  }

  const maxRepay = state.debtManwon + computed.loanEarlyAmtManwon + computed.loanMidAmtManwon;
  if (computed.loanRepaymentAmtManwon > maxRepay) {
    rules.push(
      fail("L06", "ERR_LOAN_REPAYMENT", "loanRepayment", "Repayment exceeds outstanding debt", {
        debtBeforeManwon: state.debtManwon,
        newLoansManwon: computed.loanEarlyAmtManwon + computed.loanMidAmtManwon,
        repaymentManwon: computed.loanRepaymentAmtManwon,
      })
    );
  } else {
    rules.push(pass("L06", "Repayment within debt limit"));
  }

  return { validation: result(rules), computed };
}

export function computeLoan(payload: LoanPayload, state: CompanyOperationalState) {
  const loanEarlyAmtManwon = payload.loanEarly * GAME_CONSTANTS.loanUnitManwon;
  const loanMidAmtManwon = payload.loanMid * GAME_CONSTANTS.loanUnitManwon;
  const depositAmtManwon = payload.deposit * GAME_CONSTANTS.loanUnitManwon;
  const loanRepaymentAmtManwon = payload.loanRepayment;

  const cashDeltaManwon =
    loanEarlyAmtManwon + loanMidAmtManwon - depositAmtManwon - loanRepaymentAmtManwon;
  const cashAfterManwon = state.cashManwon + cashDeltaManwon;
  const debtAfterManwon =
    state.debtManwon + loanEarlyAmtManwon + loanMidAmtManwon - loanRepaymentAmtManwon;
  const depositAfterManwon = state.depositManwon + depositAmtManwon;

  return {
    loanEarlyAmtManwon,
    loanMidAmtManwon,
    depositAmtManwon,
    loanRepaymentAmtManwon,
    cashDeltaManwon,
    cashAfterManwon,
    debtAfterManwon,
    depositAfterManwon,
  };
}

export function validateFacility(
  payload: FacilityPayload,
  state: CompanyOperationalState
): { validation: ValidationResult; computed: ReturnType<typeof computeFacility> } {
  const computed = computeFacility(payload, state);
  const rules: ValidationRuleResult[] = [];

  if (!Number.isInteger(payload.landPlotsPurchased) || payload.landPlotsPurchased < 0) {
    rules.push(fail("F06", "ERR_LAND_DELTA", "landPlotsPurchased", "Land purchase must be non-negative integer"));
  } else {
    rules.push(pass("F06", "Land delta is valid"));
  }

  if (computed.landPlotsTotal > GAME_CONSTANTS.landMaxPlots) {
    rules.push(
      fail("F01", "ERR_LAND_MAX", "landPlotsPurchased", "Total land plots exceed maximum", {
        landTotal: computed.landPlotsTotal,
        max: GAME_CONSTANTS.landMaxPlots,
      })
    );
  } else {
    rules.push(pass("F01", "Land within max plots"));
  }

  if (computed.machineBigTotal > computed.landPlotsTotal * 2) {
    rules.push(
      fail("F02", "ERR_MACHINE_BIG_LIMIT", "machineBigPurchased", "Big machines exceed land capacity", {
        machineBigTotal: computed.machineBigTotal,
        limit: computed.landPlotsTotal * 2,
      })
    );
  } else {
    rules.push(pass("F02", "Big machine count valid"));
  }

  if (computed.machineSmallTotal > computed.landPlotsTotal * 4) {
    rules.push(
      fail("F03", "ERR_MACHINE_SMALL_LIMIT", "machineSmallPurchased", "Small machines exceed land capacity", {
        machineSmallTotal: computed.machineSmallTotal,
        limit: computed.landPlotsTotal * 4,
      })
    );
  } else {
    rules.push(pass("F03", "Small machine count valid"));
  }

  const plotSlotsUsed = computed.machineBigTotal * 2 + computed.machineSmallTotal;
  if (plotSlotsUsed > computed.landPlotsTotal * 4) {
    rules.push(
      fail("F04", "ERR_MACHINE_PLOT_RULE", "machineBigPurchased", "Machine mix exceeds per-plot capacity", {
        plotSlotsUsed,
        plotCapacity: computed.landPlotsTotal * 4,
      })
    );
  } else {
    rules.push(pass("F04", "Machine plot mix valid"));
  }

  if (computed.totalCapexManwon > state.cashManwon) {
    rules.push(
      fail("F05", "ERR_CAPEX_CASH", "landPlotsPurchased", "Insufficient cash for capex", {
        cashBeforeManwon: state.cashManwon,
        totalCapexManwon: computed.totalCapexManwon,
      })
    );
  } else {
    rules.push(pass("F05", "Sufficient cash for capex"));
  }

  return { validation: result(rules), computed };
}

export function computeFacility(payload: FacilityPayload, state: CompanyOperationalState) {
  const landPlotsTotal = state.landPlots + payload.landPlotsPurchased;
  const machineBigTotal = state.machineBig + payload.machineBigPurchased;
  const machineSmallTotal = state.machineSmall + payload.machineSmallPurchased;

  const landCostManwon = payload.landPlotsPurchased * GAME_CONSTANTS.landPriceManwon;
  const machineCostManwon =
    payload.machineBigPurchased * GAME_CONSTANTS.machineLargeCostManwon +
    payload.machineSmallPurchased * GAME_CONSTANTS.machineSmallCostManwon;
  const totalCapexManwon = landCostManwon + machineCostManwon;

  const capacityMachine =
    machineBigTotal * GAME_CONSTANTS.machineLargeCapacity +
    machineSmallTotal * GAME_CONSTANTS.machineSmallCapacity;
  const maxMaterials = capacityMachine * GAME_CONSTANTS.bomRatio;
  const cashAfterManwon = state.cashManwon - totalCapexManwon;

  return {
    landCostManwon,
    machineCostManwon,
    totalCapexManwon,
    capacityMachine,
    maxMaterials,
    cashAfterManwon,
    landPlotsTotal,
    machineBigTotal,
    machineSmallTotal,
  };
}

export function applyLoanToState(state: CompanyOperationalState, computed: ReturnType<typeof computeLoan>): CompanyOperationalState {
  const next = { ...state };
  next.cashManwon = computed.cashAfterManwon;
  next.debtManwon = computed.debtAfterManwon;
  next.depositManwon = computed.depositAfterManwon;
  next.equityManwon = computeEquity(next);
  return next;
}

export function applyFacilityToState(
  state: CompanyOperationalState,
  payload: FacilityPayload,
  computed: ReturnType<typeof computeFacility>
): CompanyOperationalState {
  const next = { ...state };
  next.cashManwon = computed.cashAfterManwon;
  next.landPlots = computed.landPlotsTotal;
  next.machineBig = computed.machineBigTotal;
  next.machineSmall = computed.machineSmallTotal;
  next.capacityMachine = computed.capacityMachine;
  next.maxMaterials = computed.maxMaterials;
  next.equityManwon = computeEquity(next);
  return next;
}

export function computeEquity(state: CompanyOperationalState): number {
  const landAsset = state.landPlots * GAME_CONSTANTS.landPriceManwon;
  const machineAsset =
    state.machineBig * GAME_CONSTANTS.machineLargeCostManwon +
    state.machineSmall * GAME_CONSTANTS.machineSmallCostManwon;
  return (
    state.cashManwon +
    state.depositManwon +
    landAsset +
    machineAsset +
    state.inventoryCostManwon +
    state.finishedGoodsCostManwon -
    state.debtManwon
  );
}

export function createInitialOperationalState(): CompanyOperationalState {
  return {
    cashManwon: GAME_CONSTANTS.initialCashManwon,
    debtManwon: 0,
    depositManwon: 0,
    equityManwon: GAME_CONSTANTS.initialEquityManwon,
    landPlots: 0,
    machineBig: 0,
    machineSmall: 0,
    capacityMachine: 0,
    maxMaterials: 0,
    headPurchase: 0,
    headProduction: 0,
    headSales: 0,
    purchaseCapacity: 0,
    productionCapacity: 0,
    salesCapacity: 0,
    payrollForecastHalfManwon: 0,
    welfareForecastHalfManwon: 0,
    rawMaterialQty: 0,
    inventoryCostManwon: 0,
    finishedGoodsQty: 0,
    finishedGoodsCostManwon: 0,
    unitFinishedGoodsCostManwon: 0,
    halfYearProductionQty: 0,
    halfYearSalesQty: 0,
    halfYearRevenueManwon: 0,
    selectedRegions: [],
    openBranches: [],
    openSalesBranches: [],
    miscIncomeManwon: 0,
    netIncomeManwon: 0,
    journalsLocked: false,
    settlementComplete: false,
  };
}


function lineQty(line: { qty?: number; materials?: { A: number; B: number; C: number; D: number } }): number {
  if (typeof line.qty === "number") return line.qty;
  if (line.materials) return line.materials.A + line.materials.B + line.materials.C + line.materials.D;
  return 0;
}

export function computePayrollForecast(
  headPurchase: number,
  headProduction: number,
  headSales: number,
  payrollMultiplier = 1
) {
  const base =
    headPurchase * GAME_CONSTANTS.payrollPurchaseManwonPerHeadHalf +
    headProduction * GAME_CONSTANTS.payrollProductionManwonPerHeadHalf +
    headSales * GAME_CONSTANTS.payrollSalesManwonPerHeadHalf;
  const payrollForecastHalfManwon = Math.round(base * payrollMultiplier);
  const welfareForecastHalfManwon = Math.round(
    payrollForecastHalfManwon * (GAME_CONSTANTS.welfareRatePercent / 100)
  );
  return { payrollForecastHalfManwon, welfareForecastHalfManwon };
}

export function computeHiring(payload: HiringPayload, payrollMultiplier = 1) {
  const headPurchaseTotal = payload.headPurchase;
  const headProductionTotal = payload.headProduction;
  const headSalesTotal = payload.headSales;
  const purchaseCapacity = headPurchaseTotal * GAME_CONSTANTS.purchaseCapacityPerHead;
  const productionCapacity = headProductionTotal * GAME_CONSTANTS.productionCapacityPerHead;
  const salesCapacity = headSalesTotal * GAME_CONSTANTS.salesCapacityPerHead;
  const { payrollForecastHalfManwon, welfareForecastHalfManwon } = computePayrollForecast(
    headPurchaseTotal,
    headProductionTotal,
    headSalesTotal,
    payrollMultiplier
  );
  return {
    headPurchaseTotal,
    headProductionTotal,
    headSalesTotal,
    purchaseCapacity,
    productionCapacity,
    salesCapacity,
    payrollForecastHalfManwon,
    welfareForecastHalfManwon,
  };
}

export interface HiringCurrentHeads {
  headPurchase: number;
  headProduction: number;
  headSales: number;
}

const HIRING_DEPT_HEAD_KEY: Record<HiringDepartment, keyof HiringCurrentHeads> = {
  PURCHASE: "headPurchase",
  PRODUCTION: "headProduction",
  SALES: "headSales",
};

function normalizeHiringResignations(resignations?: HiringResignations) {
  return {
    purchase: resignations?.purchase ?? 0,
    production: resignations?.production ?? 0,
    sales: resignations?.sales ?? 0,
  };
}

function headsAfterResignations(current: HiringCurrentHeads, resignations?: HiringResignations): HiringCurrentHeads {
  const resign = normalizeHiringResignations(resignations);
  return {
    headPurchase: current.headPurchase - resign.purchase,
    headProduction: current.headProduction - resign.production,
    headSales: current.headSales - resign.sales,
  };
}

function isValidHiringTransfer(transfer: unknown): transfer is HiringTransfer {
  if (!transfer || typeof transfer !== "object") return false;
  const t = transfer as HiringTransfer;
  return (
    (t.from === "PURCHASE" || t.from === "PRODUCTION" || t.from === "SALES") &&
    (t.to === "PURCHASE" || t.to === "PRODUCTION" || t.to === "SALES") &&
    Number.isInteger(t.headcount)
  );
}

export function validateHiring(
  payload: HiringPayload,
  periodYear = 1,
  currentHeads?: HiringCurrentHeads
): { validation: ValidationResult; computed: ReturnType<typeof computeHiring> } {
  const computed = computeHiring(payload);
  const rules: ValidationRuleResult[] = [];

  for (const [field, value] of Object.entries({
    headPurchase: payload.headPurchase,
    headProduction: payload.headProduction,
    headSales: payload.headSales,
  })) {
    if (!Number.isInteger(value) || value < 0) {
      rules.push(fail("H01", "ERR_HIRE_NEGATIVE", field, `${field} must be a non-negative integer`));
    } else {
      rules.push(pass("H01", `${field} is non-negative`));
    }
  }

  const resign = normalizeHiringResignations(payload.resignations);
  const transfers = payload.transfers ?? [];
  const hasRestructuring =
    transfers.length > 0 || resign.purchase > 0 || resign.production > 0 || resign.sales > 0;

  if (periodYear < 2 && hasRestructuring) {
    rules.push(
      fail("H04", "ERR_HIRE_RESTRUCTURE_Y1", "transfers", "Year 1 cannot include restructuring fields")
    );
  } else {
    rules.push(pass("H04", "Restructuring fields valid for period"));
  }

  if (periodYear >= 2 && currentHeads) {
    let resignOk = true;
    for (const [field, value] of Object.entries(resign)) {
      const currentKey = field === "purchase" ? "headPurchase" : field === "production" ? "headProduction" : "headSales";
      if (!Number.isInteger(value) || value < 0) {
        rules.push(
          fail("H01", "ERR_HIRE_NEGATIVE", `resignations.${field}`, `resignations.${field} must be a non-negative integer`)
        );
        resignOk = false;
      } else if (value > currentHeads[currentKey as keyof HiringCurrentHeads]) {
        rules.push(
          fail("H03", "ERR_RESIGN_EXCEEDS", `resignations.${field}`, "Resignation exceeds current headcount", {
            field,
            requested: value,
            current: currentHeads[currentKey as keyof HiringCurrentHeads],
          })
        );
        resignOk = false;
      }
    }
    if (resignOk) {
      rules.push(pass("H03", "Resignations within current headcount"));
    }

    const afterResign = headsAfterResignations(currentHeads, payload.resignations);
    let transferOk = true;
    for (const [index, transfer] of transfers.entries()) {
      const field = `transfers[${index}]`;
      if (!isValidHiringTransfer(transfer)) {
        rules.push(fail("H02", "ERR_TRANSFER_INVALID", field, "Transfer entry is invalid"));
        transferOk = false;
        continue;
      }
      if (transfer.from === transfer.to) {
        rules.push(fail("H02", "ERR_TRANSFER_INVALID", field, "Transfer source and destination must differ"));
        transferOk = false;
        continue;
      }
      if (transfer.headcount < 1) {
        rules.push(
          fail("H02", "ERR_TRANSFER_INVALID", field, "Transfer headcount must be at least 1", {
            headcount: transfer.headcount,
          })
        );
        transferOk = false;
        continue;
      }
      const headsMoved = transfer.headcount;
      const sourceKey = HIRING_DEPT_HEAD_KEY[transfer.from];
      if (afterResign[sourceKey] < headsMoved) {
        rules.push(
          fail("H02", "ERR_TRANSFER_INVALID", field, "Insufficient headcount in source department for transfer", {
            from: transfer.from,
            requestedHeads: headsMoved,
            availableHeads: afterResign[sourceKey],
          })
        );
        transferOk = false;
      }
    }
    if (transferOk) {
      rules.push(pass("H02", "Transfer rules satisfied"));
    }
  } else {
    rules.push(pass("H02", "Transfer rules deferred to year 2+"));
    rules.push(pass("H03", "Resignation rules deferred to year 2+"));
  }

  return { validation: result(rules), computed };
}

export function applyHiringToState(
  state: CompanyOperationalState,
  computed: ReturnType<typeof computeHiring>
): CompanyOperationalState {
  const next = { ...state };
  next.headPurchase = computed.headPurchaseTotal;
  next.headProduction = computed.headProductionTotal;
  next.headSales = computed.headSalesTotal;
  next.purchaseCapacity = computed.purchaseCapacity;
  next.productionCapacity = computed.productionCapacity;
  next.salesCapacity = computed.salesCapacity;
  next.payrollForecastHalfManwon = computed.payrollForecastHalfManwon;
  next.welfareForecastHalfManwon = computed.welfareForecastHalfManwon;
  next.equityManwon = computeEquity(next);
  return next;
}

export function computeMaterial(
  payload: MaterialPayload,
  state: CompanyOperationalState,
  economy: EconomyValues
) {
  const branches = payload.branches ?? [];
  const newBranches: string[] = [];
  let branchFeesManwon = 0;
  const seenNew = new Set<string>();

  for (const branch of branches) {
    if (!isRegionCode(branch.regionCode)) continue;
    if (isPurchaseBranchOpened(state, branch.regionCode)) continue;
    if (seenNew.has(branch.regionCode)) continue;
    seenNew.add(branch.regionCode);
    newBranches.push(branch.regionCode);
    branchFeesManwon += getRegion(branch.regionCode).branchSetupFeeManwon;
  }

  const lines = [];
  let materialCostManwon = 0;
  let logisticsCostManwonTotal = 0;
  let rawMaterialQtyAfter = state.rawMaterialQty;

  for (const line of payload.lines ?? []) {
    if (!isRegionCode(line.regionCode)) continue;
    const region = getRegion(line.regionCode);
    const effectivePrice = effectiveMaterialUnitPriceManwon(region, economy);
    const unitPrice = line.unitPriceBidManwon ?? effectivePrice;
    const totalUnits = lineQty(line);
    const lineMaterialCost = totalUnits * unitPrice;
    const lineLogistics = logisticsCostManwon(totalUnits, economy);
    materialCostManwon += lineMaterialCost;
    logisticsCostManwonTotal += lineLogistics;
    rawMaterialQtyAfter += totalUnits;
    lines.push({
      regionCode: line.regionCode,
      effectiveUnitPriceManwon: effectivePrice,
      unitPriceBidManwon: line.unitPriceBidManwon ?? effectivePrice,
      totalUnits,
      materialCostManwon: lineMaterialCost,
      logisticsCostManwon: lineLogistics,
    });
  }

  const totalCostManwon = materialCostManwon + logisticsCostManwonTotal + branchFeesManwon;
  const cashAfterManwon = state.cashManwon - totalCostManwon;

  return {
    lines,
    branchFeesManwon,
    materialCostManwon,
    logisticsCostManwon: logisticsCostManwonTotal,
    totalCostManwon,
    cashAfterManwon,
    rawMaterialQtyAfter,
    newBranches,
  };
}

export function validateMaterial(
  payload: MaterialPayload,
  state: CompanyOperationalState,
  economy: EconomyValues,
  year = 1
): { validation: ValidationResult; computed: ReturnType<typeof computeMaterial> } {
  const computed = computeMaterial(payload, state, economy);
  const rules: ValidationRuleResult[] = [];
  const openingPurchase = openingPurchaseRegions(payload);

  let totalUnitsAll = 0;

  for (const line of payload.lines ?? []) {
    if (!isRegionCode(line.regionCode)) {
      rules.push(fail("M01", "ERR_MAT_REGION", "regionCode", `Unknown region: ${line.regionCode}`));
      continue;
    }
    const region = getRegion(line.regionCode);
    const effectivePrice = effectiveMaterialUnitPriceManwon(region, economy);
    const totalUnits = lineQty(line);
    totalUnitsAll += totalUnits;
    const limit = effectiveMaterialLimit(region, economy);

    rules.push(pass("M01", `Effective floor price ${effectivePrice} for ${line.regionCode}`));

    if (totalUnits > 0 && !hasPurchaseBranch(state, line.regionCode, openingPurchase)) {
      rules.push(
        fail("M07", "ERR_MAT_NO_BRANCH", "regionCode", "Material purchase requires a branch in this region", {
          regionCode: line.regionCode,
        })
      );
    } else if (totalUnits > 0) {
      rules.push(pass("M07", "Branch available for material purchase"));
    } else {
      rules.push(pass("M07", "No material purchase in region"));
    }

    if (totalUnits > limit) {
      rules.push(
        fail("M02", "ERR_MAT_REGION_LIMIT", "materials", "Quantity exceeds region material limit", {
          regionCode: line.regionCode,
          totalUnits,
          limit,
        })
      );
    } else {
      rules.push(pass("M02", "Region quantity within limit"));
    }

    if (totalUnits > 0) {
      const bidPrice = line.unitPriceBidManwon ?? effectivePrice;
      if (!Number.isInteger(bidPrice) || bidPrice < effectivePrice) {
        rules.push(
          fail("M06", "ERR_MAT_BID_FLOOR", "unitPriceBidManwon", "Bid price must be at least effective unit price", {
            effectivePrice,
            bidPrice,
          })
        );
      } else {
        rules.push(pass("M06", "Material bid price valid"));
      }
    } else {
      rules.push(pass("M06", "No material bid"));
    }

    for (const [mat, qty] of Object.entries({ units: totalUnits })) {
      if (!Number.isInteger(qty) || qty < 0) {
        rules.push(fail("M02", "ERR_MAT_QTY", mat, `qty must be non-negative integer`));
      }
    }
  }

  if (state.headPurchase === 0 && totalUnitsAll > 0) {
    rules.push(fail("M03", "ERR_MAT_NO_PURCHASE_HEAD", "materials", "Purchase headcount required for material purchase"));
  } else if (totalUnitsAll > state.purchaseCapacity) {
    rules.push(
      fail("M03", "ERR_MAT_CAPACITY", "materials", "Total units exceed purchase capacity", {
        totalUnits: totalUnitsAll,
        capacity: state.purchaseCapacity,
      })
    );
  } else {
    rules.push(pass("M03", "Purchase capacity sufficient"));
  }

  if (computed.cashAfterManwon < 0) {
    rules.push(
      fail("M04", "ERR_MAT_CASH", "lines", "Insufficient cash for material purchase", {
        cashBeforeManwon: state.cashManwon,
        totalCostManwon: computed.totalCostManwon,
      })
    );
  } else {
    rules.push(pass("M04", "Sufficient cash"));
  }

  const projectedBranches = projectedPurchaseBranchRegions(state, payload.branches ?? []);
  if (projectedBranches.size > MAX_PURCHASE_BRANCH_REGIONS) {
    rules.push(
      fail("M05", "ERR_BRANCH_REGION_CAP", "branches", "Purchase branch region count exceeds catalog limit", {
        cap: MAX_PURCHASE_BRANCH_REGIONS,
        projected: projectedBranches.size,
      })
    );
  } else {
    rules.push(pass("M05", `Purchase branches within catalog limit (${projectedBranches.size}/${MAX_PURCHASE_BRANCH_REGIONS})`));
  }

  const purchasingRegions = purchasingRegionsFromMaterialPayload(payload);
  const purchaseRegionCap = regionExpansionCap(year);
  if (purchasingRegions.size > purchaseRegionCap) {
    rules.push(
      fail("M09", "ERR_MAT_REGION_CAP", "lines", "Purchase region count exceeds year limit", {
        year,
        cap: purchaseRegionCap,
        count: purchasingRegions.size,
      })
    );
  } else {
    rules.push(
      pass("M09", `Purchase regions within ${year}년차 limit (${purchasingRegions.size}/${purchaseRegionCap})`)
    );
  }

  return { validation: result(rules), computed };
}

export function applyMaterialToState(
  state: CompanyOperationalState,
  computed: ReturnType<typeof computeMaterial>
): CompanyOperationalState {
  const next = { ...state };
  next.cashManwon = computed.cashAfterManwon;
  next.rawMaterialQty = computed.rawMaterialQtyAfter;
  next.inventoryCostManwon = state.inventoryCostManwon + computed.materialCostManwon;
  next.openBranches = [...new Set([...state.openBranches, ...computed.newBranches])];
  next.equityManwon = computeEquity(next);
  return next;
}

function avgMaterialUnitCost(state: CompanyOperationalState): number {
  if (state.rawMaterialQty <= 0) return 0;
  return state.inventoryCostManwon / state.rawMaterialQty;
}

export function computeProduction(payload: ProductionPayload, state: CompanyOperationalState, economy: EconomyValues) {
  const maxByMaterial = Math.floor(state.rawMaterialQty / GAME_CONSTANTS.bomRatio);
  const maxByMachine =
    payload.machineBigRun * GAME_CONSTANTS.machineLargeCapacity +
    payload.machineSmallRun * GAME_CONSTANTS.machineSmallCapacity;
  const maxByLabor = state.headProduction * GAME_CONSTANTS.productionCapacityPerHead;
  const maxProduction = Math.min(maxByMaterial, maxByMachine, maxByLabor);

  const materialUnitsConsumed = payload.productionQty * GAME_CONSTANTS.bomRatio;
  const unitMatCost = avgMaterialUnitCost(state);
  const materialCostConsumedManwon = Math.round(unitMatCost * materialUnitsConsumed);

  const machineOpCostManwon =
    payload.machineBigRun * GAME_CONSTANTS.machineBigOperatingCostManwon +
    payload.machineSmallRun * GAME_CONSTANTS.machineSmallOperatingCostManwon;
  const carbonTaxManwon = Math.round(payload.productionQty * economy.carbonTaxRatePerUnit);
  const totalManufacturingCostManwon = materialCostConsumedManwon + machineOpCostManwon + carbonTaxManwon;
  const unitManufacturingCostManwon =
    payload.productionQty > 0 ? Math.round(totalManufacturingCostManwon / payload.productionQty) : 0;

  const rawMaterialQtyAfter = state.rawMaterialQty - materialUnitsConsumed;
  const inventoryCostAfterManwon = Math.max(0, state.inventoryCostManwon - materialCostConsumedManwon);
  const finishedGoodsQtyAfter = state.finishedGoodsQty + payload.productionQty;
  const finishedGoodsCostAfterManwon = state.finishedGoodsCostManwon + materialCostConsumedManwon;
  const unitFinishedGoodsCostManwon =
    finishedGoodsQtyAfter > 0 ? Math.round(finishedGoodsCostAfterManwon / finishedGoodsQtyAfter) : 0;

  const cashAfterManwon = state.cashManwon - machineOpCostManwon - carbonTaxManwon;

  return {
    maxByMaterial,
    maxByMachine,
    maxByLabor,
    maxProduction,
    materialUnitsConsumed,
    materialCostConsumedManwon,
    machineOpCostManwon,
    carbonTaxManwon,
    totalManufacturingCostManwon,
    unitManufacturingCostManwon,
    finishedGoodsQtyAfter,
    finishedGoodsCostAfterManwon,
    unitFinishedGoodsCostManwon,
    cashAfterManwon,
    rawMaterialQtyAfter,
    inventoryCostAfterManwon,
  };
}

export function validateProduction(
  payload: ProductionPayload,
  state: CompanyOperationalState,
  economy: EconomyValues
) {
  const computed = computeProduction(payload, state, economy);
  const rules: ValidationRuleResult[] = [];

  if (!Number.isInteger(payload.productionQty) || payload.productionQty < 0) {
    rules.push(fail("P04", "ERR_PROD_NEGATIVE", "productionQty", "productionQty must be non-negative integer"));
  } else {
    rules.push(pass("P04", "Production qty valid"));
  }

  if (!Number.isInteger(payload.machineBigRun) || payload.machineBigRun < 0) {
    rules.push(fail("P02", "ERR_MACHINE_RUN_BIG", "machineBigRun", "machineBigRun invalid"));
  } else if (payload.machineBigRun > state.machineBig) {
    rules.push(fail("P02", "ERR_MACHINE_RUN_BIG", "machineBigRun", "Big machine run exceeds owned"));
  } else {
    rules.push(pass("P02", "Big machine run valid"));
  }

  if (!Number.isInteger(payload.machineSmallRun) || payload.machineSmallRun < 0) {
    rules.push(fail("P03", "ERR_MACHINE_RUN_SMALL", "machineSmallRun", "machineSmallRun invalid"));
  } else if (payload.machineSmallRun > state.machineSmall) {
    rules.push(fail("P03", "ERR_MACHINE_RUN_SMALL", "machineSmallRun", "Small machine run exceeds owned"));
  } else {
    rules.push(pass("P03", "Small machine run valid"));
  }

  if (payload.productionQty > computed.maxProduction) {
    rules.push(
      fail("P01", "ERR_PROD_MAX", "productionQty", "Production exceeds capacity", {
        productionQty: payload.productionQty,
        maxProduction: computed.maxProduction,
      })
    );
  } else {
    rules.push(pass("P01", "Production within capacity"));
  }

  if (computed.cashAfterManwon < 0) {
    rules.push(fail("P01", "ERR_PROD_CASH", "productionQty", "Insufficient cash for machine operating cost"));
  }

  return { validation: result(rules), computed };
}

export function applyProductionToState(
  state: CompanyOperationalState,
  payload: ProductionPayload,
  computed: ReturnType<typeof computeProduction>
): CompanyOperationalState {
  const next = { ...state };
  next.cashManwon = computed.cashAfterManwon;
  next.rawMaterialQty = computed.rawMaterialQtyAfter;
  next.inventoryCostManwon = computed.inventoryCostAfterManwon;
  next.finishedGoodsQty = computed.finishedGoodsQtyAfter;
  next.finishedGoodsCostManwon = computed.finishedGoodsCostAfterManwon;
  next.unitFinishedGoodsCostManwon = computed.unitFinishedGoodsCostManwon;
  next.halfYearProductionQty += payload.productionQty;
  next.equityManwon = computeEquity(next);
  return next;
}

export function computeSales(payload: SalesPayload, state: CompanyOperationalState, economy: EconomyValues) {
  const branches = payload.branchesNew ?? [];
  const newSalesBranches: string[] = [];
  let branchFeesManwon = 0;
  const seenNew = new Set<string>();

  for (const branch of branches) {
    if (!isRegionCode(branch.regionCode)) continue;
    if (isSalesBranchOpened(state, branch.regionCode)) continue;
    if (seenNew.has(branch.regionCode)) continue;
    seenNew.add(branch.regionCode);
    newSalesBranches.push(branch.regionCode);
    branchFeesManwon += getRegion(branch.regionCode).salesSetupFeeManwon;
  }

  const lines = [];
  let totalRevenueManwon = 0;
  let totalSoldQty = 0;

  for (const line of payload.lines ?? []) {
    if (!isRegionCode(line.regionCode)) continue;
    const region = getRegion(line.regionCode);
    const effectiveLimit = effectiveSaleLimit(region, economy);
    const revenueManwon = line.qty * line.unitPriceManwon;
    totalRevenueManwon += revenueManwon;
    totalSoldQty += line.qty;
    lines.push({
      regionCode: line.regionCode,
      unitPriceManwon: line.unitPriceManwon,
      qty: line.qty,
      revenueManwon,
      effectiveSaleLimit: effectiveLimit,
    });
  }

  const cogsManwon = Math.round(totalSoldQty * state.unitFinishedGoodsCostManwon);
  const logisticsSalesManwon = salesLogisticsCostManwon(totalSoldQty, economy);
  const cashAfterManwon = state.cashManwon + totalRevenueManwon - logisticsSalesManwon - branchFeesManwon;
  const finishedGoodsQtyAfter = state.finishedGoodsQty - totalSoldQty;
  const finishedGoodsCostAfterManwon = Math.max(0, state.finishedGoodsCostManwon - cogsManwon);

  return {
    lines,
    branchFeesManwon,
    totalRevenueManwon,
    totalSoldQty,
    cogsManwon,
    logisticsSalesManwon,
    cashAfterManwon,
    finishedGoodsQtyAfter,
    finishedGoodsCostAfterManwon,
    newSalesBranches,
  };
}

export function validateSales(payload: SalesPayload, state: CompanyOperationalState, economy: EconomyValues, year = 1) {
  const computed = computeSales(payload, state, economy);
  const rules: ValidationRuleResult[] = [];
  let totalSoldQty = 0;
  const openingSales = openingSalesRegions(payload);

  for (const line of payload.lines ?? []) {
    if (!isRegionCode(line.regionCode)) {
      rules.push(fail("S01", "ERR_SALE_REGION", "regionCode", `Unknown region: ${line.regionCode}`));
      continue;
    }
    const region = getRegion(line.regionCode);
    totalSoldQty += line.qty;

    if (line.qty > 0 && !hasSalesBranch(state, line.regionCode, openingSales)) {
      rules.push(
        fail("S07", "ERR_SALE_NO_BRANCH", "regionCode", "Sales require a branch in this region", {
          regionCode: line.regionCode,
        })
      );
    } else if (line.qty > 0) {
      rules.push(pass("S07", "Branch available for sales"));
    } else {
      rules.push(pass("S07", "No sales in region"));
    }

    if (!Number.isInteger(line.qty) || line.qty < 0) {
      rules.push(fail("S02", "ERR_SALE_QTY", "qty", "qty must be non-negative integer"));
    }
    if (!Number.isInteger(line.unitPriceManwon) || line.unitPriceManwon < 0) {
      rules.push(fail("S01", "ERR_SALE_PRICE", "unitPriceManwon", "unitPrice invalid"));
    } else if (line.unitPriceManwon > region.maxSalePriceManwon) {
      rules.push(
        fail("S01", "ERR_SALE_PRICE", "unitPriceManwon", "Price exceeds region max", {
          max: region.maxSalePriceManwon,
        })
      );
    } else {
      rules.push(pass("S01", "Sale price within limit"));
    }

    const limit = effectiveSaleLimit(region, economy);
    if (line.qty > limit) {
      rules.push(fail("S02", "ERR_SALE_REGION_QTY", "qty", "Qty exceeds region sale limit", { limit }));
    } else {
      rules.push(pass("S02", "Region sale qty valid"));
    }

    if (line.qty > 0) {
      rules.push(pass("S06", "Sales bid registered for clearing"));
    } else {
      rules.push(pass("S06", "No sales bid"));
    }
  }

  if (totalSoldQty > state.salesCapacity) {
    rules.push(fail("S03", "ERR_SALE_CAPACITY", "lines", "Total sales exceed sales headcount capacity"));
  } else {
    rules.push(pass("S03", "Sales capacity sufficient"));
  }

  const sellingRegions = sellingRegionsFromSalesPayload(payload);
  const salesRegionCap = regionExpansionCap(year);
  if (sellingRegions.size > salesRegionCap) {
    rules.push(
      fail("S09", "ERR_SALE_REGION_CAP", "lines", "Sales region count exceeds year limit", {
        year,
        cap: salesRegionCap,
        count: sellingRegions.size,
      })
    );
  } else {
    rules.push(
      pass("S09", `Sales regions within ${year}년차 limit (${sellingRegions.size}/${salesRegionCap})`)
    );
  }

  if (totalSoldQty > state.finishedGoodsQty) {
    rules.push(fail("S04", "ERR_SALE_INVENTORY", "lines", "Sales exceed finished goods inventory"));
  } else {
    rules.push(pass("S04", "Finished goods sufficient"));
  }

  if (computed.cashAfterManwon < 0) {
    rules.push(fail("S05", "ERR_SALE_CASH", "lines", "Cash would become negative after sales"));
  } else {
    rules.push(pass("S05", "Cash sufficient after sales"));
  }

  const projectedRegions = projectedSalesBranchRegions(state, payload.branchesNew ?? []);
  const cap = regionExpansionCap(year);
  if (projectedRegions.size > cap) {
    rules.push(
      fail("S08", "ERR_BRANCH_YEAR_CAP", "branchesNew", "Sales branch count exceeds year limit", {
        year,
        cap,
        projected: projectedRegions.size,
      })
    );
  } else {
    rules.push(pass("S08", `Regional branches within ${year}년차 limit (${projectedRegions.size}/${cap})`));
  }

  return { validation: result(rules), computed };
}

export function applySalesToState(
  state: CompanyOperationalState,
  computed: ReturnType<typeof computeSales>
): CompanyOperationalState {
  const next = { ...state };
  next.cashManwon = computed.cashAfterManwon;
  next.finishedGoodsQty = computed.finishedGoodsQtyAfter;
  next.finishedGoodsCostManwon = computed.finishedGoodsCostAfterManwon;
  next.unitFinishedGoodsCostManwon =
    next.finishedGoodsQty > 0 ? Math.round(next.finishedGoodsCostManwon / next.finishedGoodsQty) : 0;
  next.halfYearSalesQty += computed.totalSoldQty;
  next.halfYearRevenueManwon += computed.totalRevenueManwon;
  next.openSalesBranches = [...new Set([...state.openSalesBranches, ...computed.newSalesBranches])];
  next.equityManwon = computeEquity(next);
  return next;
}
