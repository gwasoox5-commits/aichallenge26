import { ACCOUNT_CODES, GAME_CONSTANTS, type JournalEntryInput } from "../types";
import type { LoanComputed, FacilityComputed, MaterialComputed, ProductionComputed, SalesComputed } from "../types";

export function buildLoanJournal(computed: LoanComputed): JournalEntryInput {
  const lines = [];
  const newLoans = computed.loanEarlyAmtManwon + computed.loanMidAmtManwon;

  if (newLoans > 0) {
    lines.push(
      { accountCode: ACCOUNT_CODES.CASH, debitManwon: newLoans, creditManwon: 0, memo: "차입금 입금" },
      { accountCode: ACCOUNT_CODES.LONG_TERM_DEBT, debitManwon: 0, creditManwon: newLoans, memo: "장기차입금" }
    );
  }
  if (computed.depositAmtManwon > 0) {
    lines.push(
      { accountCode: ACCOUNT_CODES.DEPOSITS, debitManwon: computed.depositAmtManwon, creditManwon: 0, memo: "예금 가입" },
      { accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: computed.depositAmtManwon, memo: "예금 대체" }
    );
  }
  if (computed.loanRepaymentAmtManwon > 0) {
    lines.push(
      { accountCode: ACCOUNT_CODES.LONG_TERM_DEBT, debitManwon: computed.loanRepaymentAmtManwon, creditManwon: 0, memo: "차입금 상환" },
      { accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: computed.loanRepaymentAmtManwon, memo: "상환 출금" }
    );
  }

  return { transactionType: "LOAN", description: "Step 1 — 자금 조달", lines };
}

export function buildFacilityJournal(computed: FacilityComputed): JournalEntryInput {
  const lines = [];
  if (computed.landCostManwon > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.LAND, debitManwon: computed.landCostManwon, creditManwon: 0, memo: "토지 취득" });
  }
  if (computed.machineCostManwon > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.MACHINERY, debitManwon: computed.machineCostManwon, creditManwon: 0, memo: "기계 취득" });
  }
  if (computed.totalCapexManwon > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: computed.totalCapexManwon, memo: "설비투자 출금" });
  }
  return { transactionType: "FACILITY", description: "Step 2 — 설비 투자", lines };
}

/** D-12: Step 3 has no payroll journal — commitment recorded in operational state only */
export function buildHiringJournal(): JournalEntryInput {
  return {
    transactionType: "HIRING",
    description: "Step 3 — 인력 채용 (D-12: 분개 없음, Settlement accrual)",
    lines: [],
  };
}

export function buildMaterialJournal(computed: MaterialComputed): JournalEntryInput {
  const lines = [];
  if (computed.materialCostManwon > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.RAW_MATERIALS_INVENTORY,
      debitManwon: computed.materialCostManwon,
      creditManwon: 0,
      memo: "원재료 구매",
    });
  }
  if (computed.logisticsCostManwon > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.LOGISTICS_MATERIAL,
      debitManwon: computed.logisticsCostManwon,
      creditManwon: 0,
      memo: "물류비(재료)",
    });
  }
  if (computed.branchFeesManwon > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.BRANCH_SETUP,
      debitManwon: computed.branchFeesManwon,
      creditManwon: 0,
      memo: "브랜치 개설비",
    });
  }
  if (computed.totalCostManwon > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.CASH,
      debitManwon: 0,
      creditManwon: computed.totalCostManwon,
      memo: "원재료 구매 출금",
    });
  }
  return { transactionType: "MATERIAL", description: "Step 4 — 원재료 구매", lines };
}

export function buildProductionJournal(computed: ProductionComputed): JournalEntryInput {
  const lines = [];
  if (computed.materialCostConsumedManwon > 0) {
    lines.push(
      { accountCode: ACCOUNT_CODES.WIP, debitManwon: computed.materialCostConsumedManwon, creditManwon: 0, memo: "재료 투입" },
      { accountCode: ACCOUNT_CODES.RAW_MATERIALS_INVENTORY, debitManwon: 0, creditManwon: computed.materialCostConsumedManwon, memo: "원재료 소비" }
    );
    lines.push(
      { accountCode: ACCOUNT_CODES.FINISHED_GOODS, debitManwon: computed.materialCostConsumedManwon, creditManwon: 0, memo: "완제품 증가" },
      { accountCode: ACCOUNT_CODES.WIP, debitManwon: 0, creditManwon: computed.materialCostConsumedManwon, memo: "WIP 대체" }
    );
  }
  const machineAndCarbon = computed.machineOpCostManwon + computed.carbonTaxManwon;
  if (machineAndCarbon > 0) {
    if (computed.machineOpCostManwon > 0) {
      lines.push({ accountCode: ACCOUNT_CODES.MACHINE_OPERATING, debitManwon: computed.machineOpCostManwon, creditManwon: 0, memo: "기계가동비" });
    }
    lines.push({ accountCode: ACCOUNT_CODES.CASH, debitManwon: 0, creditManwon: machineAndCarbon, memo: "가동·탄소세 출금" });
  }
  return { transactionType: "PRODUCTION", description: "Step 5 — 생산", lines };
}

export function buildSalesJournal(computed: SalesComputed): JournalEntryInput {
  const lines = [];
  const netCashIn = computed.totalRevenueManwon - computed.logisticsSalesManwon - computed.branchFeesManwon;

  if (netCashIn !== 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.CASH,
      debitManwon: netCashIn > 0 ? netCashIn : 0,
      creditManwon: netCashIn < 0 ? -netCashIn : 0,
      memo: "판매 대금",
    });
  }
  if (computed.cogsManwon > 0) {
    lines.push(
      { accountCode: ACCOUNT_CODES.COGS, debitManwon: computed.cogsManwon, creditManwon: 0, memo: "매출원가" },
      { accountCode: ACCOUNT_CODES.FINISHED_GOODS, debitManwon: 0, creditManwon: computed.cogsManwon, memo: "완제품 출고" }
    );
  }
  if (computed.logisticsSalesManwon > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.LOGISTICS_PRODUCT, debitManwon: computed.logisticsSalesManwon, creditManwon: 0, memo: "물류비(제품)" });
  }
  if (computed.branchFeesManwon > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.BRANCH_SETUP, debitManwon: computed.branchFeesManwon, creditManwon: 0, memo: "판매 브랜치 개설" });
  }
  if (computed.totalRevenueManwon > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.SALES_REVENUE, debitManwon: 0, creditManwon: computed.totalRevenueManwon, memo: "매출" });
  }
  return { transactionType: "SALES", description: "Step 6 — 판매", lines };
}

export function buildInitialLedgerBalances() {
  return [
    { accountCode: ACCOUNT_CODES.CASH, balanceManwon: GAME_CONSTANTS.initialCashManwon },
    { accountCode: ACCOUNT_CODES.EQUITY, balanceManwon: GAME_CONSTANTS.initialEquityManwon },
    { accountCode: ACCOUNT_CODES.DEPOSITS, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.RAW_MATERIALS_INVENTORY, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.FINISHED_GOODS, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.LAND, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.MACHINERY, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.ACCUM_DEPRECIATION, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.LONG_TERM_DEBT, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.ACCRUED_PAYROLL, balanceManwon: 0 },
    { accountCode: ACCOUNT_CODES.RETAINED_EARNINGS, balanceManwon: 0 },
  ];
}
