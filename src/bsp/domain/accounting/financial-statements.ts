import {
  ACCOUNT_CODES,
  GAME_CONSTANTS,
  type CompanyOperationalState,
  type EconomyValues,
  type FinancialStatementsDto,
} from "../types";
import type { LedgerMap } from "./ledger";
import { normalizeLiabilityBalance } from "./ledger";
import { buildTrialBalance } from "./trial-balance";

function ledgerExpense(balances: LedgerMap, code: string): number {
  const raw = balances.get(code) ?? 0;
  return raw > 0 ? raw : 0;
}

function ledgerIncome(balances: LedgerMap, code: string): number {
  const raw = balances.get(code) ?? 0;
  return raw < 0 ? -raw : raw;
}

function computePayrollForecast(operational: CompanyOperationalState, economy: EconomyValues) {
  const base =
    operational.headPurchase * GAME_CONSTANTS.payrollPurchaseManwonPerHeadHalf +
    operational.headProduction * GAME_CONSTANTS.payrollProductionManwonPerHeadHalf +
    operational.headSales * GAME_CONSTANTS.payrollSalesManwonPerHeadHalf;
  const scaled = Math.round(base * economy.payrollCostMultiplier);
  const welfare = Math.round(scaled * (GAME_CONSTANTS.welfareRatePercent / 100));
  return { basePayroll: scaled, welfare };
}

export function buildFinancialStatements(
  balances: LedgerMap,
  periodLabel: string,
  companyId: string,
  operational: CompanyOperationalState,
  economy: EconomyValues
): FinancialStatementsDto {
  const trialBalance = buildTrialBalance(balances);

  const cash = balances.get(ACCOUNT_CODES.CASH) ?? 0;
  const deposits = balances.get(ACCOUNT_CODES.DEPOSITS) ?? 0;
  const rawMaterials = balances.get(ACCOUNT_CODES.RAW_MATERIALS_INVENTORY) ?? 0;
  const finishedGoods = balances.get(ACCOUNT_CODES.FINISHED_GOODS) ?? 0;
  const land = balances.get(ACCOUNT_CODES.LAND) ?? 0;
  const machinery = balances.get(ACCOUNT_CODES.MACHINERY) ?? 0;
  const accumDepRaw = balances.get(ACCOUNT_CODES.ACCUM_DEPRECIATION) ?? 0;
  const accumDepreciation = accumDepRaw <= 0 ? -accumDepRaw : accumDepRaw;
  const debt = normalizeLiabilityBalance(balances.get(ACCOUNT_CODES.LONG_TERM_DEBT) ?? 0);
  const accruedPayroll = normalizeLiabilityBalance(balances.get(ACCOUNT_CODES.ACCRUED_PAYROLL) ?? 0);
  const equity = balances.get(ACCOUNT_CODES.EQUITY) ?? 0;
  const retained = balances.get(ACCOUNT_CODES.RETAINED_EARNINGS) ?? 0;

  const totalAssets =
    cash + deposits + rawMaterials + finishedGoods + land + (machinery - accumDepreciation);

  const revenue = ledgerIncome(balances, ACCOUNT_CODES.SALES_REVENUE);
  const cogsFromLedger = ledgerExpense(balances, ACCOUNT_CODES.COGS);
  const logisticsMaterial = ledgerExpense(balances, ACCOUNT_CODES.LOGISTICS_MATERIAL);
  const machineOperating = ledgerExpense(balances, ACCOUNT_CODES.MACHINE_OPERATING);
  const depreciation = ledgerExpense(balances, ACCOUNT_CODES.DEPRECIATION);
  const branchSetup = ledgerExpense(balances, ACCOUNT_CODES.BRANCH_SETUP);
  const logisticsProduct = ledgerExpense(balances, ACCOUNT_CODES.LOGISTICS_PRODUCT);
  const payrollPPFromLedger = ledgerExpense(balances, ACCOUNT_CODES.PAYROLL_PURCHASE_PRODUCTION);
  const payrollSalesFromLedger = ledgerExpense(balances, ACCOUNT_CODES.PAYROLL_SALES);
  const welfareFromLedger = ledgerExpense(balances, ACCOUNT_CODES.WELFARE);
  const interestIncome = ledgerIncome(balances, ACCOUNT_CODES.INTEREST_INCOME);
  const interestExpense = ledgerExpense(balances, ACCOUNT_CODES.INTEREST_EXPENSE);
  const miscIncome = ledgerIncome(balances, ACCOUNT_CODES.MISC_INCOME);
  const corporateTax = ledgerExpense(balances, ACCOUNT_CODES.CORPORATE_TAX);

  const useForecast =
    !operational.settlementComplete &&
    payrollPPFromLedger === 0 &&
    operational.headPurchase + operational.headProduction + operational.headSales > 0;

  const payrollPurchaseProduction =
    payrollPPFromLedger > 0
      ? payrollPPFromLedger
      : useForecast
        ? Math.round(
            (operational.headPurchase * GAME_CONSTANTS.payrollPurchaseManwonPerHeadHalf +
              operational.headProduction * GAME_CONSTANTS.payrollProductionManwonPerHeadHalf) *
              economy.payrollCostMultiplier
          )
        : 0;
  const payrollSales =
    payrollSalesFromLedger > 0
      ? payrollSalesFromLedger
      : useForecast
        ? Math.round(operational.headSales * GAME_CONSTANTS.payrollSalesManwonPerHeadHalf * economy.payrollCostMultiplier)
        : 0;
  const forecastPayroll = useForecast ? computePayrollForecast(operational, economy) : null;
  const welfareExpense =
    welfareFromLedger > 0 ? welfareFromLedger : forecastPayroll ? forecastPayroll.welfare : 0;

  const materialCost = cogsFromLedger;
  const hiringCost = 0;

  const cogsComponents =
    materialCost +
    logisticsMaterial +
    machineOperating +
    payrollPurchaseProduction +
    depreciation +
    hiringCost;
  const cogs = cogsFromLedger > 0 ? cogsFromLedger : cogsComponents;
  const grossProfit = revenue - cogs;

  const sgaTotal = branchSetup + payrollSales + logisticsProduct + welfareExpense;
  const operatingIncome = grossProfit - sgaTotal;

  const financialIncome = interestIncome;
  const financialExpense = interestExpense;
  const pretaxIncome = operatingIncome + financialIncome - financialExpense + miscIncome;
  const tax = corporateTax > 0 ? corporateTax : 0;
  const netIncome = pretaxIncome - tax;

  const hasPayrollForecastOnly = useForecast;

  return {
    companyId,
    periodLabel,
    trialBalance,
    balanceSheet: {
      assets: {
        cash,
        deposits,
        rawMaterials,
        finishedGoods,
        land,
        machinery,
        accumDepreciation,
        total: totalAssets,
      },
      liabilities: {
        longTermDebt: debt,
        accruedPayroll,
        total: debt + accruedPayroll,
      },
      equity: { capital: equity, retainedEarnings: retained, total: equity + retained },
    },
    profitAndLoss: {
      revenue,
      cogs,
      cogsBreakdown: {
        hiringCost,
        materialCost,
        logisticsMaterial,
        machineOperating,
        payrollPurchaseProduction,
        depreciation,
      },
      grossProfit,
      sga: {
        branchSetup,
        payrollSales,
        logisticsProduct,
        welfare: welfareExpense,
        total: sgaTotal,
      },
      operatingIncome,
      financialIncome,
      financialExpense,
      miscIncome,
      pretaxIncome,
      corporateTax: tax,
      netIncome,
      payrollForecastNote: hasPayrollForecastOnly
        ? "인건비·복리후생은 D-12에 따라 Settlement 시 분개·확정됩니다. 현재는 예상치입니다."
        : undefined,
    },
  };
}
