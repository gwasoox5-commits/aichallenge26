import { ACCOUNT_CODES, type CompanyOperationalState } from "../types";
import { computePayrollForecast } from "../validation/step-validators";
import type { LedgerMap } from "../accounting/ledger";

/** Reset per-half counters while preserving balance-sheet carry-forward from ledger. */
export function prepareOperationalForNextHalf(
  operational: CompanyOperationalState,
  ledger: LedgerMap,
  payrollMultiplier = 1
): CompanyOperationalState {
  const cash = ledger.get(ACCOUNT_CODES.CASH) ?? 0;
  const deposits = ledger.get(ACCOUNT_CODES.DEPOSITS) ?? 0;
  const rawMaterialsCost = ledger.get(ACCOUNT_CODES.RAW_MATERIALS_INVENTORY) ?? 0;
  const finishedGoodsCost = ledger.get(ACCOUNT_CODES.FINISHED_GOODS) ?? 0;
  const debtRaw = ledger.get(ACCOUNT_CODES.LONG_TERM_DEBT) ?? 0;
  const debtManwon = debtRaw <= 0 ? -debtRaw : debtRaw;
  const equityRaw = ledger.get(ACCOUNT_CODES.EQUITY) ?? 0;
  const retained = ledger.get(ACCOUNT_CODES.RETAINED_EARNINGS) ?? 0;
  const equityManwon = equityRaw + retained;

  const { payrollForecastHalfManwon, welfareForecastHalfManwon } = computePayrollForecast(
    operational.headPurchase,
    operational.headProduction,
    operational.headSales,
    payrollMultiplier
  );

  return {
    ...operational,
    cashManwon: cash,
    depositManwon: deposits,
    debtManwon,
    equityManwon,
    inventoryCostManwon: rawMaterialsCost,
    finishedGoodsCostManwon: finishedGoodsCost,
    unitFinishedGoodsCostManwon:
      operational.finishedGoodsQty > 0
        ? Math.round(finishedGoodsCost / operational.finishedGoodsQty)
        : 0,
    halfYearProductionQty: 0,
    halfYearSalesQty: 0,
    halfYearRevenueManwon: 0,
    miscIncomeManwon: 0,
    netIncomeManwon: 0,
    settlementComplete: false,
    journalsLocked: false,
    payrollForecastHalfManwon,
    welfareForecastHalfManwon,
  };
}
