import type { FinancialStatementsDto } from "../types";
import { trialBalanceTotals } from "./trial-balance";

export interface BalanceSheetValidationResult {
  ok: boolean;
  assetsManwon: number;
  liabilitiesAndEquityManwon: number;
  deltaManwon: number;
  equation: string;
  validatedAt: string;
}

export interface TrialBalanceValidationResult {
  ok: boolean;
  totalDebitManwon: number;
  totalCreditManwon: number;
  deltaManwon: number;
  validatedAt: string;
}

export function validateBalanceSheet(fs: FinancialStatementsDto, at = new Date()): BalanceSheetValidationResult {
  const assetsManwon = fs.balanceSheet.assets.total;
  const liabilitiesAndEquityManwon = fs.balanceSheet.liabilities.total + fs.balanceSheet.equity.total;
  const deltaManwon = assetsManwon - liabilitiesAndEquityManwon;
  return {
    ok: deltaManwon === 0,
    assetsManwon,
    liabilitiesAndEquityManwon,
    deltaManwon,
    equation: "Assets = Liabilities + Equity",
    validatedAt: at.toISOString(),
  };
}

export function validateTrialBalance(fs: FinancialStatementsDto, at = new Date()): TrialBalanceValidationResult {
  const { totalDebitManwon, totalCreditManwon } = trialBalanceTotals(fs.trialBalance);
  const deltaManwon = totalDebitManwon - totalCreditManwon;
  return {
    ok: deltaManwon === 0,
    totalDebitManwon,
    totalCreditManwon,
    deltaManwon,
    validatedAt: at.toISOString(),
  };
}
