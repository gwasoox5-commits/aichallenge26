import { describe, expect, it } from "vitest";
import { validateBalanceSheet, validateTrialBalance } from "@/src/bsp/domain/accounting/balance-sheet-validation";
import { capturePeriodFinancialSnapshot, computePeriodChanges } from "@/src/bsp/domain/accounting/period-financial-snapshot";
import type { FinancialStatementsDto } from "@/src/bsp/domain/types";

function sampleFs(): FinancialStatementsDto {
  return {
    companyId: "c1",
    periodLabel: "Y1H1",
    trialBalance: [
      { accountCode: "1100", accountName: "Cash", debitManwon: 100, creditManwon: 0 },
      { accountCode: "3100", accountName: "Equity", debitManwon: 0, creditManwon: 100 },
    ],
    balanceSheet: {
      assets: {
        cash: 100,
        deposits: 0,
        rawMaterials: 0,
        finishedGoods: 0,
        land: 0,
        machinery: 0,
        accumDepreciation: 0,
        total: 100,
      },
      liabilities: { longTermDebt: 0, accruedPayroll: 0, total: 0 },
      equity: { capital: 100, retainedEarnings: 0, total: 100 },
    },
    profitAndLoss: {
      revenue: 0,
      cogs: 0,
      cogsBreakdown: {
        hiringCost: 0,
        materialCost: 0,
        logisticsMaterial: 0,
        machineOperating: 0,
        payrollPurchaseProduction: 0,
        depreciation: 0,
      },
      grossProfit: 0,
      sga: { branchSetup: 0, payrollSales: 0, logisticsProduct: 0, welfare: 0, total: 0 },
      operatingIncome: 0,
      financialIncome: 0,
      financialExpense: 0,
      miscIncome: 0,
      pretaxIncome: 0,
      corporateTax: 0,
      netIncome: 0,
    },
  };
}

describe("accounting validation sprint", () => {
  it("validates balanced balance sheet", () => {
    const v = validateBalanceSheet(sampleFs());
    expect(v.ok).toBe(true);
    expect(v.deltaManwon).toBe(0);
  });

  it("detects balance sheet imbalance", () => {
    const fs = sampleFs();
    fs.balanceSheet.assets.total = 120;
    const v = validateBalanceSheet(fs);
    expect(v.ok).toBe(false);
    expect(v.deltaManwon).toBe(20);
  });

  it("validates trial balance totals", () => {
    const v = validateTrialBalance(sampleFs());
    expect(v.ok).toBe(true);
  });

  it("computes period changes from open snapshot", () => {
    const open = capturePeriodFinancialSnapshot(sampleFs());
    const current = sampleFs();
    current.balanceSheet.assets.cash = 150;
    current.balanceSheet.assets.total = 150;
    current.profitAndLoss.revenue = 40;
    const changes = computePeriodChanges(open, current);
    expect(changes.find((c) => c.line === "현금")?.deltaManwon).toBe(50);
    expect(changes.find((c) => c.line === "매출")?.deltaManwon).toBe(40);
  });
});
