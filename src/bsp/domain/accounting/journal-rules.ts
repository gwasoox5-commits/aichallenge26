import { ACCOUNT_CODES } from "../types";

/** Journal Rule Book — Rule Book §1.6 + §1.7 1:1 mapping (Sprint 2A) */
export interface JournalRuleDefinition {
  ruleId: string;
  transactionType: string;
  step: string;
  ruleBookRef: string;
  description: string;
  debitAccounts: string[];
  creditAccounts: string[];
  notes?: string;
}

export const JOURNAL_RULES: JournalRuleDefinition[] = [
  {
    ruleId: "JR-LOAN-01",
    transactionType: "LOAN",
    step: "LOAN",
    ruleBookRef: "§1.6 Step1 · D-01/D-03",
    description: "연초·연중 차입금 입금 / 예금 가입 / 차입 상환",
    debitAccounts: [ACCOUNT_CODES.CASH, ACCOUNT_CODES.DEPOSITS],
    creditAccounts: [ACCOUNT_CODES.CASH, ACCOUNT_CODES.LONG_TERM_DEBT],
  },
  {
    ruleId: "JR-FACILITY-01",
    transactionType: "FACILITY",
    step: "FACILITY",
    ruleBookRef: "§1.6 Step2",
    description: "토지·기계 취득, 현금 지출",
    debitAccounts: [ACCOUNT_CODES.LAND, ACCOUNT_CODES.MACHINERY],
    creditAccounts: [ACCOUNT_CODES.CASH],
  },
  {
    ruleId: "JR-HIRE-01",
    transactionType: "HIRING",
    step: "HIRING",
    ruleBookRef: "§1.6 Step3 · D-12",
    description: "인력 채용 — Step3 분개 없음 (Settlement 일괄 accrual)",
    debitAccounts: [],
    creditAccounts: [],
    notes: "payrollForecastHalfManwon은 computed/UI만. SETTLEMENT에서 JR-SETTLE-01",
  },
  {
    ruleId: "JR-MATERIAL-01",
    transactionType: "MATERIAL",
    step: "MATERIAL",
    ruleBookRef: "§1.6 Step4 · D-08/D-13",
    description: "원재료 재고 증가, 물류·브랜치개설비 비용, 현금 감소",
    debitAccounts: [
      ACCOUNT_CODES.RAW_MATERIALS_INVENTORY,
      ACCOUNT_CODES.LOGISTICS_MATERIAL,
      ACCOUNT_CODES.BRANCH_SETUP,
    ],
    creditAccounts: [ACCOUNT_CODES.CASH],
  },
  {
    ruleId: "JR-PRODUCTION-01",
    transactionType: "PRODUCTION",
    step: "PRODUCTION",
    ruleBookRef: "§4.7 Step5",
    description: "재료 소비, 기계가동비, 완제품 전환 (Sprint 2B)",
    debitAccounts: [ACCOUNT_CODES.WIP, ACCOUNT_CODES.MACHINE_OPERATING, ACCOUNT_CODES.FINISHED_GOODS],
    creditAccounts: [ACCOUNT_CODES.RAW_MATERIALS_INVENTORY, ACCOUNT_CODES.CASH, ACCOUNT_CODES.WIP],
    notes: "Sprint 2B",
  },
  {
    ruleId: "JR-SALES-01",
    transactionType: "SALES",
    step: "SALES",
    ruleBookRef: "§4.8 Step6",
    description: "매출·매출원가·물류(제품) (Sprint 2B)",
    debitAccounts: [ACCOUNT_CODES.CASH, ACCOUNT_CODES.COGS, ACCOUNT_CODES.LOGISTICS_PRODUCT],
    creditAccounts: [ACCOUNT_CODES.SALES_REVENUE, ACCOUNT_CODES.FINISHED_GOODS],
    notes: "Sprint 2B",
  },
  {
    ruleId: "JR-SETTLE-01",
    transactionType: "SETTLEMENT",
    step: "SETTLEMENT",
    ruleBookRef: "§1.6 Step7 · D-12",
    description: "인건비·복리후생·감가·이자·법인세 일괄 (Sprint 2B)",
    debitAccounts: [
      ACCOUNT_CODES.PAYROLL_PURCHASE_PRODUCTION,
      ACCOUNT_CODES.PAYROLL_SALES,
      ACCOUNT_CODES.WELFARE,
      ACCOUNT_CODES.DEPRECIATION,
      ACCOUNT_CODES.INTEREST_EXPENSE,
      ACCOUNT_CODES.CORPORATE_TAX,
    ],
    creditAccounts: [ACCOUNT_CODES.ACCRUED_PAYROLL, ACCOUNT_CODES.CASH, ACCOUNT_CODES.ACCUM_DEPRECIATION],
    notes: "Sprint 2B",
  },
];

export function getJournalRule(transactionType: string): JournalRuleDefinition | undefined {
  return JOURNAL_RULES.find((r) => r.transactionType === transactionType);
}
