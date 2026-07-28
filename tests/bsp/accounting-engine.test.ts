import { describe, expect, it } from "vitest";
import { AccountingEngine } from "@/src/bsp/domain/accounting/accounting-engine";
import { validateLoan, createInitialOperationalState } from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES } from "@/src/bsp/domain/types";

describe("AccountingEngine", () => {
  const engine = new AccountingEngine();
  const operational = createInitialOperationalState();

  it("creates initial ledger with cash and equity", () => {
    const ledger = engine.createInitialLedger();
    expect(ledger.get("1100")).toBe(10000);
    expect(ledger.get("3100")).toBe(10000);
  });

  it("posts loan journal and balances debits/credits", () => {
    const { computed } = validateLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, createInitialOperationalState());
    const journal = engine.buildLoanJournal(computed);
    const result = engine.postJournal({
      companyId: "c1",
      periodId: "p1",
      periodLabel: "Year 1 H1",
      journal,
      currentLedger: engine.createInitialLedger(),
      operational,
      economy: DEFAULT_ECONOMY_VALUES,
    });
    expect(result.financialStatements.balanceSheet.assets.total).toBe(12000);
    expect(result.financialStatements.balanceSheet.liabilities.longTermDebt).toBe(2000);
    expect(result.trialBalance.length).toBeGreaterThan(0);
  });

  it("hiring journal has no lines per D-12", () => {
    const journal = engine.buildHiringJournal();
    expect(journal.lines).toHaveLength(0);
    const result = engine.postJournal({
      companyId: "c1",
      periodId: "p1",
      periodLabel: "Year 1 H1",
      journal,
      currentLedger: engine.createInitialLedger(),
      operational: { ...operational, headPurchase: 2, headProduction: 3, headSales: 2 },
      economy: DEFAULT_ECONOMY_VALUES,
    });
    expect(result.financialStatements.profitAndLoss.cogsBreakdown.payrollPurchaseProduction).toBe(1500);
    expect(result.financialStatements.profitAndLoss.payrollForecastNote).toBeTruthy();
  });
});