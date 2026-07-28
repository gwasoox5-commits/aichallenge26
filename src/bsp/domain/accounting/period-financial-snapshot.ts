import type { FinancialStatementsDto } from "../types";

export interface PeriodFinancialSnapshot {
  capturedAt: string;
  cash: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  revenue: number;
  netIncome: number;
}

export interface PeriodFinancialChange {
  line: string;
  openManwon: number;
  currentManwon: number;
  deltaManwon: number;
}

export function capturePeriodFinancialSnapshot(fs: FinancialStatementsDto, at = new Date()): PeriodFinancialSnapshot {
  return {
    capturedAt: at.toISOString(),
    cash: fs.balanceSheet.assets.cash,
    totalAssets: fs.balanceSheet.assets.total,
    totalLiabilities: fs.balanceSheet.liabilities.total,
    totalEquity: fs.balanceSheet.equity.total,
    revenue: fs.profitAndLoss.revenue,
    netIncome: fs.profitAndLoss.netIncome,
  };
}

export function computePeriodChanges(
  open: PeriodFinancialSnapshot | undefined,
  current: FinancialStatementsDto
): PeriodFinancialChange[] {
  if (!open) return [];

  const rows: Array<[string, number, number]> = [
    ["현금", open.cash, current.balanceSheet.assets.cash],
    ["자산 합계", open.totalAssets, current.balanceSheet.assets.total],
    ["부채 합계", open.totalLiabilities, current.balanceSheet.liabilities.total],
    ["자본 합계", open.totalEquity, current.balanceSheet.equity.total],
    ["매출", open.revenue, current.profitAndLoss.revenue],
    ["당기순이익", open.netIncome, current.profitAndLoss.netIncome],
  ];

  return rows.map(([line, openManwon, currentManwon]) => ({
    line,
    openManwon,
    currentManwon,
    deltaManwon: currentManwon - openManwon,
  }));
}
