import type { JournalEntryInput } from "../types";

export type LedgerMap = Map<string, number>;

export function createLedgerFromInitial(balances: Array<{ accountCode: string; balanceManwon: number }>): LedgerMap {
  return new Map(balances.map((b) => [b.accountCode, b.balanceManwon]));
}

export function applyJournalToBalances(balances: LedgerMap, journal: JournalEntryInput): LedgerMap {
  const next = new Map(balances);
  for (const line of journal.lines) {
    const current = next.get(line.accountCode) ?? 0;
    next.set(line.accountCode, current + line.debitManwon - line.creditManwon);
  }
  return next;
}

export function normalizeLiabilityBalance(raw: number): number {
  return raw <= 0 ? -raw : raw;
}
