import { ACCOUNT_CODES, ACCOUNT_NAMES, type TrialBalanceLine } from "../types";
import type { LedgerMap } from "./ledger";
import { normalizeLiabilityBalance } from "./ledger";

export function buildTrialBalance(balances: LedgerMap): TrialBalanceLine[] {
  const lines: TrialBalanceLine[] = [];

  for (const [code, name] of Object.entries(ACCOUNT_NAMES)) {
    const accountCode = ACCOUNT_CODES[code as keyof typeof ACCOUNT_CODES];
    let raw = balances.get(accountCode) ?? 0;

    if (accountCode === ACCOUNT_CODES.LONG_TERM_DEBT || accountCode === ACCOUNT_CODES.ACCRUED_PAYROLL) {
      raw = normalizeLiabilityBalance(raw);
    }
    if (accountCode === ACCOUNT_CODES.ACCUM_DEPRECIATION) {
      raw = raw <= 0 ? -raw : raw;
    }

    if (raw === 0) continue;

    const isCreditNormal =
      accountCode.startsWith("2") ||
      accountCode.startsWith("3") ||
      accountCode.startsWith("4") ||
      accountCode === ACCOUNT_CODES.ACCUM_DEPRECIATION;

    const debitManwon = raw > 0 && !isCreditNormal ? raw : raw < 0 && isCreditNormal ? -raw : 0;
    const creditManwon = raw > 0 && isCreditNormal ? raw : raw < 0 && !isCreditNormal ? -raw : 0;

    lines.push({ accountCode, accountName: name, debitManwon, creditManwon });
  }

  for (const [accountCode, raw] of balances) {
    if (lines.some((l) => l.accountCode === accountCode)) continue;
    if (raw === 0) continue;
    lines.push({
      accountCode,
      accountName: accountCode,
      debitManwon: raw > 0 ? raw : 0,
      creditManwon: raw < 0 ? -raw : 0,
    });
  }

  lines.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  return lines;
}

export function trialBalanceTotals(lines: TrialBalanceLine[]) {
  return {
    totalDebitManwon: lines.reduce((s, l) => s + l.debitManwon, 0),
    totalCreditManwon: lines.reduce((s, l) => s + l.creditManwon, 0),
  };
}
