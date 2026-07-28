import {
  ACCOUNT_CODES,
  GAME_CONSTANTS,
  type CompanyOperationalState,
  type EconomyValues,
  type JournalEntryInput,
  type SettlementComputed,
} from "../types";
import { computePayrollForecast } from "../validation/step-validators";
import { buildFinancialStatements } from "./financial-statements";
import type { LedgerMap } from "./ledger";
import { applyJournalToBalances } from "./ledger";

export interface SettlementInput {
  operational: CompanyOperationalState;
  ledger: LedgerMap;
  economy: EconomyValues;
  miscIncomeManwon?: number;
}

export function computeSettlementAmounts(input: SettlementInput): SettlementComputed {
  const { operational, ledger, economy } = input;
  const miscIncomeManwon = input.miscIncomeManwon ?? operational.miscIncomeManwon ?? 0;

  const payrollPurchaseProductionManwon = Math.round(
    (operational.headPurchase * GAME_CONSTANTS.payrollPurchaseManwonPerHeadHalf +
      operational.headProduction * GAME_CONSTANTS.payrollProductionManwonPerHeadHalf) *
      economy.payrollCostMultiplier
  );
  const payrollSalesManwon = Math.round(
    operational.headSales * GAME_CONSTANTS.payrollSalesManwonPerHeadHalf * economy.payrollCostMultiplier
  );
  const { welfareForecastHalfManwon: welfareManwon } = computePayrollForecast(
    operational.headPurchase,
    operational.headProduction,
    operational.headSales,
    economy.payrollCostMultiplier
  );

  const machinery = ledger.get(ACCOUNT_CODES.MACHINERY) ?? 0;
  const depreciationManwon = Math.round(machinery * GAME_CONSTANTS.machineryDepreciationRateHalf);

  const depositBalance = operational.depositManwon;
  const debtBalance = operational.debtManwon;
  const interestIncomeManwon = Math.round(
    depositBalance * (economy.interestRateDeposit / 100) * GAME_CONSTANTS.halfYearFraction
  );
  const interestExpenseManwon = Math.round(
    debtBalance * (economy.interestRateLoan / 100) * GAME_CONSTANTS.halfYearFraction
  );

  let tempLedger = new Map(ledger);
  for (const journal of buildSettlementJournals({
    payrollPurchaseProductionManwon,
    payrollSalesManwon,
    welfareManwon,
    depreciationManwon,
    interestIncomeManwon,
    interestExpenseManwon,
    miscIncomeManwon,
    pretaxIncomeManwon: 0,
    corporateTaxManwon: 0,
    netIncomeManwon: 0,
  }).filter((j) => j.transactionType !== "SETTLEMENT_CLOSE")) {
    tempLedger = applyJournalToBalances(tempLedger, journal);
  }

  const pretaxFs = buildFinancialStatements(
    tempLedger,
    "settlement",
    "tmp",
    operational,
    economy
  );
  const pretaxIncomeManwon = pretaxFs.profitAndLoss.pretaxIncome;
  const corporateTaxManwon = Math.round(
    Math.max(0, pretaxIncomeManwon) * (economy.corporateTaxRate / 100)
  );

  if (corporateTaxManwon > 0) {
    tempLedger = applyJournalToBalances(tempLedger, {
      transactionType: "SETTLEMENT_TAX",
      description: "법인세",
      lines: [
        { accountCode: ACCOUNT_CODES.CORPORATE_TAX, debitManwon: corporateTaxManwon, creditManwon: 0, memo: "법인세" },
        { accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: corporateTaxManwon, memo: "법인세 납부" },
      ],
    });
  }

  const finalFs = buildFinancialStatements(tempLedger, "settlement", "tmp", operational, economy);
  const netIncomeManwon = finalFs.profitAndLoss.netIncome;

  return {
    payrollPurchaseProductionManwon,
    payrollSalesManwon,
    welfareManwon,
    depreciationManwon,
    interestIncomeManwon,
    interestExpenseManwon,
    miscIncomeManwon,
    pretaxIncomeManwon,
    corporateTaxManwon,
    netIncomeManwon,
  };
}

export function buildSettlementJournals(computed: SettlementComputed): JournalEntryInput[] {
  const journals: JournalEntryInput[] = [];

  const payrollTotal =
    computed.payrollPurchaseProductionManwon + computed.payrollSalesManwon + computed.welfareManwon;
  if (payrollTotal > 0) {
    const lines = [];
    if (computed.payrollPurchaseProductionManwon > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.PAYROLL_PURCHASE_PRODUCTION,
        debitManwon: computed.payrollPurchaseProductionManwon,
        creditManwon: 0,
        memo: "인건비(구매·생산)",
      });
    }
    if (computed.payrollSalesManwon > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.PAYROLL_SALES,
        debitManwon: computed.payrollSalesManwon,
        creditManwon: 0,
        memo: "인건비(영업)",
      });
    }
    if (computed.welfareManwon > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.WELFARE,
        debitManwon: computed.welfareManwon,
        creditManwon: 0,
        memo: "복리후생비",
      });
    }
    lines.push({
      accountCode: ACCOUNT_CODES.ACCRUED_PAYROLL,
      debitManwon: 0,
      creditManwon: payrollTotal,
      memo: "미지급급여",
    });
    journals.push({
      transactionType: "SETTLEMENT_PAYROLL",
      description: "Step 7 — 인건비·복리후생 accrual (D-12)",
      lines,
    });
  }

  if (computed.depreciationManwon > 0) {
    journals.push({
      transactionType: "SETTLEMENT_DEPR",
      description: "Step 7 — 감가상각",
      lines: [
        { accountCode: ACCOUNT_CODES.DEPRECIATION, debitManwon: computed.depreciationManwon, creditManwon: 0, memo: "감가상각비" },
        { accountCode: ACCOUNT_CODES.ACCUM_DEPRECIATION, debitManwon: 0, creditManwon: computed.depreciationManwon, memo: "감가상각누계" },
      ],
    });
  }

  if (computed.interestExpenseManwon > 0) {
    journals.push({
      transactionType: "SETTLEMENT_INTEREST_EXP",
      description: "Step 7 — 이자비용",
      lines: [
        { accountCode: ACCOUNT_CODES.INTEREST_EXPENSE, debitManwon: computed.interestExpenseManwon, creditManwon: 0, memo: "이자비용" },
        { accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: computed.interestExpenseManwon, memo: "이자 지급" },
      ],
    });
  }

  if (computed.interestIncomeManwon > 0) {
    journals.push({
      transactionType: "SETTLEMENT_INTEREST_INC",
      description: "Step 7 — 이자수익",
      lines: [
        { accountCode: ACCOUNT_CODES.CASH, debitManwon: computed.interestIncomeManwon, creditManwon: 0, memo: "이자 수취" },
        { accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitManwon: 0, creditManwon: computed.interestIncomeManwon, memo: "이자수익" },
      ],
    });
  }

  if (computed.miscIncomeManwon > 0) {
    journals.push({
      transactionType: "SETTLEMENT_MISC",
      description: "Step 7 — 잡수익",
      lines: [
        { accountCode: ACCOUNT_CODES.CASH, debitManwon: computed.miscIncomeManwon, creditManwon: 0, memo: "잡수익" },
        { accountCode: ACCOUNT_CODES.MISC_INCOME, debitManwon: 0, creditManwon: computed.miscIncomeManwon, memo: "잡수익" },
      ],
    });
  }

  if (computed.corporateTaxManwon > 0) {
    journals.push({
      transactionType: "SETTLEMENT_TAX",
      description: "Step 7 — 법인세",
      lines: [
        { accountCode: ACCOUNT_CODES.CORPORATE_TAX, debitManwon: computed.corporateTaxManwon, creditManwon: 0, memo: "법인세" },
        { accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: computed.corporateTaxManwon, memo: "법인세 납부" },
      ],
    });
  }

  if (computed.netIncomeManwon !== 0) {
    const abs = Math.abs(computed.netIncomeManwon);
    const lines =
      computed.netIncomeManwon > 0
        ? [
            { accountCode: ACCOUNT_CODES.PERIOD_CLEARING, debitManwon: abs, creditManwon: 0, memo: "기간손익 대체" },
            { accountCode: ACCOUNT_CODES.RETAINED_EARNINGS, debitManwon: 0, creditManwon: abs, memo: "당기순이익" },
          ]
        : [
            { accountCode: ACCOUNT_CODES.RETAINED_EARNINGS, debitManwon: abs, creditManwon: 0, memo: "당기순손실" },
            { accountCode: ACCOUNT_CODES.PERIOD_CLEARING, debitManwon: 0, creditManwon: abs, memo: "기간손익 대체" },
          ];
    journals.push({
      transactionType: "SETTLEMENT_CLOSE",
      description: "Step 7 — 이익잉여금 반영",
      lines,
    });
  }

  return journals;
}

export function applySettlementToState(
  state: CompanyOperationalState,
  computed: SettlementComputed,
  ledger: LedgerMap
): CompanyOperationalState {
  const next = { ...state };
  const cash = ledger.get(ACCOUNT_CODES.CASH) ?? 0;
  next.cashManwon = cash;
  next.payrollForecastHalfManwon = 0;
  next.welfareForecastHalfManwon = 0;
  next.settlementComplete = true;
  next.journalsLocked = true;
  next.equityManwon = computeEquityFromLedger(ledger, next);
  return next;
}

function computeEquityFromLedger(ledger: LedgerMap, state: CompanyOperationalState): number {
  const cash = ledger.get(ACCOUNT_CODES.CASH) ?? 0;
  const deposits = ledger.get(ACCOUNT_CODES.DEPOSITS) ?? 0;
  const rawMaterials = ledger.get(ACCOUNT_CODES.RAW_MATERIALS_INVENTORY) ?? 0;
  const finishedGoods = ledger.get(ACCOUNT_CODES.FINISHED_GOODS) ?? 0;
  const land = ledger.get(ACCOUNT_CODES.LAND) ?? 0;
  const machinery = ledger.get(ACCOUNT_CODES.MACHINERY) ?? 0;
  const accumDep = ledger.get(ACCOUNT_CODES.ACCUM_DEPRECIATION) ?? 0;
  const accumDepNorm = accumDep <= 0 ? -accumDep : accumDep;
  const debt = ledger.get(ACCOUNT_CODES.LONG_TERM_DEBT) ?? 0;
  const debtNorm = debt <= 0 ? -debt : debt;
  const equity = ledger.get(ACCOUNT_CODES.EQUITY) ?? 0;
  const retained = ledger.get(ACCOUNT_CODES.RETAINED_EARNINGS) ?? 0;
  const assets = cash + deposits + rawMaterials + finishedGoods + land + machinery - accumDepNorm;
  return assets - debtNorm;
}

export function runSettlementPipeline(input: SettlementInput): {
  computed: SettlementComputed;
  journals: JournalEntryInput[];
  ledger: LedgerMap;
  operational: CompanyOperationalState;
} {
  const computed = computeSettlementAmounts(input);
  const journals = buildSettlementJournals(computed);
  let ledger = new Map(input.ledger);
  for (const journal of journals) {
    ledger = applyJournalToBalances(ledger, journal);
  }
  const operational = applySettlementToState(input.operational, computed, ledger);
  return { computed, journals, ledger, operational };
}
