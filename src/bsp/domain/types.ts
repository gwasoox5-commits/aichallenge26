export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

export const GAME_CONSTANTS = {
  currencyUnit: "MANWON" as const,
  initialCashManwon: 10_000,
  initialEquityManwon: 10_000,
  bomRatio: 4,
  loanRatePercent: 10,
  depositRatePercent: 5,
  landPriceManwon: 3_000,
  landMaxPlots: 4,
  machineLargeCostManwon: 600,
  machineLargeCapacity: 30,
  machineSmallCostManwon: 300,
  machineSmallCapacity: 10,
  loanMidMaxManwon: 10_000,
  loanUnitManwon: 1_000,
  payrollPurchaseManwonPerHeadHalf: 300,
  payrollProductionManwonPerHeadHalf: 300,
  payrollSalesManwonPerHeadHalf: 300,
  welfareRatePercent: 15,
  purchaseCapacityPerHead: 30,
  productionCapacityPerHead: 10,
  salesCapacityPerHead: 10,
  logisticsPerUnitManwon: 5,
  salesLogisticsPerUnitManwon: 10,
  machineBigOperatingCostManwon: 80,
  machineSmallOperatingCostManwon: 40,
  halfYearFraction: 0.5,
  machineryDepreciationRateHalf: 0.05,
} as const;

export const ACCOUNT_CODES = {
  CASH: "1100",
  DEPOSITS: "1200",
  RAW_MATERIALS_INVENTORY: "1300",
  FINISHED_GOODS: "1400",
  LAND: "1500",
  MACHINERY: "1510",
  ACCUM_DEPRECIATION: "1520",
  LONG_TERM_DEBT: "2100",
  ACCRUED_PAYROLL: "2120",
  EQUITY: "3100",
  RETAINED_EARNINGS: "3200",
  SALES_REVENUE: "4100",
  COGS: "5100",
  WIP: "5200",
  PAYROLL_PURCHASE_PRODUCTION: "6100",
  PAYROLL_SALES: "6110",
  WELFARE: "6120",
  LOGISTICS_MATERIAL: "6300",
  LOGISTICS_PRODUCT: "6310",
  BRANCH_SETUP: "6400",
  MACHINE_OPERATING: "6500",
  DEPRECIATION: "6600",
  INTEREST_INCOME: "7100",
  INTEREST_EXPENSE: "7200",
  MISC_INCOME: "7300",
  CORPORATE_TAX: "7400",
  PERIOD_CLEARING: "3900",
} as const;

export const ACCOUNT_NAMES: Record<keyof typeof ACCOUNT_CODES, string> = {
  CASH: "현금",
  DEPOSITS: "예금",
  RAW_MATERIALS_INVENTORY: "원재료 재고",
  FINISHED_GOODS: "완제품 재고",
  LAND: "토지",
  MACHINERY: "기계",
  ACCUM_DEPRECIATION: "감가상각누계",
  LONG_TERM_DEBT: "장기차입금",
  ACCRUED_PAYROLL: "미지급급여",
  EQUITY: "자본금",
  RETAINED_EARNINGS: "이익잉여금",
  SALES_REVENUE: "매출",
  COGS: "매출원가",
  WIP: "재공품",
  PAYROLL_PURCHASE_PRODUCTION: "인건비(구매·생산)",
  PAYROLL_SALES: "인건비(영업)",
  WELFARE: "복리후생비",
  LOGISTICS_MATERIAL: "물류비(재료)",
  LOGISTICS_PRODUCT: "물류비(제품)",
  BRANCH_SETUP: "브랜치개설비",
  MACHINE_OPERATING: "기계가동비",
  DEPRECIATION: "감가상각비",
  INTEREST_INCOME: "이자수익",
  INTEREST_EXPENSE: "이자비용",
  MISC_INCOME: "잡수익",
  CORPORATE_TAX: "법인세",
  PERIOD_CLEARING: "기간손익대체",
};

export type BspGameStep =
  | "LOAN"
  | "FACILITY"
  | "HIRING"
  | "MATERIAL"
  | "PRODUCTION"
  | "SALES"
  | "SETTLEMENT";

export type BspStepPhase =
  | "STEP1_FINANCE"
  | "STEP2_INVESTMENT"
  | "STEP3_HR"
  | "STEP4_PURCHASE"
  | "STEP5_PRODUCTION"
  | "STEP6_SALES"
  | "STEP7_SETTLEMENT"
  | "HALF_YEAR_END"
  | "GAME_END";

export type BspHalf = "H1" | "H2";

export const OPERATIONAL_STEP_PHASES: BspStepPhase[] = [
  "STEP1_FINANCE",
  "STEP2_INVESTMENT",
  "STEP3_HR",
  "STEP4_PURCHASE",
  "STEP5_PRODUCTION",
  "STEP6_SALES",
  "STEP7_SETTLEMENT",
];

export const ALL_GAME_STEPS: BspGameStep[] = [
  "LOAN",
  "FACILITY",
  "HIRING",
  "MATERIAL",
  "PRODUCTION",
  "SALES",
  "SETTLEMENT",
];

export const STEP_TO_PHASE: Record<BspGameStep, BspStepPhase> = {
  LOAN: "STEP1_FINANCE",
  FACILITY: "STEP2_INVESTMENT",
  HIRING: "STEP3_HR",
  MATERIAL: "STEP4_PURCHASE",
  PRODUCTION: "STEP5_PRODUCTION",
  SALES: "STEP6_SALES",
  SETTLEMENT: "STEP7_SETTLEMENT",
};

export const PHASE_TO_STEP: Partial<Record<BspStepPhase, BspGameStep>> = {
  STEP1_FINANCE: "LOAN",
  STEP2_INVESTMENT: "FACILITY",
  STEP3_HR: "HIRING",
  STEP4_PURCHASE: "MATERIAL",
  STEP5_PRODUCTION: "PRODUCTION",
  STEP6_SALES: "SALES",
  STEP7_SETTLEMENT: "SETTLEMENT",
};

export const NEXT_STEP_PHASE: Partial<Record<BspStepPhase, BspStepPhase>> = {
  STEP1_FINANCE: "STEP2_INVESTMENT",
  STEP2_INVESTMENT: "STEP3_HR",
  STEP3_HR: "STEP4_PURCHASE",
  STEP4_PURCHASE: "STEP5_PRODUCTION",
  STEP5_PRODUCTION: "STEP6_SALES",
  STEP6_SALES: "STEP7_SETTLEMENT",
};

export const PREV_STEP_PHASE: Partial<Record<BspStepPhase, BspStepPhase>> = {
  STEP2_INVESTMENT: "STEP1_FINANCE",
  STEP3_HR: "STEP2_INVESTMENT",
  STEP4_PURCHASE: "STEP3_HR",
  STEP5_PRODUCTION: "STEP4_PURCHASE",
  STEP6_SALES: "STEP5_PRODUCTION",
  STEP7_SETTLEMENT: "STEP6_SALES",
};

/** Default step timer for GM command center (30 min) */
export const DEFAULT_STEP_DURATION_SEC = 30 * 60;

export interface MaterialInventory {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface CompanyOperationalState {
  cashManwon: number;
  debtManwon: number;
  depositManwon: number;
  equityManwon: number;
  landPlots: number;
  machineBig: number;
  machineSmall: number;
  capacityMachine: number;
  maxMaterials: number;
  headPurchase: number;
  headProduction: number;
  headSales: number;
  purchaseCapacity: number;
  productionCapacity: number;
  salesCapacity: number;
  payrollForecastHalfManwon: number;
  welfareForecastHalfManwon: number;
  inventory: MaterialInventory;
  inventoryCostManwon: number;
  finishedGoodsQty: number;
  finishedGoodsCostManwon: number;
  unitFinishedGoodsCostManwon: number;
  halfYearProductionQty: number;
  halfYearSalesQty: number;
  halfYearRevenueManwon: number;
  openBranches: string[];
  openSalesBranches: string[];
  miscIncomeManwon: number;
  netIncomeManwon: number;
  journalsLocked: boolean;
  settlementComplete: boolean;
  periodOpenFinancials?: import("./accounting/period-financial-snapshot").PeriodFinancialSnapshot;
  lastBalanceSheetValidation?: import("./accounting/balance-sheet-validation").BalanceSheetValidationResult;
  lastTrialBalanceValidation?: import("./accounting/balance-sheet-validation").TrialBalanceValidationResult;
  lastExcelDiffReport?: import("./accounting/operational-parity-report").ExcelDiffReport;
}

export interface LoanPayload {
  loanEarly: number;
  loanMid: number;
  deposit: number;
  loanRepayment: number;
  step1UiPhase?: "1A" | "1B" | "COMPLETE";
}

export interface FacilityPayload {
  landPlotsPurchased: number;
  machineBigPurchased: number;
  machineSmallPurchased: number;
}

export type HiringDepartment = "PURCHASE" | "PRODUCTION" | "SALES";

export interface HiringTransfer {
  from: HiringDepartment;
  to: HiringDepartment;
  headcount: number;
}

export interface HiringResignations {
  purchase?: number;
  production?: number;
  sales?: number;
}

export interface HiringPayload {
  headPurchase: number;
  headProduction: number;
  headSales: number;
  transfers?: HiringTransfer[];
  resignations?: HiringResignations;
}

export interface MaterialBranchInput {
  regionCode: string;
  displayName?: string;
}

export interface MaterialLineInput {
  regionCode: string;
  materials: MaterialInventory;
  /** Competitive bid unit price (만원). Higher price wins regional allocation. */
  unitPriceBidManwon?: number;
}

export interface MaterialPayload {
  branches?: MaterialBranchInput[];
  lines: MaterialLineInput[];
}

export interface ProductionPayload {
  productionQty: number;
  machineBigRun: number;
  machineSmallRun: number;
}

export interface SalesLineInput {
  regionCode: string;
  unitPriceManwon: number;
  qty: number;
}

export interface SalesPayload {
  branchesNew?: MaterialBranchInput[];
  lines: SalesLineInput[];
}

export interface ValidationRuleResult {
  ruleId: string;
  errorCode?: string;
  passed: boolean;
  field?: string;
  message: string;
  params?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  rules: ValidationRuleResult[];
}

export interface LoanComputed {
  loanEarlyAmtManwon: number;
  loanMidAmtManwon: number;
  depositAmtManwon: number;
  loanRepaymentAmtManwon: number;
  cashDeltaManwon: number;
  cashAfterManwon: number;
  debtAfterManwon: number;
  depositAfterManwon: number;
}

export interface FacilityComputed {
  landCostManwon: number;
  machineCostManwon: number;
  totalCapexManwon: number;
  capacityMachine: number;
  maxMaterials: number;
  cashAfterManwon: number;
  landPlotsTotal: number;
  machineBigTotal: number;
  machineSmallTotal: number;
}

export interface HiringComputed {
  purchaseCapacity: number;
  productionCapacity: number;
  salesCapacity: number;
  payrollForecastHalfManwon: number;
  welfareForecastHalfManwon: number;
  headPurchaseTotal: number;
  headProductionTotal: number;
  headSalesTotal: number;
}

export interface MaterialLineComputed {
  regionCode: string;
  effectiveUnitPriceManwon: number;
  unitPriceBidManwon: number;
  totalUnits: number;
  materialCostManwon: number;
  logisticsCostManwon: number;
}

export interface MaterialComputed {
  lines: MaterialLineComputed[];
  branchFeesManwon: number;
  materialCostManwon: number;
  logisticsCostManwon: number;
  totalCostManwon: number;
  cashAfterManwon: number;
  inventoryAfter: MaterialInventory;
  newBranches: string[];
}

export interface ProductionComputed {
  maxByMaterial: number;
  maxByMachine: number;
  maxByLabor: number;
  maxProduction: number;
  materialConsumed: MaterialInventory;
  materialCostConsumedManwon: number;
  machineOpCostManwon: number;
  carbonTaxManwon: number;
  totalManufacturingCostManwon: number;
  unitManufacturingCostManwon: number;
  finishedGoodsQtyAfter: number;
  finishedGoodsCostAfterManwon: number;
  unitFinishedGoodsCostManwon: number;
  cashAfterManwon: number;
  inventoryAfter: MaterialInventory;
  inventoryCostAfterManwon: number;
}

export interface SalesLineComputed {
  regionCode: string;
  unitPriceManwon: number;
  qty: number;
  revenueManwon: number;
  effectiveSaleLimit: number;
}

export interface SalesComputed {
  lines: SalesLineComputed[];
  branchFeesManwon: number;
  totalRevenueManwon: number;
  totalSoldQty: number;
  cogsManwon: number;
  logisticsSalesManwon: number;
  cashAfterManwon: number;
  finishedGoodsQtyAfter: number;
  finishedGoodsCostAfterManwon: number;
  newSalesBranches: string[];
}

export interface SettlementComputed {
  payrollPurchaseProductionManwon: number;
  payrollSalesManwon: number;
  welfareManwon: number;
  depreciationManwon: number;
  interestIncomeManwon: number;
  interestExpenseManwon: number;
  miscIncomeManwon: number;
  pretaxIncomeManwon: number;
  corporateTaxManwon: number;
  netIncomeManwon: number;
}

export interface JournalLineInput {
  accountCode: string;
  debitManwon: number;
  creditManwon: number;
  memo?: string;
}

export interface JournalEntryInput {
  transactionType: string;
  description: string;
  lines: JournalLineInput[];
}

export interface DashboardDto {
  companyId: string;
  teamName: string;
  periodIndex: number;
  year: number;
  half: BspHalf;
  periodLabel: string;
  sessionPhase: "RUNNING" | "PREPARE" | "PAUSED" | "FINISHED";
  stepPhase: BspStepPhase;
  cashManwon: number;
  debtManwon: number;
  depositManwon: number;
  equityManwon: number;
  landPlots: number;
  machineBig: number;
  machineSmall: number;
  capacityMachine: number;
  maxMaterials: number;
  headPurchase: number;
  headProduction: number;
  headSales: number;
  purchaseCapacity: number;
  productionCapacity: number;
  salesCapacity: number;
  payrollForecastHalfManwon: number;
  inventoryTotalUnits: number;
  openBranches: string[];
  finishedGoodsQty: number;
  halfYearProductionQty: number;
  halfYearSalesQty: number;
  halfYearRevenueManwon: number;
  netIncomeManwon: number;
  debtRatioPercent: number;
  roePercent: number;
  roaPercent: number;
  economy: EconomyValues;
  recentEvents: string[];
  journalsLocked: boolean;
  settlementComplete: boolean;
  statusVersion: number;
  completedSteps: BspGameStep[];
  /** P8 CEO command dashboard */
  stepStartedAt: string;
  remainingTimeSec: number;
  stepLocked: boolean;
  currentStepSubmitted: boolean;
  stepDurationSec: number;
  economyLabel: string;
  /** Session-wide current-step submission summary (filled by getDashboard) */
  totalTeamCount?: number;
  submittedTeamCount?: number;
  submitRatePercent?: number;
}

export type GmTeamWarningStatus = "OK" | "NOT_SUBMITTED" | "BEHIND";

export interface GmTeamSubmissionStatus {
  companyId: string;
  teamName: string;
  statusVersion: number;
  submittedSteps: BspGameStep[];
  missingSteps: BspGameStep[];
  currentStepSubmitted: boolean;
  lastSubmitAt?: string;
  cashManwon: number;
  halfYearProductionQty: number;
  halfYearSalesQty: number;
  warningStatus: GmTeamWarningStatus;
}

export interface GmRankingEntry {
  rank: number;
  companyId: string;
  teamName: string;
  cashManwon: number;
  netIncomeManwon: number;
  halfYearRevenueManwon: number;
}

export interface GmDeskDto {
  sessionId: string;
  joinCode: string;
  name: string;
  sessionPhase: "RUNNING" | "PREPARE" | "PAUSED" | "FINISHED";
  periodIndex: number;
  year: number;
  half: BspHalf;
  periodLabel: string;
  stepPhase: BspStepPhase;
  stepLocked: boolean;
  stepStartedAt: string;
  stepDurationSec: number;
  remainingTimeSec: number;
  submitRatePercent: number;
  unsubmittedTeamCount: number;
  totalTeamCount: number;
  canStartNextHalf: boolean;
  canEndGame: boolean;
  economy: EconomyValues;
  economyLabel: string;
  currentEventState: string;
  teams: GmTeamSubmissionStatus[];
  ranking: GmRankingEntry[];
  recentEvents: string[];
}

export interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  debitManwon: number;
  creditManwon: number;
}

export interface ProfitAndLossDto {
  revenue: number;
  cogs: number;
  cogsBreakdown: {
    hiringCost: number;
    materialCost: number;
    logisticsMaterial: number;
    machineOperating: number;
    payrollPurchaseProduction: number;
    depreciation: number;
  };
  grossProfit: number;
  sga: {
    branchSetup: number;
    payrollSales: number;
    logisticsProduct: number;
    welfare: number;
    total: number;
  };
  operatingIncome: number;
  financialIncome: number;
  financialExpense: number;
  miscIncome: number;
  pretaxIncome: number;
  corporateTax: number;
  netIncome: number;
  payrollForecastNote?: string;
}

export interface FinancialStatementsDto {
  companyId: string;
  periodLabel: string;
  trialBalance: TrialBalanceLine[];
  balanceSheet: {
    assets: {
      cash: number;
      deposits: number;
      rawMaterials: number;
      finishedGoods: number;
      land: number;
      machinery: number;
      accumDepreciation: number;
      total: number;
    };
    liabilities: { longTermDebt: number; accruedPayroll: number; total: number };
    equity: { capital: number; retainedEarnings: number; total: number };
  };
  profitAndLoss: ProfitAndLossDto;
  balanceSheetValidation?: import("./accounting/balance-sheet-validation").BalanceSheetValidationResult;
  trialBalanceValidation?: import("./accounting/balance-sheet-validation").TrialBalanceValidationResult;
  periodChanges?: import("./accounting/period-financial-snapshot").PeriodFinancialChange[];
}

export interface EconomyValues {
  exchangeRate: number;
  interestRateLoan: number;
  interestRateDeposit: number;
  rawMaterialIndex: number;
  marketDemandIndex: number;
  marketSupplyIndex: number;
  logisticsCostMultiplier: number;
  tariffRate: number;
  corporateTaxRate: number;
  carbonTaxRatePerUnit: number;
  payrollCostMultiplier: number;
  techInnovationIndex: number;
  esgPressureIndex: number;
  businessCycleIndex: number;
}

export interface EconomyPreset {
  id: string;
  label: string;
  description: string;
  learningObjective: string;
  recommendedYear: number;
  effects: Partial<EconomyValues>;
  linkableEventIds: string[];
}

export const DEFAULT_ECONOMY_VALUES: EconomyValues = {
  exchangeRate: 1300,
  interestRateLoan: 10,
  interestRateDeposit: 5,
  rawMaterialIndex: 100,
  marketDemandIndex: 100,
  marketSupplyIndex: 100,
  logisticsCostMultiplier: 1.0,
  tariffRate: 0,
  corporateTaxRate: 22,
  carbonTaxRatePerUnit: 0,
  payrollCostMultiplier: 1.0,
  techInnovationIndex: 100,
  esgPressureIndex: 100,
  businessCycleIndex: 100,
};
